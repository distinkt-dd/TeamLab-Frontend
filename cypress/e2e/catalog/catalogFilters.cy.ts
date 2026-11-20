const paginated = <T>(results: T[], next: string | null = null) => ({
  count: results.length + (next ? 1 : 0),
  next,
  previous: null,
  results,
});

const project = (
  id: number,
  title: string,
  specializationId = 10,
  specializationName = 'Frontend-разработчик'
) => ({
  id,
  owner_id: 10,
  field_id: 1,
  title,
  description: 'Описание проекта',
  problem: null,
  image: null,
  status: 'open',
  is_favorited: false,
  roles_preview: [
    {
      id: specializationId,
      specialization_id: specializationId,
      specialization_name: specializationName,
      skills: [],
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const participant = (id: number, username: string) => ({
  id,
  username,
  display_name: `Участник ${id}`,
  avatar: null,
  specialization_id: 10,
  specialization_name: 'Frontend-разработчик',
  level: 'middle',
  workload_hours_per_week: 20,
  work_format: 'remote',
  employment_type: 'part_time',
  search_status: 'looking_for_team',
  city: 'Москва',
  skills: [
    {
      id,
      user_id: id,
      skill_id: 20,
      name: 'React',
      level: 'middle',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
});

const interceptDictionaries = () => {
  cy.intercept('GET', '**/api/v1/fields/**', [
    {
      id: 1,
      name: 'Дизайн',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Разработка',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Маркетинг и продвижение',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Съёмки и продакшн',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 5,
      name: 'Звук и музыка',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 6,
      name: 'Контент',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 7,
      name: 'Продукт',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]).as('fields');
  cy.intercept(
    'GET',
    '**/api/v1/specializations/**',
    (
      [
        [10, 2, 'Frontend-разработчик'],
        [11, 2, 'Backend-разработчик'],
        [12, 1, 'Графический дизайнер'],
        [13, 3, 'Маркетолог'],
        [14, 4, 'Режиссёр'],
        [15, 1, 'UX/UI-дизайнер'],
        [16, 5, 'Звукорежиссёр'],
        [17, 6, 'Копирайтер'],
        [18, 7, 'Менеджер продукта'],
        [19, 999, 'Неизвестная специализация'],
      ] as const
    ).map(([id, fieldId, name]) => ({
      id,
      field_id: fieldId,
      name,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }))
  ).as('specializations');
  cy.intercept('GET', '**/api/v1/skills/**', [
    {
      id: 20,
      name: 'React',
      slug: 'react',
      field_ids: [2],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]).as('skills');
};

const expectFilters = (requestUrl: string) => {
  const params = new URL(requestUrl).searchParams;
  expect(params.get('field_ids')).to.equal('1,2');
  expect(params.get('specialization_ids')).to.equal('10');
  expect(params.get('skill_ids')).to.equal('20');
};

describe('фильтры каталогов', () => {
  beforeEach(() => {
    interceptDictionaries();
  });

  it('восстанавливает фильтры проектов из URL и сохраняет их при пагинации', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      (request) => {
        expectFilters(request.url);
        const params = new URL(request.url).searchParams;
        expect(params.get('search')).to.equal('teamlab');

        if (params.get('page') === '2') {
          request.alias = 'projectsPage2';
          request.reply(paginated([project(2, 'Второй проект')]));
          return;
        }

        request.alias = 'projectsPage1';
        request.reply(
          paginated(
            [project(1, 'Первый проект')],
            '/api/v1/projects/?page=2'
          )
        );
      }
    );

    cy.visit(
      'http://localhost:5173/projects?field_ids=1,2&specialization_ids=10&skill_ids=20&search=teamlab&unknown=kept'
    );
    cy.wait('@projectsPage1');
    cy.wait(['@fields', '@specializations']);
    cy.get('button[aria-label="Все направления, выбрано 2"]').should(
      'be.visible'
    );
    cy.get('button[aria-label="Специализации, выбрано 1"]').should(
      'be.visible'
    );
    cy.contains('li', 'Первый проект').within(() => {
      cy.contains('span', 'Frontend-разработчик').should(
        'have.css',
        'background-color',
        'rgba(37, 226, 255, 0.4)'
      );
    });

    cy.contains('button', 'Показать еще').click();
    cy.wait('@projectsPage2');
    cy.contains('Второй проект').should('be.visible');
    cy.location('search').should('contain', 'unknown=kept');
  });

  it('маркирует специализации цветом их направления', () => {
    const coloredProject = project(1, 'Цвета направлений');
    coloredProject.roles_preview = (
      [
        [12, 'Графический дизайнер'],
        [15, 'UX/UI-дизайнер'],
        [11, 'Backend-разработчик'],
        [13, 'Маркетолог'],
        [14, 'Режиссёр'],
        [16, 'Звукорежиссёр'],
        [17, 'Копирайтер'],
        [18, 'Менеджер продукта'],
        [19, 'Неизвестная специализация'],
      ] as const
    ).map(([specializationId, specializationName]) => ({
      id: Number(specializationId),
      specialization_id: Number(specializationId),
      specialization_name: String(specializationName),
      skills: [],
    }));

    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated([coloredProject])
    ).as('coloredProjects');

    cy.visit('http://localhost:5173/projects');
    cy.wait('@coloredProjects');

    for (const specialization of [
      'Графический дизайнер',
      'UX/UI-дизайнер',
    ]) {
      cy.contains('span', specialization).should(
        'have.css',
        'background-color',
        'rgba(113, 255, 37, 0.4)'
      );
    }
    cy.contains('span', 'Backend-разработчик').should(
      'have.css',
      'background-color',
      'rgba(37, 226, 255, 0.4)'
    );
    cy.contains('span', 'Маркетолог').should(
      'have.css',
      'background-color',
      'rgba(255, 37, 244, 0.4)'
    );
    cy.contains('span', 'Режиссёр').should(
      'have.css',
      'background-color',
      'rgba(255, 145, 73, 0.45)'
    );
    cy.contains('span', 'Звукорежиссёр').should(
      'have.css',
      'background-color',
      'rgba(118, 125, 255, 0.4)'
    );
    cy.contains('span', 'Копирайтер').should(
      'have.css',
      'background-color',
      'rgba(255, 220, 37, 0.45)'
    );
    cy.contains('span', 'Менеджер продукта').should(
      'have.css',
      'background-color',
      'rgba(31, 201, 181, 0.4)'
    );
    cy.contains('span', 'Неизвестная специализация').should(
      'have.css',
      'background-color',
      'rgb(216, 226, 236)'
    );
  });

  it('применяет и сбрасывает фильтры, сохраняя историю браузера', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      (request) => {
        request.alias = 'projects';
        request.reply(paginated([project(1, 'Каталог проектов')]));
      }
    );

    cy.visit('http://localhost:5173/projects?unknown=kept');
    cy.wait('@projects');
    cy.wait(['@fields', '@specializations', '@skills']);

    cy.contains('button', 'Все направления').click();
    cy.contains('[role="option"]', 'Дизайн').trigger('mousedown');
    cy.contains('[role="option"]', 'Разработка').trigger('mousedown');
    cy.get('body').click(0, 0);
    cy.contains('button', 'Специализации').click();
    cy.contains('[role="option"]', 'Frontend-разработчик').trigger(
      'mousedown'
    );
    cy.get('body').click(0, 0);
    cy.contains('button', 'Навыки').click();
    cy.contains('[role="option"]', 'React').trigger('mousedown');
    cy.get('body').click(0, 0);
    cy.contains('button', 'Применить').click();
    cy.wait('@projects').its('request.url').then(expectFilters);
    cy.location('search').should('contain', 'unknown=kept');

    cy.contains('button', 'Сбросить фильтры').click();
    cy.wait('@projects');
    cy.location('search').should('eq', '?unknown=kept');

    cy.go('back');
    cy.wait('@projects').its('request.url').then(expectFilters);
    cy.get('button[aria-label="Все направления, выбрано 2"]').should(
      'be.visible'
    );
  });

  it('передаёт множественные фильтры участников при каждой странице', () => {
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/users/' },
      (request) => {
        expectFilters(request.url);
        const params = new URL(request.url).searchParams;
        expect(params.get('account_type')).to.equal('participant');

        if (params.get('page') === '2') {
          request.alias = 'participantsPage2';
          request.reply(paginated([participant(2, 'participant-2')]));
          return;
        }

        request.alias = 'participantsPage1';
        request.reply(
          paginated(
            [participant(1, 'participant-1')],
            '/api/v1/users/?page=2'
          )
        );
      }
    );

    cy.visit(
      'http://localhost:5173/participants?field_ids=1,2&specialization_ids=10&skill_ids=20'
    );
    cy.wait('@participantsPage1');
    cy.contains('participant-1').should('be.visible');
    cy.contains('button', 'Показать еще').click();
    cy.wait('@participantsPage2');
    cy.contains('participant-2').should('be.visible');
  });

  for (const [width, height] of [
    [1440, 1000],
    [768, 1000],
    [375, 900],
  ] as const) {
    it(`не создаёт горизонтальную прокрутку каталогов при ${width}px`, () => {
      cy.intercept(
        'GET',
        '**/api/v1/projects/**',
        paginated([
          project(1, 'Проект'),
          project(2, 'Второй проект'),
          project(3, 'Третий проект'),
          project(4, 'Четвёртый проект'),
        ])
      );
      cy.intercept(
        'GET',
        '**/api/v1/users/**',
        paginated([
          participant(1, 'participant-1'),
          participant(2, 'participant-2'),
          participant(3, 'participant-3'),
          participant(4, 'participant-4'),
        ])
      );
      cy.viewport(width, height);

      cy.visit('http://localhost:5173/projects');
      cy.contains('span', /^Проект$/).should('be.visible');
      cy.get('img[src="/magenta-deep.png"]').should('be.visible');
      for (const src of ['/violet-fuzz.png', '/wavy-blue.png']) {
        cy.get(`img[src="${src}"]`).should(
          width <= 600 ? 'not.be.visible' : 'be.visible'
        );
      }
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.equal(
          document.documentElement.clientWidth
        );
      });
      cy.visit('http://localhost:5173/participants');
      cy.contains('participant-1').should('be.visible');
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.equal(
          document.documentElement.clientWidth
        );
      });
    });
  }
});
