const featuredProjects = [
  {
    id: 22,
    owner_id: 1,
    field_id: 1,
    title: 'Второй закреплённый',
    description: 'Описание',
    problem: null,
    image: null,
    status: 'open',
    is_favorited: false,
    roles_preview: [
      {
        id: 1,
        specialization_id: 3,
        specialization_name: 'Дизайн',
        skills: [],
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 11,
    owner_id: 1,
    field_id: 1,
    title: 'Первый закреплённый',
    description: 'Описание',
    problem: null,
    image: null,
    status: 'open',
    is_favorited: false,
    roles_preview: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const paginated = <T>(results: T[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const fields = [
  { id: 17, name: 'Дизайн' },
  { id: 29, name: 'Звук и музыка' },
  { id: 43, name: 'Контент' },
  { id: 58, name: 'Маркетинг и продвижение' },
  { id: 71, name: 'Разработка' },
  { id: 86, name: 'Съёмки и продакшн' },
  { id: 103, name: 'Продукт' },
].map((field) => ({
  ...field,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}));

const interceptCommonRequests = () => {
  cy.intercept('GET', '**/api/v1/users/**', paginated([]));
  cy.intercept('GET', '**/api/v1/fields/**', fields).as('fields');
};

const interceptCatalogDictionaries = () => {
  cy.intercept('GET', '**/api/v1/specializations/**', [
    {
      id: 501,
      field_id: fields[0].id,
      name: 'Графический дизайнер',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]).as('specializations');
  cy.intercept('GET', '**/api/v1/skills/**', []).as('skills');
};

const expectFaqAtViewportTop = () => {
  cy.get('#faq').should(($faq) => {
    const top = $faq.get(0).getBoundingClientRect().top;

    expect(top).to.be.at.least(0);
    expect(top).to.be.lessThan(120);
  });
};

describe('главная страница', () => {
  beforeEach(() => {
    interceptCommonRequests();
  });

  it('показывает закреплённые проекты в порядке API', () => {
    cy.intercept(
      'GET',
      '**/api/v1/projects/featured/**',
      paginated(featuredProjects)
    ).as('featuredProjects');

    cy.visit('http://localhost:5173/');
    cy.wait('@featuredProjects');

    cy.contains('проекты недели')
      .parent()
      .find('li')
      .then(($items) => {
        expect($items.eq(0)).to.contain('Второй закреплённый');
        expect($items.eq(1)).to.contain('Первый закреплённый');
      });

    cy.get('footer').within(() => {
      cy.contains('a', 'Проекты').should('have.attr', 'href', '/projects');
      cy.contains('a', 'Поиск специалистов').should(
        'have.attr',
        'href',
        '/participants'
      );
      cy.contains('a', 'Персональные данные').should(
        'have.attr',
        'href',
        '/policy'
      );
      cy.contains('a', 'Пользовательское соглашение').should(
        'have.attr',
        'href',
        '/terms'
      );
    });
  });

  it('прокручивает к FAQ с главной и при повторном нажатии', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    cy.visit('http://localhost:5173/');

    cy.contains('a', 'Вопросы').click();
    cy.location('pathname').should('eq', '/');
    cy.location('hash').should('eq', '#faq');
    expectFaqAtViewportTop();

    cy.scrollTo('top', { duration: 0 });
    cy.window().its('scrollY').should('eq', 0);
    cy.contains('a', 'Вопросы').click();
    expectFaqAtViewportTop();
  });

  it('прокручивает к FAQ при прямом открытии и обновлении страницы', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    cy.visit('http://localhost:5173/#faq');

    cy.location('hash').should('eq', '#faq');
    expectFaqAtViewportTop();

    cy.reload();
    cy.location('hash').should('eq', '#faq');
    expectFaqAtViewportTop();
  });

  it('переходит к FAQ со страницы проектов', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    interceptCatalogDictionaries();
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated([])
    );
    cy.visit('http://localhost:5173/projects');

    cy.contains('a', 'Вопросы').click();
    cy.location('pathname').should('eq', '/');
    cy.location('hash').should('eq', '#faq');
    expectFaqAtViewportTop();
  });

  it('показывает пустое состояние и открывает все проекты из карточки направления', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    cy.intercept('GET', '**/api/v1/projects/?*', paginated([]));

    cy.visit('http://localhost:5173/');
    cy.contains('Закреплённых проектов пока нет.').should(
      'be.visible'
    );
    cy.contains('button', 'Дизайн').click();
    cy.location('pathname').should('eq', '/projects');
    cy.location('search').should('eq', `?field_ids=${fields[0].id}`);
  });

  for (const field of fields) {
    it(`открывает каталог с направлением «${field.name}»`, () => {
      cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
      interceptCatalogDictionaries();
      cy.intercept(
        { method: 'GET', pathname: '/api/v1/projects/' },
        paginated([])
      ).as('catalogProjects');

      cy.visit('http://localhost:5173/');
      cy.wait('@fields');
      cy.contains('button', field.name).click();

      cy.location('pathname').should('eq', '/projects');
      cy.location('search').should('eq', `?field_ids=${field.id}`);
      cy.wait('@catalogProjects').its('request.url').then((url) => {
        expect(new URL(url).searchParams.get('field_ids')).to.equal(
          String(field.id)
        );
      });
      cy.get('button[aria-label="Все направления, выбрано 1"]').should(
        'be.visible'
      );
    });
  }

  it('сохраняет направление, добавляет другой фильтр и сбрасывает их', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    interceptCatalogDictionaries();
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated([])
    ).as('catalogProjects');

    cy.visit('http://localhost:5173/');
    cy.wait('@fields');
    cy.contains('button', 'Дизайн').click();
    cy.wait('@catalogProjects');

    cy.reload();
    cy.wait('@catalogProjects');
    cy.get('button[aria-label="Все направления, выбрано 1"]').should(
      'be.visible'
    );

    cy.contains('button', 'Специализации').click();
    cy.contains('[role="option"]', 'Графический дизайнер').trigger(
      'mousedown'
    );
    cy.get('body').click(0, 0);
    cy.contains('button', 'Применить').click();
    cy.wait('@catalogProjects').its('request.url').then((url) => {
      const params = new URL(url).searchParams;
      expect(params.get('field_ids')).to.equal(String(fields[0].id));
      expect(params.get('specialization_ids')).to.equal('501');
    });

    cy.contains('button', 'Сбросить фильтры').click();
    cy.wait('@catalogProjects').its('request.url').then((url) => {
      const params = new URL(url).searchParams;
      expect(params.has('field_ids')).to.equal(false);
      expect(params.has('specialization_ids')).to.equal(false);
    });
    cy.location('search').should('eq', '');
    cy.contains('button', 'Все направления').should('be.visible');
  });

  it('открывает полный каталог без field_ids при обычном переходе', () => {
    interceptCatalogDictionaries();
    cy.intercept(
      { method: 'GET', pathname: '/api/v1/projects/' },
      paginated([])
    ).as('catalogProjects');

    cy.visit('http://localhost:5173/projects');
    cy.wait('@catalogProjects').its('request.url').then((url) => {
      expect(new URL(url).searchParams.has('field_ids')).to.equal(false);
    });
    cy.location('search').should('eq', '');
  });

  it('не создаёт фильтр для отсутствующего направления', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    cy.intercept('GET', '**/api/v1/fields/**', fields.slice(0, -1)).as(
      'partialFields'
    );

    cy.visit('http://localhost:5173/');
    cy.wait('@partialFields');
    cy.contains('button', 'Продукт').should('be.disabled');
    cy.location('pathname').should('eq', '/');
    cy.location('search').should('eq', '');
  });

  for (const [width, height] of [
    [1440, 1000],
    [768, 1000],
    [375, 900],
  ] as const) {
    it(`показывает сокращённую навигацию без переполнения при ${width}px`, () => {
      cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
      cy.viewport(width, height);
      cy.visit('http://localhost:5173/');
      cy.contains('Закреплённых проектов пока нет.').should('be.visible');

      if (width <= 600) {
        cy.get('button[aria-label="Открыть меню"]').click();
      }

      cy.get('div[class*="_header_"]').first().within(() => {
        cy.contains('a:visible', 'Проекты').should('be.visible');
        cy.contains('a:visible', 'Участники').should('be.visible');
        cy.contains('a:visible', 'Вопросы')
          .should('be.visible')
          .and('have.attr', 'href', '/#faq');
      });
      cy.get('footer').within(() => {
        for (const hiddenItem of [
          'О резюме',
          'Рекомендации',
          'Список статей',
          'Создать проект',
          'О проекте',
          'Инвесторам',
          'ТИМЛАБ API',
          'Помощь',
        ]) {
          cy.contains(hiddenItem).should('not.exist');
        }
        cy.contains('a', 'Проекты').should('be.visible');
        cy.contains('a', 'Поиск специалистов').should('be.visible');
        cy.contains('a', 'Персональные данные').should('be.visible');
      });

      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.eq(
          document.documentElement.clientWidth
        );
      });
    });
  }
});
