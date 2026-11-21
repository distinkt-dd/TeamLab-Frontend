type AccountType = 'owner' | 'participant';

const makeAccessToken = (): string => {
  const encode = (value: object) =>
    Cypress.Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    exp: Math.floor(Date.now() / 1_000) + 3_600,
  })}.signature`;
};

const seedAuth = (window: Window, accountType: AccountType): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'current-user',
          display_name: 'Current User',
          account_type: accountType,
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

const currentUser = (
  accountType: AccountType,
  ownedProjectIds: number[] = []
) => ({
  id: 1,
  username: 'current-user',
  display_name: 'Current User',
  email: 'current@example.com',
  bio: null,
  avatar: null,
  account_type: accountType,
  specialization_id: accountType === 'participant' ? 3 : null,
  specialization_name:
    accountType === 'participant' ? 'Backend-разработчик' : null,
  level: null,
  workload_hours_per_week: null,
  work_format: null,
  employment_type: null,
  search_status: null,
  profile_visibility: 'public',
  notification_enabled: true,
  city: null,
  contacts_visible: false,
  social_links: null,
  skills: [],
  portfolio_works: [],
  owned_project_ids: ownedProjectIds,
});

const projectDetail = (id: number, title: string) => ({
  id,
  owner_id: 1,
  field_id: 1,
  title,
  description: 'Описание',
  problem: null,
  image: null,
  status: 'open',
  is_favorited: false,
  roles: [],
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

describe('ссылки в блоке ожидания личного кабинета', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/skills/**', []);
    cy.intercept('GET', '**/api/v1/specializations/**', []);
  });

  it('показывает pending-приглашения всех проектов и ведёт в профиль по user_id', () => {
    cy.intercept('GET', '**/api/v1/users/me/', currentUser('owner', [42, 43]));
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 10,
          source: 'application',
          status: 'pending',
          user_id: 7,
          username: 'incoming_applicant',
          project_id: 42,
          project_title: 'Демо-проект TeamLab',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    cy.intercept(
      'GET',
      '**/api/v1/projects/42/',
      projectDetail(42, 'Демо-проект TeamLab')
    );
    cy.intercept(
      'GET',
      '**/api/v1/projects/43/',
      projectDetail(43, 'Второй проект')
    );
    cy.intercept('GET', '**/api/v1/projects/42/invitations/**', {
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 20,
          user_id: 7,
          username: 'demo_backend',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          source: 'invitation',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 21,
          user_id: 9,
          username: 'accepted_participant',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          source: 'invitation',
          status: 'accepted',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ],
    });
    cy.intercept('GET', '**/api/v1/projects/43/invitations/**', {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 22,
          user_id: 8,
          username: 'demo_designer',
          project_role_id: 32,
          project_role_name: 'UX/UI-дизайнер',
          source: 'invitation',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    cy.intercept('GET', '**/api/v1/users/7/', {
      ...currentUser('participant'),
      id: 7,
      username: 'demo_backend',
      display_name: 'Demo Backend',
      account_type: undefined,
    });

    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad: (window) => seedAuth(window, 'owner'),
    });
    cy.contains('incoming_applicant').should('not.exist');
    cy.contains('accepted_participant').should('not.exist');
    cy.contains('a', 'demo_designer').should('be.visible');
    cy.contains('Второй проект · UX/UI-дизайнер').should('be.visible');
    cy.get('button[aria-label="Заявки, новых: 1"]')
      .should('be.visible')
      .and('contain.text', 'Заявки');
    cy.contains('button', 'Заявки').should('have.length', 1);
    cy.contains('a', 'demo_backend').focus().should('be.focused').click();
    cy.location('pathname').should('eq', '/participants/7');
  });

  it('показывает пустое состояние, если исходящих приглашений нет', () => {
    cy.intercept('GET', '**/api/v1/users/me/', currentUser('owner'));
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 10,
          source: 'application',
          status: 'pending',
          user_id: 7,
          username: 'incoming_applicant',
          project_id: 42,
          project_title: 'Демо-проект TeamLab',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad: (window) => seedAuth(window, 'owner'),
    });
    cy.contains('Приглашений пока нет.').should('be.visible');
    cy.contains('incoming_applicant').should('not.exist');
  });

  it('ведёт участника на карточку проекта по project_id', () => {
    cy.intercept('GET', '**/api/v1/users/me/', currentUser('participant'));
    cy.intercept('GET', '**/api/v1/users/me/projects/', {
      memberships: [],
      invitations: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/applications/**', {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 11,
          user_id: 1,
          project_id: 42,
          project_title: 'Демо-проект TeamLab',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          source: 'application',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.intercept('GET', '**/api/v1/projects/42/', {
      id: 42,
      owner_id: 2,
      field_id: 1,
      title: 'Демо-проект TeamLab',
      description: 'Описание',
      problem: null,
      image: null,
      status: 'open',
      is_favorited: false,
      roles: [],
      matching_role_id: null,
      matching_role_name: null,
      my_interest_id: 11,
      my_interest_status: 'pending',
      my_interest_source: 'application',
      my_membership_id: null,
      my_membership_status: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad: (window) => seedAuth(window, 'participant'),
    });
    cy.contains('a', 'Демо-проект TeamLab')
      .focus()
      .should('be.focused')
      .click();
    cy.location('pathname').should('eq', '/projects/42');
  });

  it('показывает в колокольчике только входящие pending-приглашения', () => {
    cy.intercept('GET', '**/api/v1/users/me/', currentUser('participant'));
    cy.intercept('GET', '**/api/v1/users/me/projects/', {
      memberships: [],
      invitations: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/applications/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', {
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 12,
          source: 'invitation',
          status: 'pending',
          user_id: 1,
          username: 'current-user',
          project_id: 99,
          project_title: 'Пригласивший проект',
          project_role_id: 32,
          project_role_name: 'Backend-разработчик',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 13,
          source: 'application',
          status: 'pending',
          user_id: 1,
          username: 'current-user',
          project_id: 42,
          project_title: 'Исходящая заявка',
          project_role_id: 31,
          project_role_name: 'Backend-разработчик',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    cy.intercept('GET', '**/api/v1/projects/99/', {
      id: 99,
      owner_id: 2,
      field_id: 1,
      title: 'Пригласивший проект',
      description: 'Описание',
      problem: null,
      image: null,
      status: 'open',
      is_favorited: false,
      roles: [],
      matching_role_id: null,
      matching_role_name: null,
      my_interest_id: 12,
      my_interest_status: 'pending',
      my_interest_source: 'invitation',
      my_membership_id: null,
      my_membership_status: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad: (window) => seedAuth(window, 'participant'),
    });
    cy.contains('button', 'Личный кабинет').click();
    cy.get('button[aria-label="Ожидающих приглашений: 1"]').click();
    cy.contains('Исходящая заявка').should('not.exist');
    cy.contains('a', 'Пригласивший проект')
      .focus()
      .should('be.focused')
      .click();
    cy.location('pathname').should('eq', '/projects/99');
  });

  it('показывает пустое состояние колокольчика без приглашений', () => {
    cy.viewport(375, 900);
    cy.intercept('GET', '**/api/v1/users/me/', currentUser('participant'));
    cy.intercept('GET', '**/api/v1/users/me/projects/', {
      memberships: [],
      invitations: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/applications/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad: (window) => seedAuth(window, 'participant'),
    });
    cy.get('button[aria-label="Открыть меню"]').click();
    cy.get('button[aria-label="Личный кабинет"]:visible').click();
    cy.get('button[aria-label="Ожидающих приглашений: 0"]:visible').click();
    cy.contains('Приглашений пока нет.').should('be.visible');
    cy.contains('Заявок пока нет.').should('be.visible');
    cy.get('section[aria-label="Входящие приглашения"]:visible')
      .parents('[id]')
      .first()
      .should(($dropdown) => {
        const rect = $dropdown.get(0).getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(375);
      });
  });
});
