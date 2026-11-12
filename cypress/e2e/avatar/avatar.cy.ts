type AvatarValue = string | null;

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
          username: 'avatar-user',
          display_name: 'Avatar User',
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

const currentUser = (avatar: AvatarValue) => ({
  id: 1,
  username: 'avatar-user',
  display_name: 'Avatar User',
  email: 'avatar@example.com',
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
  avatar,
  skills: [],
  portfolio_works: [],
  owned_project_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const signedAvatar = (generation: number): string =>
  `https://storage.yandexcloud.net/teamlab-media/media/avatar-${generation}.webp?signature=${generation}`;

interface AvatarApiOptions {
  initialAvatar?: AvatarValue;
}

const interceptAvatarApi = ({
  initialAvatar = null,
}: AvatarApiOptions = {}) => {
  let avatar = initialAvatar;
  let createCalls = 0;
  let attachCalls = 0;

  cy.intercept('GET', '**/api/v1/users/', {
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  // Блок «Мои работы» тоже запрашивает список: без мока живой бэкенд
  // отвечает 401 и приложение сбрасывает сессию.
  cy.intercept('GET', '**/api/v1/users/me/portfolio-works/', []);
  cy.intercept('GET', '**/api/v1/users/me/', (request) => {
    request.alias = 'currentUser';
    request.reply(currentUser(avatar));
  });
  cy.intercept('POST', '**/api/v1/image-uploads/', (request) => {
    createCalls += 1;
    request.alias = 'createAvatarUpload';
    expect(request.headers.authorization).to.match(/^Bearer /);
    expect(request.body).to.deep.equal({
      kind: 'user_avatar',
      content_type: 'image/png',
      size_bytes: 4,
    });
    request.reply({
      statusCode: 201,
      body: {
        upload_id: `avatar-upload-${createCalls}`,
        status: 'awaiting_upload',
        expires_at: '2026-11-04T12:05:00Z',
        upload_url:
          'https://storage.yandexcloud.net/teamlab-media/avatar-upload',
        upload_fields: {
          'Content-Type': 'image/png',
          key: `temporary/avatar-upload-${createCalls}/image`,
          policy: `policy-${createCalls}`,
        },
      },
    });
  });
  cy.intercept(
    'POST',
    'https://storage.yandexcloud.net/teamlab-media/avatar-upload',
    (request) => {
      request.alias = 'storageUpload';
      expect(request.headers.authorization).to.equal(undefined);
      expect(request.headers['content-type']).to.include('multipart/form-data');
      request.reply({
        statusCode: 204,
        headers: { 'access-control-allow-origin': '*' },
      });
    }
  );
  cy.intercept('POST', '**/api/v1/image-uploads/*/confirm/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    request.alias = 'confirmAvatarUpload';
    request.reply({ upload_id: uploadId, status: 'queued' });
  });
  cy.intercept('GET', '**/api/v1/image-uploads/*/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-2);
    request.alias = 'avatarUploadStatus';
    request.reply({
      upload_id: uploadId,
      kind: 'user_avatar',
      status: 'ready',
      image_url: signedAvatar(createCalls),
      thumbnail_url: signedAvatar(createCalls),
      error_code: null,
      error_message: '',
    });
  });
  cy.intercept('POST', '**/api/v1/image-uploads/*/attach/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    attachCalls += 1;
    avatar = signedAvatar(attachCalls);
    request.alias = 'attachAvatarUpload';
    request.reply({
      upload_id: uploadId,
      kind: 'user_avatar',
      status: 'attached',
      image_url: avatar,
      thumbnail_url: avatar,
      error_code: null,
      error_message: '',
    });
  });
  cy.intercept('DELETE', '**/api/v1/users/me/avatar/', (request) => {
    avatar = null;
    request.alias = 'deleteAvatar';
    request.reply({ statusCode: 204 });
  });
  cy.intercept(
    'GET',
    'https://storage.yandexcloud.net/teamlab-media/media/**',
    { statusCode: 200, body: '' }
  );

  return {
    getCreateCalls: () => createCalls,
    getAttachCalls: () => attachCalls,
  };
};

const visitEditProfile = (): void => {
  cy.visit('http://localhost:5173/edit-profile', {
    onBeforeLoad: seedAuth,
  });
  cy.wait('@currentUser');
};

const selectAvatar = (fileName: string): void => {
  cy.get(
    'input[type="file"][accept="image/jpeg,image/png,image/webp"]'
  ).selectFile(
    {
      contents: Cypress.Buffer.from('test'),
      fileName,
      mimeType: 'image/png',
    },
    { force: true }
  );
};

const getInputByLabel = (label: string) =>
  cy
    .contains('label', label)
    .then(($label) => cy.get(`input[id="${$label.attr('for')}"]`));

const chooseSelectOption = (label: string, option: string): void => {
  cy.get(`button[aria-label="${label}"]`).click();
  cy.contains('[role="option"]', option).trigger('mousedown');
};

describe('редактор профиля', () => {
  it('загружает и повторно заменяет аватар', () => {
    const api = interceptAvatarApi();
    visitEditProfile();

    cy.contains('button', 'Добавить фото').should('be.enabled');
    selectAvatar('first.png');
    cy.get('img[alt="Аватар"]')
      .invoke('attr', 'src')
      .should('match', /^blob:/);
    cy.contains('Обрабатываем фото…').should('be.visible');
    cy.contains('button', 'Добавить фото').should('be.disabled');
    cy.contains('button', 'Сохранить').should('be.disabled');
    cy.wait('@attachAvatarUpload');
    cy.wait('@currentUser');
    cy.get('img[alt="Аватар"]').should('have.attr', 'src', signedAvatar(1));

    selectAvatar('second.png');
    cy.wait('@attachAvatarUpload');
    cy.wait('@currentUser');
    cy.get('img[alt="Аватар"]').should('have.attr', 'src', signedAvatar(2));
    cy.then(() => {
      expect(api.getCreateCalls()).to.equal(2);
      expect(api.getAttachCalls()).to.equal(2);
    });
  });

  it('удаляет аватар и обновляет current user', () => {
    interceptAvatarApi({ initialAvatar: signedAvatar(1) });
    visitEditProfile();

    cy.contains('button', 'Удалить фото').click();
    cy.wait('@deleteAvatar');
    cy.wait('@currentUser');
    cy.get('img[alt="Аватар по умолчанию"]').should('be.visible');
    cy.contains('button', 'Добавить фото').should('be.enabled');
  });

  it('отклоняет неверный MIME и слишком большой файл до API', () => {
    const api = interceptAvatarApi();
    visitEditProfile();
    const input = cy.get('input[type="file"]');

    input.selectFile(
      {
        contents: Cypress.Buffer.from('text'),
        fileName: 'avatar.txt',
        mimeType: 'text/plain',
      },
      { force: true }
    );
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Поддерживаются только JPEG, PNG и WebP.');

    input.selectFile(
      {
        contents: Cypress.Buffer.alloc(1_048_577),
        fileName: 'large.png',
        mimeType: 'image/png',
      },
      { force: true }
    );
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Размер изображения превышает допустимый лимит.');
    cy.then(() => expect(api.getCreateCalls()).to.equal(0));
  });

  it('сохраняет все поля профиля и обновляет current user', () => {
    interceptAvatarApi();
    cy.intercept('GET', '**/api/v1/fields/', [
      {
        id: 5,
        name: 'Разработка',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]).as('fields');
    cy.intercept('GET', '**/api/v1/specializations/', [
      {
        id: 9,
        field_id: 5,
        name: 'Backend',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]).as('specializations');
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      request.alias = 'saveProfile';
      expect(request.body).to.deep.equal({
        display_name: 'Новое имя',
        bio: 'Новое описание',
        city: 'Казань',
        workload_hours_per_week: 40,
        level: 'senior',
        employment_type: 'full_time',
        search_status: 'not_looking',
        social_links: { github: 'https://github.com/teamlab' },
        specialization_id: 9,
      });
      request.reply({
        delay: 250,
        body: {
          ...currentUser(null),
          ...request.body,
          specialization_name: 'Backend',
        },
      });
    });
    visitEditProfile();

    getInputByLabel('Имя').clear().type('Новое имя');
    getInputByLabel('Город').clear().type('Казань');
    getInputByLabel('Время активной работы, ч/нед').clear().type('40');
    cy.get('textarea').clear().type('Новое описание');
    cy.get('select').select('development');
    chooseSelectOption('Статус поиска', 'Не ищу');
    chooseSelectOption('Опыт', 'Продвинутый');
    chooseSelectOption('Тип занятости', 'Полный день');
    chooseSelectOption('Соцсеть', 'GitHub');
    getInputByLabel('Ссылка на профиль')
      .clear()
      .type('https://github.com/teamlab');
    cy.contains('button', 'Сохранить').click();

    cy.contains('button', 'Сохраняем…').should('be.disabled');
    cy.contains('button', 'Добавить фото').should('be.disabled');
    cy.wait(['@fields', '@specializations', '@saveProfile']);
    cy.contains('Изменения сохранены.').should('be.visible');
    getInputByLabel('Имя').should('have.value', 'Новое имя');

    getInputByLabel('Имя').clear().type('Черновик');
    cy.contains('button', 'Отменить изменения').click();
    getInputByLabel('Имя').should('have.value', 'Новое имя');
  });

  it('валидирует профиль до PATCH', () => {
    interceptAvatarApi();
    let patchCalls = 0;
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      patchCalls += 1;
      request.reply(currentUser(null));
    });
    visitEditProfile();

    getInputByLabel('Имя').clear().type('   ');
    cy.contains('button', 'Сохранить').click();
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Укажите имя.');

    getInputByLabel('Имя').clear().type('Имя');
    getInputByLabel('Время активной работы, ч/нед').clear().type('169');
    cy.contains('button', 'Сохранить').click();
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Нагрузка должна быть целым числом от 1 до 168.');
    cy.then(() => expect(patchCalls).to.equal(0));
  });
});
