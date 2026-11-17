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

const specialization = (id: number, name: string) => ({
  id,
  field_id: 1,
  name,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const serverRole = (
  id: number,
  specializationId: number,
  name: string,
  task: string
) => ({
  id,
  project_id: 42,
  specialization_id: specializationId,
  specialization_name: name,
  tasks: [task],
  benefits: ['Кейс в портфолио'],
  skills: [
    {
      id: id * 10,
      skill_id: 21,
      name: 'React',
      description: 'Уверенное владение React',
      order: 1,
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const project = () => ({
  id: 42,
  owner_id: 10,
  field_id: 1,
  title: 'TeamLab',
  description: 'Описание проекта',
  problem: 'Проблема проекта',
  image: null,
  status: 'open',
  is_favorited: false,
  roles: [
    serverRole(7, 11, 'Frontend', 'Разработать интерфейс'),
    serverRole(8, 12, 'Backend', 'Собрать API'),
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

const visitEditor = (): void => {
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
    request.reply(project());
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
      specialization(11, 'Frontend'),
      specialization(12, 'Backend'),
      specialization(13, 'QA'),
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

  cy.viewport(1440, 900);
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

const participantTabs = () =>
  cy.get('[role="tablist"][aria-label="Участники проекта"] [role="tab"]');

const addParticipant = (specializationName: string): void => {
  cy.get('button[aria-label="Добавить участника"]').click();
  cy.contains('li[role="option"]', specializationName).click();
};

describe('вкладки участников на странице редактирования проекта', () => {
  it('показывает вкладку на каждого участника и переключает их', () => {
    visitEditor();

    participantTabs().should('have.length', 2);
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'true');
    participantTabs().eq(1).should('have.attr', 'aria-selected', 'false');
    cy.get('textarea[placeholder="Опишите задачу"]').should(
      'have.value',
      'Разработать интерфейс'
    );

    participantTabs().eq(1).click();
    participantTabs().eq(1).should('have.attr', 'aria-selected', 'true');
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'false');
    cy.get('textarea[placeholder="Опишите задачу"]').should(
      'have.value',
      'Собрать API'
    );

    cy.get(
      'ul[aria-label="Добавленные участники"] button[title="Frontend"]'
    ).click();
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'true');
    cy.get('textarea[placeholder="Опишите задачу"]').should(
      'have.value',
      'Разработать интерфейс'
    );
  });

  it('связывает панель с активной вкладкой', () => {
    visitEditor();

    participantTabs().eq(1).click();

    participantTabs()
      .eq(1)
      .invoke('attr', 'id')
      .then((tabId) => {
        cy.get('[role="tabpanel"]').should(
          'have.attr',
          'aria-labelledby',
          tabId
        );
      });
  });

  it('добавляет вкладку нового участника, не делая её активной', () => {
    visitEditor();
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'true');

    addParticipant('QA');

    participantTabs().should('have.length', 3);
    participantTabs().eq(2).should('have.attr', 'aria-selected', 'false');
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'true');
    cy.get('textarea[placeholder="Опишите задачу"]').should(
      'have.value',
      'Разработать интерфейс'
    );

    participantTabs().eq(2).click();
    participantTabs().eq(2).should('have.attr', 'aria-selected', 'true');
    cy.get('textarea[placeholder="Опишите задачу"]').should('have.value', '');
  });

  it('удаляет участника вместе с его вкладкой', () => {
    visitEditor();

    cy.get('button[aria-label="Удалить участника «Backend»"]').click();

    participantTabs().should('have.length', 1);
    cy.get(
      'ul[aria-label="Добавленные участники"] button[title="Backend"]'
    ).should('not.exist');
  });

  it('после удаления всех участников показывает подсказки и не активирует нового', () => {
    visitEditor();

    cy.get('button[aria-label="Удалить участника «Frontend»"]').click();
    cy.get('button[aria-label="Удалить участника «Backend»"]').click();

    cy.get('[role="tablist"]').should('not.exist');
    cy.contains('h2', 'Добавьте участника проекта').should('be.visible');

    addParticipant('QA');

    participantTabs().should('have.length', 1);
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'false');
    cy.contains('h2', 'Выберите вкладку участника').should('be.visible');
    cy.contains('Откройте вкладку участника').should('be.visible');

    participantTabs().eq(0).click();
    participantTabs().eq(0).should('have.attr', 'aria-selected', 'true');
    cy.get('textarea[placeholder="Опишите задачу"]').should('have.value', '');
  });
});
