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

const interceptCommonRequests = () => {
  cy.intercept('GET', '**/api/v1/users/**', paginated([]));
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
      cy.contains('О резюме').should('not.match', 'a');
    });
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
  });

  it('не создаёт горизонтальную прокрутку на мобильном экране', () => {
    cy.intercept('GET', '**/api/v1/projects/featured/**', paginated([]));
    cy.viewport(375, 900);
    cy.visit('http://localhost:5173/');
    cy.contains('Закреплённых проектов пока нет.').should(
      'be.visible'
    );

    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.eq(
        document.documentElement.clientWidth
      );
    });
  });
});
