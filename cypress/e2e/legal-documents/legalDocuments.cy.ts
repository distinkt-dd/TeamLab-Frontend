describe('юридические документы и регистрация', () => {
  it('открывает полное Пользовательское соглашение', () => {
    cy.visit('http://localhost:5173/terms');

    cy.contains('h1', 'Пользовательское соглашение TeamLab').should(
      'be.visible'
    );
    cy.contains('h2', '1. Общие положения').should('be.visible');
    cy.contains('h2', '12. Заключительные положения').should('be.visible');
    cy.contains('12.5. Адрес Платформы:').should('be.visible');
  });

  it('переходит между юридическими страницами из Footer', () => {
    cy.visit('http://localhost:5173/policy');

    cy.get('footer')
      .contains('a', 'Пользовательское соглашение')
      .click();
    cy.location('pathname').should('eq', '/terms');

    cy.get('footer').contains('a', 'Персональные данные').click();
    cy.location('pathname').should('eq', '/policy');
  });

  it('разделяет ссылки и не регистрирует без принятия Соглашения', () => {
    let registrationRequests = 0;

    cy.intercept('POST', '**/api/v1/users/', (request) => {
      registrationRequests += 1;
      request.reply({
        statusCode: 400,
        body: { detail: 'Тестовая остановка после проверки запроса.' },
      });
    }).as('register');

    cy.visit('http://localhost:5173/register');
    cy.contains('label', 'Запустить свой проект').click();
    cy.contains('button', 'Далее').click();

    cy.contains('a', 'Пользовательского соглашения')
      .should('have.attr', 'href', '/terms')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer');
    cy.contains('a', 'Политике обработки персональных данных.')
      .should('have.attr', 'href', '/policy')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer');

    cy.get('input[type="email"]').type('legal-check@example.com');
    cy.get('input[type="text"]').type('legal-check');
    cy.get('input[type="password"]').type('Password123!');
    cy.contains('button', 'Зарегистрироваться').click();

    cy.contains('Примите Пользовательское соглашение.').should('be.visible');
    cy.then(() => expect(registrationRequests).to.equal(0));

    cy.get('input[name="termsAccepted"]')
      .should('not.be.checked')
      .check()
      .should('be.checked');
    cy.contains('button', 'Зарегистрироваться').click();
    cy.wait('@register');
    cy.then(() => expect(registrationRequests).to.equal(1));
  });
});
