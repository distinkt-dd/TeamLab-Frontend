describe('страница 404', () => {
  it('рендерит один общий header и ведет на список проектов', () => {
    cy.visit('http://localhost:5173/not-existing-route');

    cy.contains('Страница потерялась.').should('be.visible');
    cy.get('div[class*="_header_"]').should('have.length', 1);

    cy.contains('button', 'Все проекты').click();
    cy.location('pathname').should('eq', '/projects');
  });
});
