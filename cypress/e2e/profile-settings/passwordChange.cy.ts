const makeAccessToken = (): string => {
  const encode = (value: object) =>
    Cypress.Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.signature`;
};

const accessToken = makeAccessToken();

const seedAuth = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'password-user',
          display_name: 'Password User',
          account_type: 'participant',
        },
        accessToken,
        refreshToken: 'refresh-token',
        loading: false,
        error: null,
      }),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    })
  );
};

const currentUser = {
  id: 1,
  username: 'password-user',
  display_name: 'Password User',
  email: 'password@example.com',
  bio: '',
  account_type: 'participant',
  specialization_id: null,
  specialization_name: null,
  level: null,
  workload_hours_per_week: null,
  work_format: null,
  employment_type: null,
  search_status: null,
  profile_visibility: 'public',
  notification_enabled: true,
  city: '',
  social_links: {},
  avatar: null,
  skills: [],
  portfolio_works: [],
  owned_project_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const paginated = { count: 0, next: null, previous: null, results: [] };

const visitProfile = (): void => {
  cy.intercept('GET', '**/api/v1/**', paginated);
  cy.intercept('GET', '**/api/v1/users/me/', currentUser).as('currentUser');
  cy.intercept('GET', '**/api/v1/users/me/projects/', {
    memberships: [],
    invitations: [],
  });
  cy.visit('http://localhost:5173/my-profile', { onBeforeLoad: seedAuth });
  cy.wait('@currentUser');
  cy.get('button[aria-label="Изменить пароль"]').click();
  cy.get('[role="dialog"]').as('dialog');
};

const fillPasswords = (
  currentPassword: string,
  newPassword: string,
  confirmation: string
) => {
  cy.get('@dialog')
    .find('input[name="current-password"]')
    .type(currentPassword);
  cy.get('@dialog').find('input[name="new-password"]').type(newPassword);
  cy.get('@dialog').find('input[name="confirm-password"]').type(confirmation);
};

describe('изменение пароля в настройках', () => {
  it('не отправляет несовпадающие пароли', () => {
    cy.intercept('POST', '**/api/v1/users/set_password/', (request) => {
      request.alias = 'setPasswordUnexpected';
      request.reply({ statusCode: 204 });
    });
    visitProfile();
    fillPasswords('CurrentPass123!', 'NewSecurePass123!', 'OtherPass123!');

    cy.get('@dialog')
      .contains('Новые пароли не совпадают')
      .should('be.visible');
    cy.get('@dialog')
      .contains('button', 'Изменить пароль')
      .should('be.disabled');
  });

  it('показывает ошибку неверного текущего пароля и сохраняет поля', () => {
    cy.intercept('POST', '**/api/v1/users/set_password/', {
      statusCode: 400,
      body: { current_password: ['Неверный пароль'] },
    }).as('setPassword');
    visitProfile();
    fillPasswords('WrongPass123!', 'NewSecurePass123!', 'NewSecurePass123!');
    cy.get('@dialog').contains('button', 'Изменить пароль').click();
    cy.wait('@setPassword');

    cy.get('@dialog').contains('Неверный пароль').should('be.visible');
    cy.get('@dialog')
      .find('input[name="new-password"]')
      .should('have.value', 'NewSecurePass123!');
  });

  it('показывает ошибку backend-валидации нового пароля', () => {
    cy.intercept('POST', '**/api/v1/users/set_password/', {
      statusCode: 400,
      body: {
        new_password: ['Введённый пароль слишком широко распространён.'],
      },
    }).as('setPassword');
    visitProfile();
    fillPasswords(
      'CurrentPass123!',
      'CommonPassword123!',
      'CommonPassword123!'
    );
    cy.get('@dialog').contains('button', 'Изменить пароль').click();
    cy.wait('@setPassword');

    cy.get('@dialog')
      .contains('Введённый пароль слишком широко распространён.')
      .should('be.visible');
  });

  it('меняет пароль, очищает поля и сохраняет текущую сессию', () => {
    cy.intercept('POST', '**/api/v1/users/set_password/', (request) => {
      expect(request.body).to.deep.equal({
        current_password: 'CurrentPass123!',
        new_password: 'NewSecurePass123!',
      });
      request.alias = 'setPassword';
      request.reply({ statusCode: 204 });
    });
    visitProfile();
    fillPasswords('CurrentPass123!', 'NewSecurePass123!', 'NewSecurePass123!');
    cy.get('@dialog').contains('button', 'Изменить пароль').click();
    cy.wait('@setPassword');

    cy.get('@dialog')
      .contains('Пароль успешно изменён. Текущая сессия сохранена.')
      .should('be.visible');
    cy.get('@dialog').find('input[type="password"]').should('not.exist');
    cy.window().then((window) => {
      const root = JSON.parse(
        window.localStorage.getItem('persist:root') ?? '{}'
      );
      const auth = JSON.parse(root.auth ?? '{}');
      expect(auth.accessToken).to.equal(accessToken);
    });
  });
});
