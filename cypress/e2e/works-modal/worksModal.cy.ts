// Блок «Мои работы» на /edit-profile: список из /users/me/portfolio-works/,
// заглушка при пустом списке и модалка создания работ. API мокается.
type PortfolioWork = {
  id: number;
  user_id: number;
  title: string;
  task: string | null;
  solution: string | null;
  image: string | null;
  technologies: string[] | null;
  link: string | null;
  created_at: string;
  updated_at: string;
};

interface PortfolioWorkCreateBody {
  title: string;
  task: string | null;
  solution: string | null;
  technologies: string[] | null;
  link: string | null;
}

const makeAccessToken = (): string => {
  const encode = (value: object) =>
    Cypress.Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const nowSeconds = Math.floor(Date.now() / 1_000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    exp: nowSeconds + 3_600,
  })}.signature`;
};

const seedAuth = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'works-user',
          display_name: 'Works User',
          account_type: 'participant',
        },
        accessToken: makeAccessToken(),
        refreshToken: 'refresh-token',
        loading: false,
        error: null,
      }),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    })
  );
};

const currentUser = () => ({
  id: 1,
  username: 'works-user',
  display_name: 'Works User',
  email: 'works@example.com',
  bio: '',
  account_type: 'participant',
  specialization_id: 1,
  specialization_name: 'Бэкенд-разработчик',
  level: 'middle',
  workload_hours_per_week: 20,
  work_format: 'remote',
  employment_type: 'part_time',
  search_status: 'looking_for_team',
  profile_visibility: 'public',
  notification_enabled: true,
  city: 'Москва',
  social_links: {},
  avatar: null,
  skills: [],
  portfolio_works: [],
  owned_project_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const signedImage = (id: number): string =>
  `https://storage.yandexcloud.net/teamlab-media/media/portfolio-${id}.webp?signature=${id}`;

const makeWork = (overrides: Partial<PortfolioWork>): PortfolioWork => ({
  id: 1,
  user_id: 1,
  title: 'Работа',
  task: null,
  solution: null,
  image: null,
  technologies: null,
  link: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// Мок API работ: список, создание и полный image lifecycle для логотипа.
const interceptWorksApi = (initialWorks: PortfolioWork[] = []) => {
  let works = [...initialWorks];
  let nextId = 7;
  let lastCreatedId = 0;
  const createdBodies: PortfolioWorkCreateBody[] = [];

  cy.intercept('GET', '**/api/v1/users/', {
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  cy.intercept('GET', '**/api/v1/users/me/', (request) => {
    request.alias = 'currentUser';
    request.reply(currentUser());
  });
  cy.intercept('GET', '**/api/v1/users/me/portfolio-works/', (request) => {
    request.alias = 'portfolioWorks';
    request.reply(works);
  });
  cy.intercept('POST', '**/api/v1/users/me/portfolio-works/', (request) => {
    const body = request.body as PortfolioWorkCreateBody;
    createdBodies.push(body);
    lastCreatedId = nextId++;

    const created = makeWork({
      id: lastCreatedId,
      title: body.title,
      task: body.task,
      solution: body.solution,
      technologies: body.technologies,
      link: body.link,
    });
    works = [created, ...works];

    request.alias = 'createWork';
    request.reply({ statusCode: 201, body: created });
  });

  cy.intercept('POST', '**/api/v1/image-uploads/', (request) => {
    request.alias = 'createWorkImageUpload';
    expect(request.body).to.deep.equal({
      kind: 'portfolio_image',
      target_id: lastCreatedId,
      content_type: 'image/png',
      size_bytes: 4,
    });
    request.reply({
      statusCode: 201,
      body: {
        upload_id: 'work-upload-1',
        status: 'awaiting_upload',
        expires_at: '2026-11-04T12:05:00Z',
        upload_url: 'https://storage.yandexcloud.net/teamlab-media/work-upload',
        upload_fields: {
          'Content-Type': 'image/png',
          key: 'temporary/work-upload-1/image',
          policy: 'policy-1',
        },
      },
    });
  });
  cy.intercept(
    'POST',
    'https://storage.yandexcloud.net/teamlab-media/work-upload',
    (request) => {
      request.alias = 'workStorageUpload';
      expect(request.headers.authorization).to.equal(undefined);
      request.reply({
        statusCode: 204,
        headers: { 'access-control-allow-origin': '*' },
      });
    }
  );
  cy.intercept('POST', '**/api/v1/image-uploads/*/confirm/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    request.alias = 'confirmWorkImageUpload';
    request.reply({ upload_id: uploadId, status: 'queued' });
  });
  cy.intercept('GET', '**/api/v1/image-uploads/*/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-2);
    request.alias = 'workImageUploadStatus';
    request.reply({
      upload_id: uploadId,
      kind: 'portfolio_image',
      status: 'ready',
      image_url: signedImage(lastCreatedId),
      thumbnail_url: signedImage(lastCreatedId),
      error_code: null,
      error_message: '',
    });
  });
  cy.intercept('POST', '**/api/v1/image-uploads/*/attach/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    works = works.map((work) =>
      work.id === lastCreatedId
        ? { ...work, image: signedImage(work.id) }
        : work
    );

    request.alias = 'attachWorkImageUpload';
    request.reply({
      upload_id: uploadId,
      kind: 'portfolio_image',
      status: 'attached',
      image_url: signedImage(lastCreatedId),
      thumbnail_url: signedImage(lastCreatedId),
      error_code: null,
      error_message: '',
    });
  });
  cy.intercept(
    'GET',
    'https://storage.yandexcloud.net/teamlab-media/media/**',
    { statusCode: 200, body: '' }
  );

  return { getCreatedBodies: () => createdBodies };
};

const visitEditProfile = (): void => {
  cy.visit('http://localhost:5173/edit-profile', { onBeforeLoad: seedAuth });
  cy.wait('@currentUser');
};

const dialog = () => cy.get('[role="dialog"]');

describe('блок «Мои работы»', () => {
  beforeEach(() => {
    // Модалка — высокая панель: в дефолтном окне Cypress нижние блоки
    // уходят за границу прокрутки, поэтому задаём размер как в макете.
    cy.viewport(1440, 1000);
  });

  it('показывает заглушку и создаёт несколько работ из одной модалки', () => {
    const api = interceptWorksApi();
    visitEditProfile();

    // Пока работ нет — заглушка с кнопкой добавления, плюс рядом скрыт.
    cy.contains('Готовых работ нет').should('be.visible');
    cy.get('button[aria-label="Добавить работу"]').should('not.exist');
    cy.contains('button', 'Добавить мои работы').click();

    dialog().should('be.visible');
    dialog().contains('Мои работы').should('be.visible');
    dialog().find('input[placeholder="Название проекта"]').should('be.visible');
    dialog()
      .find('input[placeholder="Какая задача ставилась?"]')
      .should('be.visible');
    dialog()
      .find('input[placeholder="Какое решение было найдено?"]')
      .should('be.visible');
    // «Вставьте ссылку» — обычный инпут, а не кнопка.
    dialog().find('input[placeholder="Вставьте ссылку"]').should('be.visible');
    // Без логотипа показываем дефолтное изображение работы.
    dialog()
      .find('img[alt="Логотип работы по умолчанию"]')
      .should('be.visible');

    // Пустое название бэкенд не примет, поэтому «Сохранить» заблокирована.
    dialog().contains('button', 'Сохранить').should('be.disabled');
    dialog().contains('Укажите название каждой работы').should('be.visible');

    dialog()
      .find('input[placeholder="Название проекта"]')
      .type('Портфолио-кейс');
    dialog()
      .find('input[placeholder="Какая задача ставилась?"]')
      .type('Задача');
    dialog()
      .find('input[placeholder="Какое решение было найдено?"]')
      .type('Решение');
    dialog()
      .find('input[aria-label="Добавить технологию в работу 1"]')
      .type('Figma{enter}');
    dialog()
      .find('button[aria-label="Удалить технологию Figma"]')
      .should('exist');
    dialog()
      .find('input[placeholder="Вставьте ссылку"]')
      .type('https://example.com/case');

    // Плюс внизу модалки добавляет вторую карточку формы.
    dialog().find('button[aria-label="Добавить ещё одну работу"]').click();
    dialog()
      .find('input[placeholder="Название проекта"]')
      .should('have.length', 2);
    dialog()
      .find('input[placeholder="Название проекта"]')
      .eq(1)
      .type('Вторая работа');

    dialog().contains('button', 'Сохранить').click();
    cy.wait('@createWork');
    cy.wait('@createWork');

    cy.then(() => {
      expect(api.getCreatedBodies()).to.deep.equal([
        {
          title: 'Портфолио-кейс',
          task: 'Задача',
          solution: 'Решение',
          technologies: ['Figma'],
          link: 'https://example.com/case',
        },
        {
          title: 'Вторая работа',
          task: null,
          solution: null,
          technologies: null,
          link: null,
        },
      ]);
    });

    // Модалка закрывается, список перечитывается и показывает новые работы.
    dialog().should('not.exist');
    cy.wait('@portfolioWorks');
    cy.contains('Готовых работ нет').should('not.exist');
    cy.contains('h3', 'Портфолио-кейс').should('be.visible');
    cy.contains('h3', 'Вторая работа').should('be.visible');
    cy.contains('Figma').should('be.visible');
    cy.get('a[href="https://example.com/case"]').should('be.visible');
    // Когда работы появились, рядом с ними показывается и плюс.
    cy.get('button[aria-label="Добавить работу"]').should('be.visible');
  });

  it('загружает логотип работы после её создания', () => {
    interceptWorksApi();
    visitEditProfile();

    // В пустом списке модалку открывает кнопка заглушки (плюс скрыт).
    cy.get('button[aria-label="Добавить работу"]').should('not.exist');
    cy.contains('button', 'Добавить мои работы').click();
    dialog().should('be.visible');
    dialog()
      .find('input[placeholder="Название проекта"]')
      .type('Работа с логотипом');
    dialog()
      .find('input[aria-label="Выбрать логотип работы 1"]')
      .selectFile(
        {
          contents: Cypress.Buffer.from('test'),
          fileName: 'logo.png',
          mimeType: 'image/png',
        },
        { force: true }
      );
    dialog().find('img[alt="Логотип работы"]').should('be.visible');
    dialog().contains('button', 'Удалить логотип').should('be.visible');

    dialog().contains('button', 'Сохранить').click();
    cy.wait('@createWork');
    cy.wait('@createWorkImageUpload');
    cy.wait('@workStorageUpload');
    cy.wait('@attachWorkImageUpload');
    cy.wait('@portfolioWorks');

    dialog().should('not.exist');
    cy.get(`img[alt="Логотип работы Работа с логотипом"]`).should(
      'have.attr',
      'src',
      signedImage(7)
    );
  });

  it('показывает работы из бэкенда карточками', () => {
    interceptWorksApi([
      makeWork({
        id: 3,
        title: 'Кейс дизайнера',
        task: 'Собрать макет',
        solution: 'Собрали дизайн-систему',
        technologies: ['Figma', 'Sketch'],
        link: 'https://example.com/design',
      }),
    ]);
    visitEditProfile();
    cy.wait('@portfolioWorks');

    cy.contains('Готовых работ нет').should('not.exist');
    cy.contains('h3', 'Кейс дизайнера').should('be.visible');
    cy.contains('p', 'Собрать макет').should('be.visible');
    cy.contains('p', 'Собрали дизайн-систему').should('be.visible');
    cy.contains('Figma').should('be.visible');
    cy.contains('Sketch').should('be.visible');
    cy.get('a[href="https://example.com/design"]').should('be.visible');
    cy.get('[role="img"][aria-label="Изображение работы по умолчанию"]').should(
      'be.visible'
    );
    // Работы есть — рядом с ними показывается плюс добавления.
    cy.get('button[aria-label="Добавить работу"]').should('be.visible');
  });
});
