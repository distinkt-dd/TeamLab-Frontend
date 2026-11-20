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
