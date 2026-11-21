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

const seedAuth = (
  window: Window,
  accountType: 'owner' | 'participant' = 'owner'
): void => {
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'header-user',
          display_name: 'Header User',
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

const paginated = (results: unknown[] = []) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const ownerApplication = (
  id: number,
  status: 'pending' | 'accepted' = 'pending'
) => ({
  id,
  source: 'application',
  status,
  user_id: id + 10,
  username: `participant-${id}`,
  project_id: 42,
  project_title: 'Демо-проект TeamLab',
  project_role_id: 31,
  project_role_name: 'Backend-разработчик',
  created_at: '2026-01-01T00:00:00Z',
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

const interceptRequests = (accountType: 'owner' | 'participant' = 'owner') => {
  cy.intercept('GET', '**/api/v1/**', paginated());
  cy.intercept('GET', '**/api/v1/users/me/', {
    ...currentUser,
    account_type: accountType,
  });
  cy.intercept('GET', '**/api/v1/fields/**', []);
  cy.intercept('GET', '**/api/v1/specializations/**', [
    {
      id: 1,
      field_id: 1,
      name: 'Графический дизайнер',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      field_id: 2,
      name: 'Backend-разработчик',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 3,
      field_id: 2,
      name: 'React',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
  cy.intercept('GET', '**/api/v1/skills/**', [
    {
      id: 1,
      name: 'React',
      slug: 'react',
      field_ids: [2],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'React Native',
      slug: 'react-native',
      field_ids: [2],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
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
      cy.get('[aria-label="Личный кабинет"] + div:visible')
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
    cy.get('[aria-label="Личный кабинет"] + div:visible')
      .parent()
      .children()
      .last()
      .should(($dropdown) => {
        const rect = $dropdown.get(0).getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(375);
      });
  });

  it('скрывает избранное у владельца', () => {
    interceptRequests();
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.get('button[aria-label="Личный кабинет"]').click();
    cy.get('[aria-label="Личный кабинет"] + div:visible')
      .find('[aria-label="Избранное"]')
      .should('not.exist');
    cy.get('button[aria-label="Заявки, ожидают ответа: 0"]')
      .parent()
      .find('span')
      .should('not.exist');
  });

  it('показывает одну pending-заявку владельца', () => {
    interceptRequests();
    cy.intercept(
      'GET',
      '**/api/v1/users/me/notifications/**',
      paginated([ownerApplication(1)])
    );
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.get('button[aria-label="Личный кабинет"]').click();
    cy.get('button[aria-label="Заявки, ожидают ответа: 1"]')
      .parent()
      .find('span')
      .should('have.text', '1');
  });

  it('считает все страницы pending-заявок и открывает /requests с клавиатуры', () => {
    interceptRequests();
    cy.intercept('GET', '**/api/v1/users/me/notifications/**', (request) => {
      const page = new URL(request.url).searchParams.get('page');

      request.reply(
        page === '2'
          ? {
              count: 4,
              next: null,
              previous: '/api/v1/users/me/notifications/?page=1',
              results: [
                ownerApplication(2),
                ownerApplication(3, 'accepted'),
                {
                  ...ownerApplication(4),
                  source: 'invitation',
                },
              ],
            }
          : {
              count: 4,
              next: '/api/v1/users/me/notifications/?page=2',
              previous: null,
              results: [ownerApplication(1)],
            }
      );
    });
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.get('button[aria-label="Личный кабинет"]').click();
    cy.get('button[aria-label="Заявки, ожидают ответа: 2"]')
      .should('be.visible')
      .focus()
      .should('be.focused')
      .parent()
      .find('span')
      .should('have.text', '2');
    cy.get('button[aria-label="Заявки, ожидают ответа: 2"]').focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.location('pathname').should('eq', '/requests');
  });

  it('сохраняет избранное у участника', () => {
    interceptRequests('participant');
    cy.visit(`${origin}/`, {
      onBeforeLoad: (window) => seedAuth(window, 'participant'),
    });
    cy.get('button[aria-label="Личный кабинет"]').click();
    cy.get('[aria-label="Личный кабинет"] + div:visible')
      .find('[aria-label="Избранное"]')
      .should('be.visible');
  });
});

describe('поиск Header', () => {
  beforeEach(() => {
    interceptRequests();
  });

  it('ищет по Enter с любой страницы и не повторяет тот же запрос', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/`);

    cy.contains('button', 'Поиск').click();
    cy.get('[aria-label="Каталог поиска"]')
      .contains('button', 'Проекты')
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('input[aria-label="Поисковый запрос"]')
      .type('  дизайн & UX  {enter}');

    cy.wait('@searchedProjects').then(({ request }) => {
      expect(new URL(request.url).searchParams.get('search')).to.equal(
        'дизайн & UX'
      );
    });
    cy.location('pathname').should('eq', '/projects');
    cy.location('search').should('eq', '?search=%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD+%26+UX');
    cy.get('input[aria-label="Поисковый запрос"]').should('not.exist');

    cy.contains('button', 'Поиск').click();
    cy.get('input[aria-label="Поисковый запрос"]').should(
      'have.value',
      'дизайн & UX'
    );
    cy.contains('button', 'Найти').click();
    cy.get('@searchedProjects.all').should('have.length', 1);
  });

  it('выбирает проекты по умолчанию для участника', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/`, {
      onBeforeLoad: (window) => seedAuth(window, 'participant'),
    });

    cy.contains('button', 'Поиск').click();
    cy.get('[aria-label="Каталог поиска"]')
      .contains('button', 'Проекты')
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('input[aria-label="Поисковый запрос"]').type('frontend{enter}');

    cy.wait('@searchedProjects');
    cy.location('pathname').should('eq', '/projects');
  });

  it('выбирает участников по умолчанию для владельца', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/users/' },
      paginated()
    ).as('searchedParticipants');
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.contains('button', 'Поиск').click();
    cy.get('[aria-label="Каталог поиска"]')
      .contains('button', 'Участники')
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('input[aria-label="Поисковый запрос"]').type('дизайнер');
    cy.get('#search-dropdown').should(
      'contain.text',
      'Искать «дизайнер» среди участников'
    );
    cy.contains('button', 'Найти').click();

    cy.wait('@searchedParticipants').then(({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('search')).to.equal('дизайнер');
      expect(params.get('account_type')).to.equal('participant');
    });
    cy.location('pathname').should('eq', '/participants');
  });

  it('сохраняет явный выбор каталога после перехода', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/`, { onBeforeLoad: seedAuth });

    cy.contains('button', 'Поиск').click();
    cy.get('[aria-label="Каталог поиска"]')
      .contains('button', 'Проекты')
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('input[aria-label="Поисковый запрос"]').type('команда{enter}');
    cy.wait('@searchedProjects');
    cy.location('pathname').should('eq', '/projects');

    cy.contains('button', 'Поиск').click();
    cy.get('[aria-label="Каталог поиска"]')
      .contains('button', 'Проекты')
      .should('have.attr', 'aria-pressed', 'true');
  });

  it('показывает популярные запросы без дублирующего списка', () => {
    cy.visit(`${origin}/`);

    cy.contains('button', 'Поиск').click();
    cy.get('#search-dropdown [role="option"]').should('have.length', 7);
    cy.get('#search-dropdown')
      .contains('[role="option"]', /^графический дизайнер$/i)
      .should('have.length', 1);
    cy.get('#search-dropdown').should('not.contain.text', 'Искать «');
  });

  it('показывает справочные совпадения без дубликатов', () => {
    cy.visit(`${origin}/`);

    cy.contains('button', 'Поиск').click();
    cy.get('input[aria-label="Поисковый запрос"]').type('REACT');

    cy.get('#search-dropdown [role="option"]').should('have.length', 3);
    cy.get('#search-dropdown')
      .contains('[role="option"]', /^React$/)
      .should('have.length', 1);
    cy.get('#search-dropdown').contains('[role="option"]', 'React Native');
    cy.get('#search-dropdown').contains(
      '[role="option"]',
      'Искать «REACT» во всех проектах'
    );
  });

  it('позволяет свободный поиск при отсутствии совпадений', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/`);

    cy.contains('button', 'Поиск').click();
    cy.get('input[aria-label="Поисковый запрос"]').type('редкий запрос');
    cy.get('#search-dropdown [role="option"]')
      .should('have.length', 1)
      .and('contain.text', 'Искать «редкий запрос» во всех проектах')
      .click();

    cy.wait('@searchedProjects');
    cy.location('search').should(
      'eq',
      '?search=%D1%80%D0%B5%D0%B4%D0%BA%D0%B8%D0%B9+%D0%B7%D0%B0%D0%BF%D1%80%D0%BE%D1%81'
    );
  });

  it('ищет кнопкой со страницы участников', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/participants`);

    cy.contains('button', 'Поиск').click();
    cy.get('input[aria-label="Поисковый запрос"]').type('команда');
    cy.contains('button', 'Найти').click();

    cy.wait('@searchedProjects');
    cy.location('pathname').should('eq', '/projects');
    cy.location('search').should('eq', '?search=%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0');
  });

  it('запускает поиск по подсказке и сохраняет фильтры каталога', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated()
    ).as('searchedProjects');
    cy.visit(`${origin}/projects?field_ids=2&search=old`);
    cy.wait('@searchedProjects');

    cy.contains('button', 'Поиск').click();
    cy.get('button[aria-label="Очистить поле поиска"]').click();
    cy.get('input[aria-label="Поисковый запрос"]').type('граф');
    cy.contains('[role="option"]', /^графический дизайнер$/i).click();

    cy.wait('@searchedProjects').then(({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('field_ids')).to.equal('2');
      expect(params.get('search')).to.equal('Графический дизайнер');
    });
    cy.location('search').should('contain', 'field_ids=2');
  });

  it('очищает запрос и не отправляет пустой поиск на мобильном экране', () => {
    cy.viewport(375, 900);
    cy.visit(`${origin}/`);

    cy.contains('button', 'Поиск').click();
    cy.get('input[aria-label="Поисковый запрос"]').type('проект');
    cy.get('button[aria-label="Очистить поле поиска"]').click();
    cy.get('input[aria-label="Поисковый запрос"]').should('have.value', '');
    cy.contains('button', 'Найти').click();

    cy.location('pathname').should('eq', '/');
    cy.get('input[aria-label="Поисковый запрос"]').should('be.visible');
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.equal(
        document.documentElement.clientWidth
      );
    });
  });
});
