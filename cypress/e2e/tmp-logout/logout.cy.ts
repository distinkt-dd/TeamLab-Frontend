describe('временная проверка логаута из личного кабинета', () => {
  const persistKey = 'persist:root';

  const authState = JSON.stringify({
    user: {
      id: 1,
      username: 'test',
      email: 'test@test.test',
      first_name: 'Test',
      last_name: 'Test',
      role: 'owner',
    },
    accessToken: 'fake-access',
    refreshToken: 'fake-refresh',
    loading: false,
    error: null,
  });

  it('кнопка "Выйти" переводит на /login', () => {
    cy.visit('http://localhost:5174/login');
    cy.window().then((win) => {
      win.localStorage.setItem(
        persistKey,
        JSON.stringify({
          auth: authState,
          _persist: JSON.stringify({ version: -1, rehydrated: true }),
        })
      );
    });

    cy.visit('http://localhost:5173/my-profile');
    cy.contains('button', 'Выйти').should('be.visible');
    cy.contains('button', 'Выйти').click();

    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
  });
});
