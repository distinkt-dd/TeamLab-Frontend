// Модалка «Мои навыки» на /edit-profile: справочник /skills/ и сохранение
// выбранных навыков через PATCH /users/me/ (API мокается через cy.intercept).
type Skill = {
  id: number;
  user_id: number;
  skill_id: number;
  name: string;
  level: string;
  created_at: string;
  updated_at: string;
};

const dictionary = [
  {
    id: 11,
    name: 'Figma',
    slug: 'figma',
    field_ids: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 12,
    name: 'Sketch',
    slug: 'sketch',
    field_ids: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 13,
    name: 'Прототипирование',
    slug: 'prototyping',
    field_ids: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

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
          username: 'skills-user',
          display_name: 'Skills User',
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

const figma: Skill = {
  id: 1,
  user_id: 1,
  skill_id: 11,
  name: 'Figma',
  level: 'middle',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const currentUser = (skills: Skill[]) => ({
  id: 1,
  username: 'skills-user',
  display_name: 'Skills User',
  email: 'skills@example.com',
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
  skills,
  portfolio_works: [],
  owned_project_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const visitEditProfile = (): void => {
  cy.visit('http://localhost:5173/edit-profile', { onBeforeLoad: seedAuth });
  cy.wait('@currentUser');
};

const dialog = () => cy.get('[role="dialog"]');

describe('модалка «Мои навыки»', () => {
  beforeEach(() => {
    // Модалка — высокая панель: в дефолтном окне Cypress нижние блоки уходят
    // за границу прокрутки, поэтому задаём размер как в макете.
    cy.viewport(1440, 1000);
    cy.intercept('GET', '**/api/v1/users/', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    // Блок «Мои работы» тоже запрашивает список: без мока живой бэкенд
    // отвечает 401 и приложение сбрасывает сессию.
    cy.intercept('GET', '**/api/v1/users/me/portfolio-works/', []);
  });

  it('добавляет и удаляет навыки и сохраняет их через PATCH', () => {
    let skills: Skill[] = [figma];
    let patchBody: unknown = null;

    cy.intercept('GET', '**/api/v1/users/me/', (request) => {
      request.alias = 'currentUser';
      request.reply(currentUser(skills));
    });
    cy.intercept({ method: 'GET', url: /\/api\/v1\/skills\// }, (request) => {
      request.alias = 'skills';
      request.reply(dictionary);
    });
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      patchBody = request.body;
      request.alias = 'saveSkills';
      const body = request.body as { skills: { skill_id: number }[] };
      skills = body.skills.map((item, index) => ({
        ...figma,
        id: index + 1,
        skill_id: item.skill_id,
        name:
          dictionary.find((skill) => skill.id === item.skill_id)?.name ?? '',
      }));
      request.reply({ delay: 400, body: currentUser(skills) });
    });

    visitEditProfile();

    // До открытия модалки навык виден в блоке страницы.
    dialog().should('not.exist');
    cy.contains('li', 'Figma').should('be.visible');

    cy.contains('button', 'Редактировать').click();
    dialog().should('be.visible');
    cy.wait('@skills');
    dialog().contains('Рекомендуемые навыки').should('be.visible');

    // Сверху — выбранный навык с удалением, снизу — доступные из /skills/.
    dialog()
      .find('button[aria-label="Удалить навык Figma"]')
      .should('be.visible');
    dialog()
      .find('button[aria-label="Добавить навык Figma"]')
      .should('not.exist');
    dialog()
      .find('button[aria-label="Добавить навык Sketch"]')
      .should('be.visible');
    dialog()
      .find('button[aria-label="Добавить навык Прототипирование"]')
      .should('be.visible');

    // Добавляем Sketch и удаляем Figma.
    dialog().find('button[aria-label="Добавить навык Sketch"]').click();
    dialog()
      .find('button[aria-label="Удалить навык Sketch"]')
      .should('be.visible');
    dialog().find('button[aria-label="Удалить навык Figma"]').click();
    dialog()
      .find('button[aria-label="Удалить навык Figma"]')
      .should('not.exist');
    dialog().find('button[aria-label="Добавить навык Figma"]').should('exist');

    // Новый навык уходит с базовым уровнем, уровень Figma сохранялся бы как middle.
    dialog().contains('button', 'Сохранить').click();
    cy.contains('button', 'Сохраняем…').should('be.disabled');
    cy.wait('@saveSkills');
    cy.then(() => {
      expect(patchBody).to.deep.equal({
        skills: [{ skill_id: 12, level: 'basic' }],
      });
    });

    dialog().should('not.exist');
    cy.contains('li', 'Sketch').should('be.visible');
    cy.contains('li', 'Figma').should('not.exist');
  });

  it('не сохраняет пустой список навыков', () => {
    let patchCalls = 0;

    cy.intercept('GET', '**/api/v1/users/me/', (request) => {
      request.alias = 'currentUser';
      request.reply(currentUser([figma]));
    });
    cy.intercept({ method: 'GET', url: /\/api\/v1\/skills\// }, dictionary);
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      patchCalls += 1;
      request.reply(currentUser([figma]));
    });

    visitEditProfile();
    cy.contains('button', 'Редактировать').click();

    dialog().find('button[aria-label="Удалить навык Figma"]').click();
    dialog().contains('Навыки не выбраны').should('be.visible');
    dialog().contains('button', 'Сохранить').should('be.disabled');
    cy.then(() => expect(patchCalls).to.equal(0));
  });
});
