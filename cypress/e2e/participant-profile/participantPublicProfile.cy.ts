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

const seedOwner = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'owner',
          display_name: 'Владелец',
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

const participant = {
  id: 7,
  username: 'designer',
  display_name: 'Александра Дизайнер',
  bio: 'Создаю понятные интерфейсы. '.repeat(24),
  avatar: null,
  specialization_id: 12,
  specialization_name: 'UX/UI-дизайнер',
  level: 'middle',
  workload_hours_per_week: 24,
  work_format: 'remote',
  employment_type: 'part_time',
  search_status: 'looking_for_team',
  city: 'Москва',
  contacts_visible: false,
  social_links: null,
  matching_project_role_id: 31,
  matching_project_role_name: 'UX/UI-дизайнер',
  project_interest_id: null,
  project_interest_status: null,
  project_interest_source: null,
  project_membership_id: null,
  project_membership_status: null,
  skills: [
    {
      id: 1,
      user_id: 7,
      skill_id: 101,
      name: 'Figma',
      level: 'advanced',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      user_id: 7,
      skill_id: 102,
      name: 'Прототипирование',
      level: 'middle',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  portfolio_works: [
    {
      id: 51,
      user_id: 7,
      title: 'Сервис для дизайнеров',
      task: 'Упростить навигацию по проектам',
      solution: 'Собрать адаптивный интерфейс',
      image: null,
      technologies: ['Figma', 'UX'],
      link: 'https://example.com/work',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const currentOwner = {
  id: 1,
  username: 'owner',
  display_name: 'Владелец',
  email: 'owner@example.com',
  account_type: 'owner',
  profile_visibility: 'public',
  notification_enabled: true,
  owned_project_ids: [42],
  bio: null,
  avatar: null,
  specialization_id: null,
  specialization_name: null,
  level: null,
  workload_hours_per_week: null,
  work_format: null,
  employment_type: null,
  search_status: null,
  city: null,
  contacts_visible: true,
  social_links: null,
  skills: [],
  portfolio_works: [],
};

const project = {
  id: 42,
  owner_id: 1,
  field_id: 1,
  title: 'Новый сервис',
  description: 'Описание',
  problem: null,
  image: null,
  status: 'open',
  is_favorited: false,
  roles: [
    {
      id: 31,
      project_id: 42,
      specialization_id: 12,
      specialization_name: 'UX/UI-дизайнер',
      tasks: ['Создать интерфейс'],
      benefits: ['Кейс в портфолио'],
      skills: [],
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
};

const pendingApplication = {
  id: 77,
  project_role_id: 31,
  project_role_name: 'UX/UI-дизайнер',
  source: 'application',
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  user: participant,
};

const pendingInvitation = {
  id: 88,
  user_id: 7,
  username: 'designer',
  project_role_id: 31,
  project_role_name: 'UX/UI-дизайнер',
  source: 'invitation',
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const visitProfile = (
  body: object = participant,
  options?: {
    owner?: boolean;
    applications?: object[];
    invitations?: object[];
  }
) => {
  cy.intercept('GET', '**/api/v1/users/7/', body).as('profile');
  if (options?.owner) {
    cy.intercept('POST', '**/api/v1/auth/token/refresh/', {
      access: makeAccessToken(),
      refresh: 'refresh-token-next',
      user: {
        id: 1,
        username: 'owner',
        display_name: 'Владелец',
        account_type: 'owner',
      },
    });
    cy.intercept('GET', '**/api/v1/users/me/', currentOwner).as('currentUser');
    cy.intercept('GET', '**/api/v1/projects/42/', project).as('ownedProject');
    cy.intercept('GET', '**/api/v1/projects/42/applications/**', {
      count: options.applications?.length ?? 0,
      next: null,
      previous: null,
      results: options.applications ?? [],
    }).as('relationApplications');
    cy.intercept('GET', '**/api/v1/projects/42/invitations/**', {
      count: options.invitations?.length ?? 0,
      next: null,
      previous: null,
      results: options.invitations ?? [],
    }).as('relationInvitations');
  }
  cy.visit('http://localhost:5173/participants/7', {
    onBeforeLoad: options?.owner ? seedOwner : undefined,
  });
  cy.wait('@profile');
};

describe('публичный профиль участника', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/specializations/**', []);
    cy.intercept('GET', '**/api/v1/skills/**', []);
  });

  it('открывает профиль из карточки каталога участников', () => {
    cy.intercept('GET', '**/api/v1/fields/**', []);
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/users/' },
      {
        count: 1,
        next: null,
        previous: null,
        results: [participant],
      }
    ).as('participants');
    cy.intercept('GET', '**/api/v1/users/7/', participant).as('profile');

    cy.visit('http://localhost:5173/participants');
    cy.wait('@participants');
    cy.get('button[aria-label="Открыть профиль Александра Дизайнер"]').click();
    cy.location('pathname').should('eq', '/participants/7');
    cy.wait('@profile');
    cy.contains('h1', 'UX/UI-дизайнер').should('be.visible');
  });

  it('показывает профиль, раскрывает описание, навыки и портфолио', () => {
    visitProfile();

    cy.contains('h1', 'UX/UI-дизайнер').should('be.visible');
    cy.contains('Александра Дизайнер').should('be.visible');
    cy.contains('button', 'Показать полностью')
      .should('have.attr', 'aria-expanded', 'false')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.contains('Продвинутый уровень').should('be.visible');
    cy.contains('Figma').should('be.visible');
    cy.contains('Сервис для дизайнеров').should('be.visible');
    cy.contains('Упростить навигацию по проектам').should('be.visible');
    cy.contains('a', 'Узнать больше').should(
      'have.attr',
      'href',
      'https://example.com/work'
    );
    cy.contains('Контакты станут доступны').should('be.visible');
    cy.contains('Приглашения доступны владельцам проектов').should(
      'be.visible'
    );
  });

  it('показывает разрешённые контакты и пустые состояния', () => {
    visitProfile({
      ...participant,
      bio: null,
      contacts_visible: true,
      social_links: { telegram: 't.me/designer' },
      skills: [],
      portfolio_works: [],
    });

    cy.contains('a', 'Telegram').should(
      'have.attr',
      'href',
      'https://t.me/designer'
    );
    cy.contains('Участник пока не указал навыки.').should('be.visible');
    cy.contains('Участник пока не добавил работы.').should('be.visible');
  });

  it('владелец приглашает участника в подходящий проект один раз', () => {
    cy.intercept('POST', '**/api/v1/projects/42/invitations/', (request) => {
      expect(request.body).to.deep.equal({ user_id: 7 });
      request.reply({
        statusCode: 201,
        body: {
          id: 88,
          user_id: 7,
          username: 'designer',
          project_role_id: 31,
          project_role_name: 'UX/UI-дизайнер',
          source: 'invitation',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });
    }).as('invite');
    visitProfile(participant, { owner: true });
    cy.wait(['@currentUser', '@ownedProject']);

    cy.contains('button', 'Пригласить в команду').click();
    cy.wait('@invite');
    cy.contains('button', 'Приглашение отправлено').should('be.disabled');
    cy.contains('Приглашение отправлено.').should('be.visible');
  });

  it('показывает ошибку повторного приглашения без ложного успеха', () => {
    cy.intercept('POST', '**/api/v1/projects/42/invitations/', {
      statusCode: 400,
      body: { user_id: 'У пользователя уже есть необработанное приглашение.' },
    }).as('invite');
    visitProfile(participant, { owner: true });
    cy.wait(['@currentUser', '@ownedProject']);

    cy.contains('button', 'Пригласить в команду').click();
    cy.wait('@invite');
    cy.contains('У пользователя уже есть необработанное приглашение.').should(
      'be.visible'
    );
    cy.contains('button', 'Пригласить в команду').should('be.enabled');
  });

  it('позволяет владельцу принять pending-заявку', () => {
    cy.intercept('POST', '**/api/v1/role-interests/77/accept/', {
      id: 77,
      user_id: 7,
      username: 'designer',
      project_id: 42,
      project_title: 'Новый сервис',
      project_role_id: 31,
      project_role_name: 'UX/UI-дизайнер',
      source: 'application',
      status: 'accepted',
      membership_id: 91,
      membership_status: 'active',
      reviewed_at: '2026-01-02T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }).as('acceptApplication');
    visitProfile(participant, {
      owner: true,
      applications: [pendingApplication],
    });

    cy.contains('button', 'Принять заявку').click();
    cy.wait('@acceptApplication');
    cy.contains('Александра Дизайнер в вашей команде').should('be.visible');
    cy.contains('button', 'Исключить').should('be.visible');
  });

  it('позволяет владельцу отклонить pending-заявку', () => {
    cy.intercept('POST', '**/api/v1/role-interests/77/reject/', {
      id: 77,
      user_id: 7,
      username: 'designer',
      project_id: 42,
      project_title: 'Новый сервис',
      project_role_id: 31,
      project_role_name: 'UX/UI-дизайнер',
      source: 'application',
      status: 'rejected',
      membership_id: null,
      membership_status: null,
      reviewed_at: '2026-01-02T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }).as('rejectApplication');
    visitProfile(participant, {
      owner: true,
      applications: [pendingApplication],
    });

    cy.contains('button', 'Отклонить').click();
    cy.wait('@rejectApplication');
    cy.contains('button', 'Заявка отклонена').should('be.disabled');
  });

  it('не позволяет повторно отправить pending-приглашение', () => {
    visitProfile(participant, {
      owner: true,
      invitations: [pendingInvitation],
    });

    cy.contains('button', 'Приглашение отправлено').should('be.disabled');
    cy.contains('button', 'Пригласить в команду').should('not.exist');
  });

  it('показывает активное участие, контакты и исключает с подтверждением', () => {
    cy.intercept('POST', '**/api/v1/project-memberships/91/remove/', {
      id: 91,
      user_id: 7,
      username: 'designer',
      project_id: 42,
      project_title: 'Новый сервис',
      project_role_id: 31,
      project_role_name: 'UX/UI-дизайнер',
      status: 'removed',
      joined_at: '2026-01-02T00:00:00Z',
      ended_at: '2026-01-03T00:00:00Z',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
    }).as('removeMembership');
    cy.on('window:confirm', () => true);
    visitProfile(
      {
        ...participant,
        contacts_visible: true,
        social_links: { telegram: 't.me/designer' },
        matching_project_role_id: 31,
        matching_project_role_name: 'UX/UI-дизайнер',
        project_interest_id: 77,
        project_interest_status: 'accepted',
        project_interest_source: 'application',
        project_membership_id: 91,
        project_membership_status: 'active',
      },
      { owner: true }
    );

    cy.contains('Александра Дизайнер в вашей команде').should('be.visible');
    cy.contains('a', 'Telegram').should('be.visible');
    cy.contains('button', 'Исключить').click();
    cy.wait('@removeMembership');
    cy.contains('button', 'Участие завершено').should('be.disabled');
  });

  it('обрабатывает отсутствующий профиль', () => {
    cy.intercept('GET', '**/api/v1/users/404/', {
      statusCode: 404,
      body: { detail: 'Not found.' },
    }).as('missingProfile');
    cy.visit('http://localhost:5173/participants/404');
    cy.wait('@missingProfile');
    cy.contains('[role="alert"]', 'Участник не найден.').should('be.visible');
  });

  it('обрабатывает запрет доступа к профилю', () => {
    cy.intercept('GET', '**/api/v1/users/7/', {
      statusCode: 403,
      body: { detail: 'Forbidden.' },
    }).as('forbiddenProfile');
    cy.visit('http://localhost:5173/participants/7');
    cy.wait('@forbiddenProfile');
    cy.contains('[role="alert"]', 'У вас нет доступа к этому профилю.').should(
      'be.visible'
    );
  });

  it('не создаёт горизонтальное переполнение на контрольных ширинах', () => {
    for (const width of [1440, 768, 375]) {
      cy.viewport(width, 900);
      visitProfile();
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.equal(
          document.documentElement.clientWidth
        );
      });
    }
  });
});
