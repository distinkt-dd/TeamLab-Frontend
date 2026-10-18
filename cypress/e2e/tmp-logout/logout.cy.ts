describe('временная проверка логаута из личного кабинета', () => {
  const persistKey = 'persist:root';

  const authState = JSON.stringify({
    user: {
      id: 1,
      username: 'test',
      display_name: 'Test',
      account_type: 'owner',
    },
    accessToken: 'fake-access',
    refreshToken: 'fake-refresh',
    loading: false,
    error: null,
  });

  it('кнопка "Выйти" переводит на /login', () => {
    cy.intercept('GET', '**/api/v1/**', []);
    cy.intercept('POST', '**/api/v1/auth/token/blacklist/', {});
    cy.visit('http://localhost:5173/my-profile', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          persistKey,
          JSON.stringify({
            auth: authState,
            _persist: JSON.stringify({ version: -1, rehydrated: true }),
          })
        );
      },
    });
    cy.contains('button', 'Выйти').should('be.visible');
    cy.contains('button', 'Выйти').click();

    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
  });
});
