const projectDetail = {
  id: 42,
  owner_id: 1,
  field_id: 3,
  title: 'Проект для проверки карточки',
  description: 'Описание проекта',
  problem: 'Проблема проекта',
  image: null,
  status: 'open',
  is_favorited: false,
  matching_role_id: 10,
  matching_role_name: 'Backend-разработчик',
  my_interest_id: null,
  my_interest_status: null,
  my_interest_source: null,
  my_membership_id: null,
  my_membership_status: null,
  created_at: '2026-03-31T10:00:00Z',
  updated_at: '2026-03-31T10:00:00Z',
  roles: [
    {
      id: 10,
      project_id: 42,
      specialization_id: 5,
      specialization_name: 'Backend-разработчик',
      tasks: ['Собрать Backend API'],
      benefits: ['Практика backend-разработки'],
      skills: [
        {
          id: 100,
          skill_id: 7,
          name: 'Python',
          description: 'Уверенное владение Python',
          order: 1,
        },
      ],
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
    },
    {
      id: 11,
      project_id: 42,
      specialization_id: 6,
      specialization_name: 'Frontend-разработчик',
      tasks: ['Собрать Frontend UI'],
      benefits: ['Кейс в портфолио'],
      skills: [
        {
          id: 101,
          skill_id: 8,
          name: 'React',
          description: 'Опыт разработки интерфейсов на React',
          order: 1,
        },
      ],
      created_at: '2026-03-31T10:00:00Z',
      updated_at: '2026-03-31T10:00:00Z',
    },
  ],
};

const visitProject = (detail: object = projectDetail) => {
  cy.intercept('GET', '**/api/v1/projects/42/', detail).as('projectDetail');

  cy.visit('http://localhost:5173/projects/42', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'persist:root',
        JSON.stringify({
          auth: JSON.stringify({
            user: {
              id: 2,
              username: 'candidate',
              display_name: 'Candidate',
              account_type: 'participant',
            },
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            loading: false,
            error: null,
          }),
        })
      );
    },
  });

  cy.wait('@projectDetail');
};

describe('подробная карточка проекта', () => {
  it('синхронно переключает обе вкладки и содержимое роли', () => {
    visitProject();

    cy.contains('button', 'Backend-разработчик').each(($tab) => {
      expect($tab).to.have.attr('aria-selected', 'true');
    });
    cy.contains('Собрать Backend API').should('be.visible');
    cy.contains('button', 'Frontend-разработчик').first().click();
    cy.contains('button', 'Frontend-разработчик').each(($tab) => {
      expect($tab).to.have.attr('aria-selected', 'true');
    });
    cy.contains('Собрать Frontend UI').should('be.visible');
    cy.contains('Опыт разработки интерфейсов на React').should('be.visible');
    cy.contains('Кейс в портфолио').should('be.visible');
  });

  it('не разрешает отклик с вкладки другой специализации', () => {
    let applicationRequests = 0;

    cy.intercept('POST', '**/api/v1/projects/42/applications/', (request) => {
      applicationRequests += 1;
      request.reply({ statusCode: 500 });
    });

    visitProject();
    cy.contains('button', 'Frontend-разработчик').first().click();
    cy.contains('button', 'Недоступно')
      .should('be.disabled')
      .then(($button) => {
        $button[0].click();
        expect(applicationRequests).to.equal(0);
      });
    cy.contains(
      'Отклик доступен только на роль «Backend-разработчик», которая соответствует вашей специализации.'
    ).should('be.visible');
  });

  it('отправляет заявку на matching role и показывает статус только на ней', () => {
    visitProject();

    let applicationRequests = 0;

    cy.intercept('POST', '**/api/v1/projects/42/applications/', (request) => {
      applicationRequests += 1;
      request.reply({
        statusCode: 201,
        body: {
          id: 55,
          user_id: 2,
          project_id: 42,
          project_title: projectDetail.title,
          project_role_id: 10,
          project_role_name: 'Backend-разработчик',
          status: 'pending',
          source: 'application',
          created_at: '2026-03-31T10:05:00Z',
          updated_at: '2026-03-31T10:05:00Z',
        },
      });
    }).as('application');

    cy.contains('button', 'Хочу работать').click();
    cy.wait('@application').then(() => {
      expect(applicationRequests).to.equal(1);
    });
    cy.contains('button', 'Заявка отправлена').should('be.disabled');
    cy.contains('Ваш отклик относится к роли «Backend-разработчик».').should(
      'be.visible'
    );

    cy.contains('button', 'Frontend-разработчик').first().click();
    cy.contains('button', 'Заявка отправлена').should('not.exist');
    cy.contains('button', 'Недоступно').should('be.disabled');
    cy.contains('Ваш отклик относится к роли «Backend-разработчик».').should(
      'be.visible'
    );

    cy.contains('button', 'Backend-разработчик').last().click();
    cy.contains('button', 'Заявка отправлена').should('be.disabled');
  });

  it('восстанавливает роль и статус существующей заявки после обновления', () => {
    visitProject({
      ...projectDetail,
      my_interest_id: 55,
      my_interest_status: 'pending',
      my_interest_source: 'application',
    });

    cy.contains('button', 'Заявка отправлена').should('be.disabled');
    cy.contains('button', 'Backend-разработчик').each(($tab) => {
      expect($tab).to.have.attr('aria-selected', 'true');
    });
    cy.reload();
    cy.wait('@projectDetail');
    cy.contains('button', 'Заявка отправлена').should('be.disabled');
    cy.contains('button', 'Backend-разработчик').each(($tab) => {
      expect($tab).to.have.attr('aria-selected', 'true');
    });
  });

  it('показывает участие с приоритетом над принятой заявкой', () => {
    visitProject({
      ...projectDetail,
      my_interest_id: 55,
      my_interest_status: 'accepted',
      my_interest_source: 'application',
      my_membership_id: 77,
      my_membership_status: 'active',
    });

    cy.contains('h2', 'Вы в команде').should('be.visible');
    cy.contains('button', 'Прекратить участие').should('not.be.disabled');
    cy.contains('button', 'Заявка принята').should('not.exist');
  });

  it('не подменяет принятую заявку участием без membership-сигнала', () => {
    visitProject({
      ...projectDetail,
      my_interest_id: 55,
      my_interest_status: 'accepted',
      my_interest_source: 'application',
    });

    cy.contains('h2', 'Мы ищем').should('be.visible');
    cy.contains('button', 'Заявка принята').should('be.disabled');
    cy.contains('button', 'Прекратить участие').should('not.exist');
  });

  it('показывает действия для ожидающего приглашения', () => {
    visitProject({
      ...projectDetail,
      my_interest_id: 56,
      my_interest_status: 'pending',
      my_interest_source: 'invitation',
    });

    cy.contains('button', 'Принять приглашение').should('not.be.disabled');
    cy.contains('button', 'Отклонить').should('not.be.disabled');
  });

  it('прекращает активное участие через membership API', () => {
    cy.intercept('POST', '**/api/v1/project-memberships/77/leave/', {
      statusCode: 200,
      body: {
        id: 77,
        user_id: 2,
        username: 'candidate',
        project_id: 42,
        project_title: projectDetail.title,
        project_role_id: 10,
        project_role_name: 'Backend-разработчик',
        status: 'left',
        joined_at: '2026-03-31T10:10:00Z',
        ended_at: '2026-03-31T10:20:00Z',
        created_at: '2026-03-31T10:10:00Z',
        updated_at: '2026-03-31T10:20:00Z',
      },
    }).as('leaveMembership');

    visitProject({
      ...projectDetail,
      my_interest_id: 55,
      my_interest_status: 'accepted',
      my_interest_source: 'application',
      my_membership_id: 77,
      my_membership_status: 'active',
    });

    cy.contains('button', 'Прекратить участие').click();
    cy.wait('@leaveMembership');
    cy.contains('h2', 'Мы ищем').should('be.visible');
    cy.contains('button', 'Вы покинули проект').should('be.disabled');
  });

  it('переключает избранное только после успешного ответа', () => {
    visitProject();

    cy.intercept('POST', '**/api/v1/users/me/favorite-projects/', {
      statusCode: 201,
      body: {
        id: 8,
        user_id: 2,
        project_id: 42,
        created_at: '2026-03-31T10:06:00Z',
      },
    }).as('favorite');

    cy.get('button[aria-label="Добавить проект в избранное"]').click();
    cy.wait('@favorite');
    cy.get('button[aria-label="Удалить проект из избранного"]')
      .should('have.attr', 'aria-pressed', 'true')
      .and('not.be.disabled');
  });

  it('оставляет содержимое страницы перед footer', () => {
    visitProject();

    cy.get('main')
      .last()
      .then(($page) => {
        cy.get('footer').then(($footer) => {
          const pageBottom = $page[0].getBoundingClientRect().bottom;
          const footerTop = $footer[0].getBoundingClientRect().top;

          expect(pageBottom).to.be.at.most(footerTop + 1);
        });
      });
  });
});
