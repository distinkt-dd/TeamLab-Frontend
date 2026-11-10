type ImageValue = string | null;

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

const seedOwnerAuth = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 10,
          username: 'project-owner',
          display_name: 'Project Owner',
          account_type: 'owner',
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

const currentOwner = {
  id: 10,
  username: 'project-owner',
  display_name: 'Project Owner',
  email: 'owner@example.com',
  bio: '',
  account_type: 'owner',
  avatar: null,
  specialization_id: null,
  specialization_name: null,
  skills: [],
  portfolio_works: [],
  owned_project_ids: [42],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const signedImage = (generation: number): string =>
  `https://storage.yandexcloud.net/teamlab-media/media/project-${generation}.webp?signature=${generation}`;

const project = (image: ImageValue) => ({
  id: 42,
  owner_id: 10,
  field_id: 1,
  title: 'TeamLab',
  description: 'Описание проекта',
  problem: 'Проблема проекта',
  image,
  status: 'open',
  is_favorited: false,
  roles: [
    {
      id: 7,
      project_id: 42,
      specialization_id: 11,
      specialization_name: 'Frontend',
      tasks: ['Разработать интерфейс'],
      benefits: ['Кейс в портфолио'],
      skills: [
        {
          id: 70,
          skill_id: 21,
          name: 'React',
          description: 'Уверенное владение React',
          order: 1,
        },
      ],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  matching_role_id: null,
  matching_role_name: null,
  my_interest_id: null,
  my_interest_status: null,
  my_interest_source: null,
  my_membership_id: null,
  my_membership_status: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

interface ImageApiOptions {
  initialImage?: ImageValue;
  storageStatus?: number;
}

const interceptProjectImageApi = ({
  initialImage = null,
  storageStatus = 204,
}: ImageApiOptions = {}) => {
  let image = initialImage;
  let createCalls = 0;
  let attachCalls = 0;
  let deleteCalls = 0;

  cy.intercept('GET', '**/api/v1/users/', {
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  cy.intercept('GET', '**/api/v1/users/me/', (request) => {
    request.alias = 'currentUser';
    request.reply(currentOwner);
  });
  cy.intercept('GET', '**/api/v1/projects/42/', (request) => {
    request.alias = 'project';
    request.reply(project(image));
  });
  cy.intercept('GET', '**/api/v1/fields/', (request) => {
    request.alias = 'fields';
    request.reply([
      {
        id: 1,
        name: 'Разработка',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });
  cy.intercept('GET', '**/api/v1/specializations/', (request) => {
    request.alias = 'specializations';
    request.reply([
      {
        id: 11,
        field_id: 1,
        name: 'Frontend',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });
  cy.intercept('GET', '**/api/v1/skills/', (request) => {
    request.alias = 'skills';
    request.reply([
      {
        id: 21,
        name: 'React',
        slug: 'react',
        field_ids: [1],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });
  cy.intercept('POST', '**/api/v1/image-uploads/', (request) => {
    createCalls += 1;
    request.alias = 'createProjectUpload';
    expect(request.headers.authorization).to.match(/^Bearer /);
    expect(request.body).to.deep.equal({
      kind: 'project_image',
      target_id: 42,
      content_type: 'image/png',
      size_bytes: 4,
    });
    request.reply({
      statusCode: 201,
      body: {
        upload_id: `project-upload-${createCalls}`,
        status: 'awaiting_upload',
        expires_at: '2026-11-09T12:05:00Z',
        upload_url:
          'https://storage.yandexcloud.net/teamlab-media/project-upload',
        upload_fields: {
          'Content-Type': 'image/png',
          key: `temporary/project-upload-${createCalls}/image`,
          policy: `policy-${createCalls}`,
        },
      },
    });
  });
  cy.intercept(
    'POST',
    'https://storage.yandexcloud.net/teamlab-media/project-upload',
    (request) => {
      request.alias = 'storageUpload';
      expect(request.headers.authorization).to.equal(undefined);
      expect(request.headers['content-type']).to.include('multipart/form-data');
      request.reply({
        statusCode: storageStatus,
        headers: { 'access-control-allow-origin': '*' },
      });
    }
  );
  cy.intercept('POST', '**/api/v1/image-uploads/*/confirm/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    request.alias = 'confirmProjectUpload';
    request.reply({ upload_id: uploadId, status: 'ready' });
  });
  cy.intercept('GET', '**/api/v1/image-uploads/*/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-2);
    request.alias = 'projectUploadStatus';
    request.reply({
      upload_id: uploadId,
      kind: 'project_image',
      status: 'ready',
      image_url: signedImage(createCalls),
      thumbnail_url: signedImage(createCalls),
      error_code: null,
      error_message: '',
    });
  });
  cy.intercept('POST', '**/api/v1/image-uploads/*/attach/', (request) => {
    const uploadId = new URL(request.url).pathname.split('/').at(-3);
    attachCalls += 1;
    image = signedImage(attachCalls);
    request.alias = 'attachProjectUpload';
    request.reply({
      delay: 200,
      body: {
        upload_id: uploadId,
        kind: 'project_image',
        status: 'attached',
        image_url: image,
        thumbnail_url: image,
        error_code: null,
        error_message: '',
      },
    });
  });
  cy.intercept('DELETE', '**/api/v1/projects/42/image/', (request) => {
    deleteCalls += 1;
    image = null;
    request.alias = 'deleteProjectImage';
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
    getDeleteCalls: () => deleteCalls,
  };
};

const visitEditor = (): void => {
  cy.visit('http://localhost:5173/edit-project/42', {
    onBeforeLoad: seedOwnerAuth,
  });
  cy.wait([
    '@currentUser',
    '@project',
    '@fields',
    '@specializations',
    '@skills',
  ]);
};

const selectProjectImage = (contents = 'test'): void => {
  cy.get('input[aria-label="Выбрать изображение проекта"]').selectFile(
    {
      contents: Cypress.Buffer.from(contents),
      fileName: 'project.png',
      mimeType: 'image/png',
    },
    { force: true }
  );
};

describe('изображение в редакторе проекта', () => {
  it('загружает изображение с локальным preview и без JWT в S3', () => {
    const api = interceptProjectImageApi();
    visitEditor();

    selectProjectImage();
    cy.get('img[alt^="Изображение проекта"]')
      .invoke('attr', 'src')
      .should('match', /^blob:/);
    cy.contains('button', 'Сохранить изменения').should('be.disabled');
    cy.wait('@storageUpload');
    cy.wait('@attachProjectUpload');
    cy.wait('@project');
    cy.get('img[alt^="Изображение проекта"]').should(
      'have.attr',
      'src',
      signedImage(1)
    );
    cy.contains('button', 'Заменить фото').should('be.enabled');
    cy.then(() => {
      expect(api.getCreateCalls()).to.equal(1);
      expect(api.getAttachCalls()).to.equal(1);
    });
  });

  it('заменяет изображение и сохраняет несохранённый текстовый черновик', () => {
    const api = interceptProjectImageApi({ initialImage: signedImage(7) });
    visitEditor();
    cy.get('input[aria-label="Название проекта"]')
      .clear()
      .type('Несохранённое название');

    selectProjectImage();
    cy.wait('@attachProjectUpload');
    cy.wait('@project');

    cy.get('input[aria-label="Название проекта"]').should(
      'have.value',
      'Несохранённое название'
    );
    cy.get('img[alt^="Изображение проекта"]').should(
      'have.attr',
      'src',
      signedImage(1)
    );
    cy.then(() => expect(api.getAttachCalls()).to.equal(1));
  });

  it('удаляет изображение через project image endpoint, сохраняя черновик', () => {
    const api = interceptProjectImageApi({ initialImage: signedImage(1) });
    visitEditor();
    cy.get('textarea#project-description')
      .clear()
      .type('Несохранённое описание');

    cy.contains('button', 'Удалить фото').click();
    cy.wait('@deleteProjectImage');
    cy.wait('@project');

    cy.contains('Фото проекта не добавлено').should('be.visible');
    cy.get('textarea#project-description').should(
      'have.value',
      'Несохранённое описание'
    );
    cy.then(() => expect(api.getDeleteCalls()).to.equal(1));
  });

  it('при ошибке S3 оставляет старое изображение и текстовый черновик', () => {
    const oldImage = signedImage(8);
    const api = interceptProjectImageApi({
      initialImage: oldImage,
      storageStatus: 500,
    });
    visitEditor();
    cy.get('input[aria-label="Название проекта"]')
      .clear()
      .type('Черновик после ошибки');

    selectProjectImage();
    cy.wait('@storageUpload');
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Object Storage отклонил загрузку');
    cy.get('img[alt^="Изображение проекта"]').should(
      'have.attr',
      'src',
      oldImage
    );
    cy.get('input[aria-label="Название проекта"]').should(
      'have.value',
      'Черновик после ошибки'
    );
    cy.then(() => expect(api.getAttachCalls()).to.equal(0));
  });

  it('отклоняет неверный MIME и файл больше 2 МиБ до API', () => {
    const api = interceptProjectImageApi();
    visitEditor();
    const input = cy.get('input[aria-label="Выбрать изображение проекта"]');

    input.selectFile(
      {
        contents: Cypress.Buffer.from('text'),
        fileName: 'project.txt',
        mimeType: 'text/plain',
      },
      { force: true }
    );
    cy.get('[role="alert"]').should(
      'contain.text',
      'Поддерживаются только JPEG, PNG и WebP.'
    );

    input.selectFile(
      {
        contents: Cypress.Buffer.alloc(2 * 1024 * 1024 + 1),
        fileName: 'large.png',
        mimeType: 'image/png',
      },
      { force: true }
    );
    cy.get('[role="alert"]').should(
      'contain.text',
      'Размер изображения превышает допустимый лимит.'
    );
    cy.then(() => expect(api.getCreateCalls()).to.equal(0));
  });
});
