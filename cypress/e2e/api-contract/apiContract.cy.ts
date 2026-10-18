import type { CyHttpMessages } from 'cypress/types/net-stubbing';

const paginated = <T>(results: T[], next: string | null = null) => ({
  count: results.length + (next ? 1 : 0),
  next,
  previous: null,
  results,
});

const projectListItem = (id: number, title: string) => ({
  id,
  owner_id: 10,
  field_id: 1,
  title,
  description: `${title}: описание`,
  problem: null,
  image: null,
  status: 'open',
  is_favorited: false,
  roles_preview: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const participant = (id: number, username: string) => ({
  id,
  username,
  display_name: `Участник ${id}`,
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
  contacts_visible: false,
  social_links: null,
  skills: [],
  portfolio_works: [],
});

const emptyUsers = () => {
  cy.intercept({ method: 'GET', pathname: '/api/v1/users/' }, paginated([]));
};

const importAutModule = <T>(window: Window, path: string): Promise<T> =>
  (
    window as Window & {
      eval: (code: string) => unknown;
    }
  ).eval(`import(${JSON.stringify(path)})`) as Promise<T>;

describe('актуальные API-контракты списков и публичного проекта', () => {
  it('загружает страницы проектов без дублей', () => {
    emptyUsers();
    cy.intercept('GET', '**/api/v1/projects/?*', (request) => {
      const page = new URL(request.url).searchParams.get('page');
      if (page === '2') {
        request.alias = 'projectsPage2';
        request.reply(
          paginated([
            projectListItem(3, 'Проект 3'),
            projectListItem(4, 'Проект 4'),
          ])
        );
        return;
      }

      request.alias = 'projectsPage1';
      request.reply(
        paginated(
          [
            projectListItem(1, 'Проект 1'),
            projectListItem(2, 'Проект 2'),
            projectListItem(3, 'Проект 3'),
          ],
          'http://api.test/api/v1/projects/?limit=3&page=2'
        )
      );
    });

    cy.visit('http://localhost:5173/projects');
    cy.wait('@projectsPage1');
    cy.contains('Проект 1').should('be.visible');
    cy.contains('button', 'Показать еще').click();
    cy.wait('@projectsPage2');
    cy.contains('Проект 4').should('be.visible');
    cy.contains('Проект 3').should('have.length', 1);
    cy.contains('button', 'Показать еще').should('not.exist');
  });

  it('корректно показывает пустой список проектов', () => {
    emptyUsers();
    cy.intercept('GET', '**/api/v1/projects/?*', paginated([]));

    cy.visit('http://localhost:5173/projects');
    cy.contains('Проектов пока нет.').should('be.visible');
    cy.contains('button', 'Показать еще').should('not.exist');
  });

  it('добавляет следующую страницу участников без дублей', () => {
    cy.intercept({ method: 'GET', pathname: '/api/v1/users/' }, (request) => {
      const page = new URL(request.url).searchParams.get('page');
      if (page === '2') {
        request.alias = 'usersPage2';
        request.reply(
          paginated([
            participant(2, 'participant-2'),
            participant(3, 'participant-3'),
          ])
        );
        return;
      }

      request.alias = 'usersPage1';
      request.reply(
        paginated(
          [participant(1, 'participant-1'), participant(2, 'participant-2')],
          'http://api.test/api/v1/users/?page=2'
        )
      );
    });

    cy.visit('http://localhost:5173/participants');
    cy.wait('@usersPage1');
    cy.contains('participant-1').should('be.visible');
    cy.contains('button', 'Показать еще').click();
    cy.wait('@usersPage2');
    cy.contains('participant-3').should('be.visible');
    cy.contains('participant-2').should('have.length', 1);
    cy.contains('button', 'Показать еще').should('not.exist');
  });

  it('собирает все страницы заявок и уведомлений без дублей', () => {
    emptyUsers();
    const replyPages = (request: CyHttpMessages.IncomingHttpRequest) => {
      const page = new URL(request.url).searchParams.get('page');
      request.reply(
        page === '2'
          ? paginated([{ id: 2 }, { id: 3 }])
          : paginated(
              [{ id: 1 }, { id: 2 }],
              `${new URL(request.url).origin}${new URL(request.url).pathname}?page=2`
            )
      );
    };
    cy.intercept('GET', '**/api/v1/projects/42/applications/?*', replyPages);
    cy.intercept('GET', '**/api/v1/users/me/notifications/?*', replyPages);

    cy.visit('http://localhost:5173/');
    cy.window().then(async (window) => {
      const [{ getServices }, { ProjectService }, { UserService }] =
        await Promise.all([
          importAutModule<typeof import('@app/store/services')>(
            window,
            '/src/app/store/services.ts'
          ),
          importAutModule<typeof import('@entities/project/ProjectService')>(
            window,
            '/src/entities/project/ProjectService.ts'
          ),
          importAutModule<typeof import('@entities/user/UserService')>(
            window,
            '/src/entities/user/UserService.ts'
          ),
        ]);
      const { api } = getServices();
      const applications = await new ProjectService(
        api
      ).getAllProjectApplications(42);
      const notifications = await new UserService(api).getAllNotifications();

      expect(applications.map(({ id }) => id)).to.deep.equal([1, 2, 3]);
      expect(notifications.map(({ id }) => id)).to.deep.equal([1, 2, 3]);
    });
  });

  it('публично открывает проект, не разрешая защищённые действия', () => {
    emptyUsers();
    let applicationRequests = 0;
    let favoriteRequests = 0;
    cy.intercept('POST', '**/api/v1/projects/42/applications/', (request) => {
      applicationRequests += 1;
      request.reply({ statusCode: 401 });
    });
    cy.intercept('POST', '**/api/v1/users/me/favorite-projects/', (request) => {
      favoriteRequests += 1;
      request.reply({ statusCode: 401 });
    });
    cy.intercept('GET', '**/api/v1/projects/42/', {
      ...projectListItem(42, 'Публичный проект'),
      roles: [],
      matching_role_id: null,
      matching_role_name: null,
      my_interest_id: null,
      my_interest_status: null,
      my_interest_source: null,
      my_membership_id: null,
      my_membership_status: null,
    }).as('publicProject');

    cy.visit('http://localhost:5173/projects/42', {
      onBeforeLoad(window) {
        window.localStorage.clear();
      },
    });
    cy.wait('@publicProject');
    cy.location('pathname').should('eq', '/projects/42');
    cy.contains('h1', 'Публичный проект').should('be.visible');
    cy.contains('button', 'Войдите, чтобы откликнуться')
      .should('be.disabled')
      .then(($button) => $button[0].click());
    cy.get('button[aria-label="Добавить проект в избранное"]')
      .should('be.disabled')
      .then(($button) => $button[0].click());
    cy.then(() => {
      expect(applicationRequests).to.equal(0);
      expect(favoriteRequests).to.equal(0);
    });
  });
});
