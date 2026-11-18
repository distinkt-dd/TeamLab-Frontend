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
    serverRole(9, 13, 'QA', 'Покрыть тестами'),
    serverRole(10, 14, 'Дизайнер интерфейсов', 'Собрать макеты'),
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

describe('визуальная проверка вкладок участников', () => {
  it('снимает панель с вкладками', () => {
    cy.intercept('GET', '**/api/v1/users/', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/', currentOwner);
    cy.intercept('GET', '**/api/v1/projects/42/', project());
    cy.intercept('GET', '**/api/v1/fields/', [
      {
        id: 1,
        name: 'Разработка',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
    cy.intercept('GET', '**/api/v1/specializations/', [
      specialization(11, 'Frontend'),
      specialization(12, 'Backend'),
      specialization(13, 'QA'),
      specialization(14, 'Дизайнер интерфейсов'),
    ]);
    cy.intercept('GET', '**/api/v1/skills/', [
      {
        id: 21,
        name: 'React',
        slug: 'react',
        field_ids: [1],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    cy.viewport(1440, 1200);
    cy.visit('http://localhost:5173/edit-project/42', {
      onBeforeLoad: seedOwnerAuth,
    });
    cy.get('[role="tablist"][aria-label="Участники проекта"]').should(
      'be.visible'
    );
    cy.wait(400);

    cy.get('[role="tablist"][aria-label="Участники проекта"]')
      .scrollIntoView()
      .should('be.visible');
    cy.wait(400);

    cy.screenshot('viewport-tabs', { capture: 'viewport' });
  });
});
