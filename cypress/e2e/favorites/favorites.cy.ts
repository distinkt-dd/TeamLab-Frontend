const origin = 'http://localhost:5173';

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

const seedAuth = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'current-user',
          display_name: 'Current User',
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

const currentUser = {
  id: 1,
  username: 'current-user',
  display_name: 'Current User',
  email: 'current@example.com',
  bio: null,
  avatar: null,
  account_type: 'participant',
  specialization_id: 3,
  specialization_name: 'Backend-разработчик',
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
  owned_project_ids: [],
};

const field = { id: 1, name: 'Дизайн', created_at: '2026-01-01T00:00:00Z' };
const specialization = {
  id: 3,
  field_id: 1,
  name: 'графический дизайнер',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const favoriteProject = (id: number, title: string) => ({
  id: id + 100,
  user_id: 1,
  project_id: id,
  created_at: '2026-11-20T10:00:00Z',
  project: {
    id,
    owner_id: 2,
    field_id: 1,
    title,
    description: 'Описание проекта',
    problem: null,
    image: null,
    status: 'open',
    is_favorited: true,
    roles_preview: [
      {
        id: id * 10,
        specialization_id: 3,
        specialization_name: 'графический дизайнер',
        skills: [],
      },
    ],
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  },
});

const paginated = (results: unknown[] = []) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

// Пять проектов в избранном: первая секция полная, пятый начинает новую.
const initialFavorites = [
  favoriteProject(1, 'Избранный проект 1'),
  favoriteProject(2, 'Избранный проект 2'),
  favoriteProject(3, 'Избранный проект 3'),
  favoriteProject(4, 'Избранный проект 4'),
  favoriteProject(5, 'Избранный проект 5'),
];

let favorites: ReturnType<typeof favoriteProject>[] = [];

const cardRect = (title: string) =>
  cy.contains('li', title).then(($card) => $card[0].getBoundingClientRect());

describe('страница избранных проектов', () => {
  beforeEach(() => {
    favorites = [...initialFavorites];

    cy.intercept('GET', '**/api/v1/users/me/', currentUser);
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', paginated());
    cy.intercept('GET', '**/api/v1/fields/**', [field]);
    cy.intercept('GET', '**/api/v1/specializations/**', [specialization]);
    cy.intercept('GET', '**/api/v1/skills/**', []);
    cy.intercept('GET', '**/api/v1/users/me/favorite-projects/', (request) => {
      request.reply(favorites);
    });
    cy.intercept(
      'DELETE',
      '**/api/v1/users/me/favorite-projects/*',
      (request) => {
        const projectId = Number(request.url.split('/').reverse()[1]);
        favorites = favorites.filter((item) => item.project_id !== projectId);
        request.reply({ statusCode: 204 });
      }
    );
  });

  it('раскладывает карточки: две в столбец, две в строку, пятый проект — в новой секции', () => {
    cy.visit(`${origin}/favorites`, { onBeforeLoad: seedAuth });

    cy.contains('h2', 'Избранные проекты').should('be.visible');
    cy.get('[aria-label^="Убрать проект"]').should('have.length', 5);

    cardRect('Избранный проект 1').then((first) => {
      cardRect('Избранный проект 2').then((second) => {
        cardRect('Избранный проект 3').then((third) => {
          cardRect('Избранный проект 4').then((fourth) => {
            cardRect('Избранный проект 5').then((fifth) => {
              expect(second.left).to.equal(first.left);
              expect(second.top).to.be.greaterThan(first.top);

              expect(third.left).to.be.greaterThan(first.left);
              expect(third.top).to.equal(first.top);
              expect(fourth.left).to.be.greaterThan(third.left);
              expect(fourth.top).to.equal(third.top);

              expect(fifth.left).to.equal(first.left);
              expect(fifth.top).to.be.greaterThan(second.top);
            });
          });
        });
      });
    });
  });

  it('убирает проект из избранного по клику на сердце', () => {
    cy.visit(`${origin}/favorites`, { onBeforeLoad: seedAuth });

    cy.contains('li', 'Избранный проект 1').should('be.visible');
    cy.get(
      '[aria-label="Убрать проект «Избранный проект 1» из избранного"]'
    ).click();

    cy.contains('li', 'Избранный проект 1').should('not.exist');
    cy.get('[aria-label^="Убрать проект"]').should('have.length', 4);
  });

  it('открывается по кнопке «Избранное» в личном кабинете участника', () => {
    cy.intercept('GET', '**/api/v1/users/me/projects/', {
      memberships: [],
      invitations: [],
    });
    cy.intercept('GET', '**/api/v1/users/me/applications/**', paginated());

    cy.visit(`${origin}/my-profile`, { onBeforeLoad: seedAuth });

    cy.contains('button', 'Избранное').click();

    cy.location('pathname').should('eq', '/favorites');
    cy.contains('h2', 'Избранные проекты').should('be.visible');
  });
});
