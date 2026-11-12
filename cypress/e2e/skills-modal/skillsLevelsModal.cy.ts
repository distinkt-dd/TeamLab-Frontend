// Модалка «Уровни навыков» на /edit-profile: перенос навыков между
// «Не распределёнными» и карточками уровней и сохранение через PATCH /users/me/.
type Skill = {
  id: number;
  user_id: number;
  skill_id: number;
  name: string;
  level: string;
  created_at: string;
  updated_at: string;
};

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
          username: 'levels-user',
          display_name: 'Levels User',
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

// Навык без уровня: у демо-пользователей в БД level пустой.
const sketch: Skill = {
  id: 2,
  user_id: 1,
  skill_id: 12,
  name: 'Sketch',
  level: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const currentUser = (skills: Skill[]) => ({
  id: 1,
  username: 'levels-user',
  display_name: 'Levels User',
  email: 'levels@example.com',
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
const levelCard = (title: string) =>
  cy.get(`[role="group"][aria-label="${title}"]`);
const poolTag = (name: string) =>
  cy.get(`button[aria-label="Перетащить навык ${name} в уровень"]`);
const cardTag = (name: string) =>
  cy.get(`button[aria-label="Вернуть навык ${name} в нераспределённые"]`);

const dragToCard = (name: string, title: string): void => {
  poolTag(name).trigger('dragstart');
  levelCard(title).trigger('dragover').trigger('drop');
};

describe('модалка «Уровни навыков»', () => {
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

  it('распределяет навыки по уровням и сохраняет их через PATCH', () => {
    let skills: Skill[] = [figma, sketch];
    let patchBody: unknown = null;

    cy.intercept('GET', '**/api/v1/users/me/', (request) => {
      request.alias = 'currentUser';
      request.reply(currentUser(skills));
    });
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      patchBody = request.body;
      request.alias = 'saveLevels';
      const body = request.body as {
        skills: { skill_id: number; level: string }[];
      };
      skills = body.skills.map((item, index) => ({
        ...figma,
        id: index + 1,
        skill_id: item.skill_id,
        name: item.skill_id === 12 ? 'Sketch' : 'Figma',
        level: item.level,
      }));
      request.reply({ delay: 400, body: currentUser(skills) });
    });

    visitEditProfile();
    cy.contains('button', 'Указать уровни').click();

    // Четыре вида: пул «Не распределённые» и три карточки уровней.
    dialog().contains('Уровни навыков').should('be.visible');
    dialog().contains('Не распределённые').should('be.visible');
    levelCard('Базовый').should('be.visible');
    levelCard('Средний').should('be.visible');
    levelCard('Продвинутый').should('be.visible');

    // Figma уже со средним уровнем, Sketch без уровня — в пуле.
    levelCard('Средний').contains('Figma').should('be.visible');
    poolTag('Sketch').should('be.visible');
    levelCard('Базовый').contains('Sketch').should('not.exist');

    // Пока в пуле есть навыки, сохранить нельзя.
    dialog()
      .contains('Распределите все навыки по уровням')
      .should('be.visible');
    dialog().contains('button', 'Сохранить').should('be.disabled');

    dragToCard('Sketch', 'Базовый');
    levelCard('Базовый').contains('Sketch').should('be.visible');
    poolTag('Sketch').should('not.exist');
    dialog()
      .contains('Все навыки распределены по уровням')
      .should('be.visible');
    dialog().contains('button', 'Сохранить').should('be.enabled');

    dialog().contains('button', 'Сохранить').click();
    cy.contains('button', 'Сохраняем…').should('be.disabled');
    cy.wait('@saveLevels');
    cy.then(() => {
      expect(patchBody).to.deep.equal({
        skills: [
          { skill_id: 11, level: 'middle' },
          { skill_id: 12, level: 'basic' },
        ],
      });
    });

    dialog().should('not.exist');
    cy.contains('li', 'Figma').should('be.visible');
    cy.contains('li', 'Sketch').should('be.visible');
  });

  it('возвращает навык в «Не распределённые» по крестику', () => {
    let patchCalls = 0;

    cy.intercept('GET', '**/api/v1/users/me/', (request) => {
      request.alias = 'currentUser';
      request.reply(currentUser([figma, sketch]));
    });
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      patchCalls += 1;
      request.reply(currentUser([figma, sketch]));
    });

    visitEditProfile();
    cy.contains('button', 'Указать уровни').click();

    cardTag('Figma').click();
    poolTag('Figma').should('be.visible');
    levelCard('Средний').contains('Figma').should('not.exist');
    dialog().contains('button', 'Сохранить').should('be.disabled');
    cy.then(() => expect(patchCalls).to.equal(0));

    // Навык можно вернуть обратно на прежний уровень.
    dragToCard('Figma', 'Средний');
    levelCard('Средний').contains('Figma').should('be.visible');
    dialog().contains('button', 'Сохранить').should('be.disabled');
  });
});
