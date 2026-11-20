const origin = Cypress.config('baseUrl') || 'http://localhost:5173';

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

const seedAuth = (window: Window): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'header-user',
          display_name: 'Header User',
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

const paginated = (results: unknown[] = []) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const currentUser = {
  id: 1,
  username: 'header-user',
  display_name: 'Header User',
  email: 'header@example.com',
  bio: '',
  account_type: 'owner',
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

const interceptRequests = () => {
  cy.intercept('GET', '**/api/v1/**', paginated());
  cy.intercept('GET', '**/api/v1/users/me/', currentUser);
  cy.intercept('GET', '**/api/v1/fields/**', []);
  cy.intercept('GET', '**/api/v1/specializations/**', []);
  cy.intercept('GET', '**/api/v1/skills/**', []);
};

describe('выпадающее меню Header', () => {
  it('логотип ведёт на главную и доступен с клавиатуры', () => {
    interceptRequests();
    cy.visit(`${origin}/projects`);

    cy.get('a[aria-label="На главную"]')
      .should('have.attr', 'href', '/')
      .focus()
      .should('have.focus');
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.location('pathname').should('eq', '/');
  });

  it('открывает меню по нажатию и закрывает по Escape', () => {
    interceptRequests();
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });
    cy.get('button[aria-label="Личный кабинет"]')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.contains('nav[aria-label="Личный кабинет"] a', 'Участники').should(
      'have.attr',
      'href',
      '/participants'
    );
    cy.contains('nav[aria-label="Личный кабинет"] a', 'Профиль').should(
      'have.attr',
      'href',
      '/my-profile'
    );
    cy.get('a[aria-label="Избранное"]').should(
      'have.attr',
      'href',
      '/favorites'
    );
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.get('button[aria-label="Личный кабинет"]')
      .should('have.focus')
      .and('have.attr', 'aria-expanded', 'false');
  });

  it('направляет гостя на страницу входа', () => {
    interceptRequests();
    cy.visit(`${origin}/`);
    cy.get('button[aria-label="Войти в личный кабинет"]').click();
    cy.location('pathname').should('eq', '/login');
  });

  for (const path of ['/', '/projects', '/participants', '/my-profile']) {
    it(`остаётся верхним слоем на ${path}`, () => {
      interceptRequests();
      cy.visit(`${origin}${path}`, { onBeforeLoad: seedAuth });

      cy.get('button[aria-label="Личный кабинет"]').click();
      cy.get('[aria-label="Личный кабинет"] + div [aria-label="Избранное"]')
        .should('be.visible')
        .parents('[id]')
        .first()
        .parent()
        .should(($wrapper) => {
          const dropdown = $wrapper.children().last().get(0);
          const rect = dropdown.getBoundingClientRect();
          const topElement = dropdown.ownerDocument.elementFromPoint(
            rect.left + rect.width / 2,
            rect.bottom - 20
          );

          expect(dropdown.contains(topElement)).to.equal(true);
        });
    });
  }

  for (const width of [320, 600, 601, 768, 1000, 1100, 1101, 1440]) {
    it(`сохраняет шапку при открытии поиска на ширине ${width}`, () => {
      interceptRequests();
      cy.viewport(width, 900);
      cy.visit(`${origin}/`);
      cy.get('a[aria-label="На главную"]').then(($logo) => {
        const before = $logo[0].getBoundingClientRect();
        cy.contains('button', 'Поиск').click();
        cy.get('a[aria-label="На главную"]').should(($after) => {
          const rect = $after[0].getBoundingClientRect();
          expect(rect.left).to.eq(before.left);
          expect(rect.width).to.eq(before.width);
        });
      });
      cy.get('input[aria-label="Поисковый запрос"]').should('be.visible');
      if (width > 600) {
        cy.get('button[aria-label="Войти в личный кабинет"]:visible').should(
          ($button) => {
            const rect = $button[0].getBoundingClientRect();
            expect(rect.height).to.be.lessThan(50);
            expect(rect.right).to.be.at.most(width);
          }
        );
        cy.get('nav:visible')
          .first()
          .then(($nav) => {
            const bottom = $nav[0].getBoundingClientRect().bottom;
            cy.get('input[aria-label="Поисковый запрос"]').should(($input) => {
              expect($input[0].getBoundingClientRect().top).to.be.greaterThan(
                bottom
              );
            });
          });
      }
    });
  }

  it('прячет навигацию в мобильное меню', () => {
    interceptRequests();
    cy.viewport(375, 900);
    cy.visit(`${origin}/`);
    cy.get('a[aria-label="На главную"]').should('be.visible');
    cy.contains('button', 'Поиск').should('be.visible');
    cy.get('button[aria-label="Открыть меню"]').click();
    cy.get('nav[aria-label="Основная навигация"]')
      .should('be.visible')
      .contains('Проекты');
    cy.get('button[aria-label="Войти в личный кабинет"]:visible').should(
      'be.visible'
    );
    cy.get('button[aria-label="Закрыть меню"]').click();
    cy.get('nav[aria-label="Основная навигация"]').should('not.exist');
  });

  it('не выходит за viewport на мобильном экране', () => {
    interceptRequests();
    cy.viewport(375, 900);
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.get('button[aria-label="Открыть меню"]').click();
    cy.get('button[aria-label="Личный кабинет"]:visible').click();
    cy.get(
      '[aria-label="Личный кабинет"] + div [aria-label="Избранное"]:visible'
    )
      .parents('[id]')
      .first()
      .parent()
      .children()
      .last()
      .should(($dropdown) => {
        const rect = $dropdown.get(0).getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(375);
      });
  });
});
