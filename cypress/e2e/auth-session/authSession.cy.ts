import type { CyHttpMessages } from 'cypress/types/net-stubbing';

type AccountType = 'participant' | 'owner';

interface AuthSeed {
  access: string;
  refresh: string;
  accountType?: AccountType;
}

const API_PATTERN = '**/api/v1/**';
const REFRESH_PATTERN = '**/api/v1/auth/token/refresh/';
const BLACKLIST_PATTERN = '**/api/v1/auth/token/blacklist/';

const makeAccessToken = (expiresInSeconds: number): string => {
  const encode = (value: object) =>
    Cypress.Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const nowSeconds = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    exp: nowSeconds + expiresInSeconds,
  })}.signature`;
};

const seedAuth = (window: Window, seed: AuthSeed): void => {
  const accountType = seed.accountType ?? 'owner';
  window.localStorage.setItem(
    'persist:root',
    JSON.stringify({
      auth: JSON.stringify({
        user: {
          id: 1,
          username: 'session-user',
          display_name: 'Session User',
          account_type: accountType,
        },
        accessToken: seed.access,
        refreshToken: seed.refresh,
        loading: false,
        error: null,
      }),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    })
  );
};

const readPersistedAuth = (window: Window) => {
  const root = window.localStorage.getItem('persist:root');
  expect(root).not.to.equal(null);
  const persistedRoot = JSON.parse(root as string) as { auth: string };
  return JSON.parse(persistedRoot.auth) as {
    accessToken: string | null;
    refreshToken: string | null;
    user: object | null;
  };
};

const currentUser = (accountType: AccountType = 'owner') => ({
  id: 1,
  username: 'session-user',
  display_name: 'Session User',
  email: 'session@example.com',
  bio: '',
  account_type: accountType,
  specialization_id: accountType === 'participant' ? 1 : null,
  specialization_name:
    accountType === 'participant' ? 'Backend-разработчик' : null,
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
});

const replyForGet = (
  request: CyHttpMessages.IncomingHttpRequest,
  accountType: AccountType = 'owner'
): void => {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith('/users/me/projects/')) {
    request.reply({ memberships: [], invitations: [] });
    return;
  }
  if (pathname.endsWith('/users/me/notifications/')) {
    request.reply({ count: 0, next: null, previous: null, results: [] });
    return;
  }
  if (pathname.endsWith('/users/me/')) {
    request.reply(currentUser(accountType));
    return;
  }
  if (pathname.endsWith('/users/')) {
    request.reply({ count: 0, next: null, previous: null, results: [] });
    return;
  }

  request.reply({});
};

const visitProfile = (seed: AuthSeed): void => {
  cy.visit('http://localhost:5173/my-profile', {
    onBeforeLoad(window) {
      seedAuth(window, seed);
    },
  });
};

const navigateInApp = (path: string): void => {
  cy.window().then((window) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
};

const submitLogin = (username: string, password = 'Password123!'): void => {
  cy.get('input[name="username"]').clear().type(username);
  cy.get('input[name="password"]').clear().type(password);
  cy.get('form').trigger('submit');
};

const tokenResponse = (
  username: string,
  access: string,
  refresh: string,
  accountType: AccountType = 'owner'
) => ({
  access,
  refresh,
  user: {
    id: username === 'second-user' ? 2 : 1,
    username,
    display_name: username,
    account_type: accountType,
  },
});

interface AutStoreModule {
  store: {
    dispatch: (action: unknown) => unknown;
    getState: () => {
      auth: {
        accessToken: string | null;
        refreshToken: string | null;
        user: { username: string } | null;
      };
      user: {
        currentUser: ReturnType<typeof currentUser> | null;
        pendingRequestIds: string[];
      };
    };
  };
}

interface AutUserActionsModule {
  fetchCurrentUser: {
    pending: (requestId: string, argument: void) => unknown;
    fulfilled: (
      payload: ReturnType<typeof currentUser>,
      requestId: string,
      argument: void
    ) => unknown;
  };
}

interface AutUserSliceModule {
  setCurrentUser: (user: ReturnType<typeof currentUser>) => unknown;
}

interface AutServicesModule {
  getServices: () => {
    api: {
      post: <T>(uri: string, data?: object) => Promise<T>;
    };
    auth: {
      forceRefresh: () => Promise<void>;
      getSessionGeneration: () => number;
    };
  };
}

const importAutModule = <T>(window: Window, path: string): Promise<T> =>
  (
    window as Window & {
      eval: (code: string) => unknown;
    }
  ).eval(`import(${JSON.stringify(path)})`) as Promise<T>;

const assertPersistedSessionCleared = (): void => {
  cy.window().should((window) => {
    if (window.localStorage.getItem('persist:root') === null) return;

    const auth = readPersistedAuth(window);
    expect(auth.accessToken).to.equal(null);
    expect(auth.refreshToken).to.equal(null);
    expect(auth.user).to.equal(null);
  });
};

describe('безопасное управление JWT-сессией', () => {
  beforeEach(() => {
    cy.intercept('GET', API_PATTERN, (request) => replyForGet(request));
  });

  it('объединяет одновременные refresh после нескольких 401', () => {
    const oldAccess = makeAccessToken(3_600);
    const newAccess = makeAccessToken(7_200);
    let refreshRequests = 0;
    let unauthorizedResponses = 0;
    let successfulRetries = 0;

    cy.intercept('GET', API_PATTERN, (request) => {
      if (request.headers.authorization === `Bearer ${oldAccess}`) {
        unauthorizedResponses += 1;
        request.reply({ statusCode: 401, body: { detail: 'Token expired' } });
        return;
      }
      if (request.headers.authorization === `Bearer ${newAccess}`) {
        successfulRetries += 1;
      }
      replyForGet(request);
    });
    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 200,
        body: {
          access: newAccess,
          refresh: 'rotated-refresh',
          user: currentUser(),
        },
      });
    }).as('refresh');

    visitProfile({ access: oldAccess, refresh: 'initial-refresh' });

    cy.contains('Личный кабинет').should('be.visible');
    cy.wait('@refresh');
    cy.wrap(null).should(() => {
      expect(unauthorizedResponses).to.be.greaterThan(1);
      expect(refreshRequests).to.equal(1);
      expect(successfulRetries).to.be.at.least(unauthorizedResponses);
    });
  });

  it('использует один refresh для auto-refresh и forced-refresh', () => {
    const expiringAccess = makeAccessToken(60);
    const newAccess = makeAccessToken(7_200);
    let refreshRequests = 0;
    let forcedResponses = 0;
    let successfulRetries = 0;

    cy.intercept('GET', API_PATTERN, (request) => {
      if (request.headers.authorization === `Bearer ${expiringAccess}`) {
        forcedResponses += 1;
        request.reply({ statusCode: 401, body: { detail: 'Token expired' } });
        return;
      }
      if (request.headers.authorization === `Bearer ${newAccess}`) {
        successfulRetries += 1;
      }
      replyForGet(request);
    });
    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 250,
        body: {
          access: newAccess,
          refresh: 'auto-rotated-refresh',
          user: currentUser(),
        },
      });
    }).as('refresh');

    visitProfile({ access: expiringAccess, refresh: 'initial-refresh' });

    cy.wait('@refresh');
    cy.contains('Личный кабинет').should('be.visible');
    cy.wrap(null).should(() => {
      expect(refreshRequests).to.equal(1);
      expect(forcedResponses).to.be.greaterThan(0);
      expect(successfulRetries).to.be.greaterThan(0);
    });
  });

  it('не завершает сессию B из-за позднего 401 auto-refresh сессии A', () => {
    const accessA = makeAccessToken(60);
    const accessB = makeAccessToken(7_200);
    let refreshRequests = 0;
    let blacklistRequests = 0;

    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 1_500,
        statusCode: 401,
        body: { detail: 'Old refresh is invalid' },
      });
    }).as('oldAutoRefresh');
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      request.reply({});
    });
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.wrap(null).should(() => expect(refreshRequests).to.equal(1));

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.wait('@oldAutoRefresh');

    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.accessToken).to.equal(accessB);
      expect(auth.refreshToken).to.equal('session-b-refresh');
      expect(auth.user).to.include({ username: 'second-user' });
    });
    cy.wrap(null).should(() => expect(blacklistRequests).to.equal(0));
  });

  it('не завершает сессию B из-за позднего 400 forced-refresh сессии A', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    let refreshRequests = 0;
    let blacklistRequests = 0;

    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 1_500,
        statusCode: 400,
        body: { refresh: ['Old refresh is invalid'] },
      });
    }).as('oldForcedRefresh');
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      request.reply({});
    });
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      void getServices()
        .auth.forceRefresh()
        .catch(() => undefined);
    });
    cy.wrap(null).should(() => expect(refreshRequests).to.equal(1));

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.wait('@oldForcedRefresh');

    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.accessToken).to.equal(accessB);
      expect(auth.refreshToken).to.equal('session-b-refresh');
    });
    cy.wrap(null).should(() => expect(blacklistRequests).to.equal(0));
  });

  it('не записывает успешную rotation A поверх login B', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    let refreshRequests = 0;

    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 1_500,
        body: {
          access: makeAccessToken(7_200),
          refresh: 'late-rotated-session-a-refresh',
          user: currentUser(),
        },
      });
    }).as('oldSuccessfulRefresh');
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      void getServices()
        .auth.forceRefresh()
        .catch(() => undefined);
    });
    cy.wrap(null).should(() => expect(refreshRequests).to.equal(1));

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.wait('@oldSuccessfulRefresh');

    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.accessToken).to.equal(accessB);
      expect(auth.refreshToken).to.equal('session-b-refresh');
      expect(auth.user).to.include({ username: 'second-user' });
    });
  });

  it('не записывает токены после logout во время refresh и отзывает rotated refresh', () => {
    const oldAccess = makeAccessToken(3_600);
    const rotatedAccess = makeAccessToken(7_200);
    let refreshRequests = 0;
    let blacklistedRefresh: string | null = null;

    cy.intercept('GET', API_PATTERN, (request) => {
      if (request.headers.authorization === `Bearer ${oldAccess}`) {
        request.reply({ statusCode: 401, body: { detail: 'Token expired' } });
        return;
      }
      replyForGet(request);
    });
    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({
        delay: 500,
        body: {
          access: rotatedAccess,
          refresh: 'refresh-created-during-logout',
          user: currentUser(),
        },
      });
    }).as('refresh');
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistedRefresh = (request.body as { refresh: string }).refresh;
      expect(request.headers).not.to.have.property('authorization');
      request.reply({ statusCode: 200, body: {} });
    }).as('blacklist');

    visitProfile({ access: oldAccess, refresh: 'initial-refresh' });

    cy.wrap(null).should(() => expect(refreshRequests).to.equal(1));
    cy.contains('button', 'Выйти').click();
    assertPersistedSessionCleared();
    cy.wait('@refresh');
    cy.wait('@blacklist');
    cy.wrap(null).should(() => {
      expect(blacklistedRefresh).to.equal('refresh-created-during-logout');
    });
    assertPersistedSessionCleared();
  });

  it('отзывает refresh, ротированный непосредственно перед logout', () => {
    const expiringAccess = makeAccessToken(60);
    let blacklistedRefresh: string | null = null;

    cy.intercept('POST', REFRESH_PATTERN, {
      body: {
        access: makeAccessToken(7_200),
        refresh: 'latest-rotated-refresh',
        user: currentUser(),
      },
    }).as('refresh');
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistedRefresh = (request.body as { refresh: string }).refresh;
      request.reply({ statusCode: 200, body: {} });
    }).as('blacklist');

    visitProfile({ access: expiringAccess, refresh: 'initial-refresh' });
    cy.wait('@refresh');
    cy.contains('button', 'Выйти').click();
    cy.wait('@blacklist');
    cy.wrap(null).should(() => {
      expect(blacklistedRefresh).to.equal('latest-rotated-refresh');
    });
  });

  [200, 400, 401].forEach((statusCode) => {
    it(`гарантирует локальный logout при blacklist ${statusCode}`, () => {
      let blacklistRequests = 0;

      cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
        blacklistRequests += 1;
        request.reply({
          statusCode,
          body: statusCode === 200 ? {} : { detail: 'Rejected' },
        });
      }).as('blacklist');

      visitProfile({
        access: makeAccessToken(3_600),
        refresh: 'refresh-to-blacklist',
      });
      cy.contains('button', 'Выйти').click();
      cy.wait('@blacklist');
      cy.location('pathname').should('eq', '/login');
      assertPersistedSessionCleared();
      cy.wrap(null).should(() => expect(blacklistRequests).to.equal(1));
    });
  });

  it('гарантирует локальный logout при network error blacklist', () => {
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => request.destroy()).as(
      'blacklist'
    );

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'refresh-to-blacklist',
    });
    cy.contains('button', 'Выйти').click();
    cy.wait('@blacklist');
    cy.location('pathname').should('eq', '/login');
    assertPersistedSessionCleared();
  });

  it('после blacklist timeout разрешает новый login и повторный logout', () => {
    const accessB = makeAccessToken(7_200);
    let blacklistRequests = 0;
    let loginRequests = 0;
    const blacklistedTokens: string[] = [];

    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      blacklistedTokens.push((request.body as { refresh: string }).refresh);
      request.alias =
        blacklistRequests === 1 ? 'timedOutBlacklist' : 'newSessionBlacklist';
      request.reply({
        statusCode: 200,
        body: {},
        delay: blacklistRequests === 1 ? 6_000 : 0,
      });
    });
    cy.intercept('POST', '**/api/v1/auth/token/login/', (request) => {
      loginRequests += 1;
      request.reply({
        body: tokenResponse('second-user', accessB, 'session-b-refresh'),
      });
    }).as('loginAfterTimeout');

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'refresh-to-blacklist',
    });
    cy.contains('button', 'Выйти').click();
    cy.location('pathname').should('eq', '/login');
    assertPersistedSessionCleared();
    submitLogin('second-user');
    cy.wait(100);
    cy.wrap(null).should(() => expect(loginRequests).to.equal(0));

    cy.wait(5_500);
    cy.wait('@loginAfterTimeout');
    cy.location('pathname').should('eq', '/my-profile');
    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.refreshToken).to.equal('session-b-refresh');
    });

    cy.contains('button', 'Выйти').click();
    cy.wait('@newSessionBlacklist');
    cy.wrap(null).should(() => {
      expect(blacklistRequests).to.equal(2);
      expect(blacklistedTokens).to.deep.equal([
        'refresh-to-blacklist',
        'session-b-refresh',
      ]);
    });
    assertPersistedSessionCleared();
  });

  it('не создаёт параллельные blacklist при повторном logout', () => {
    let blacklistRequests = 0;
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      request.reply({ statusCode: 200, body: {}, delay: 250 });
    }).as('blacklist');

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'refresh-to-blacklist',
    });
    cy.contains('button', 'Выйти').then(($button) => {
      $button[0].click();
      $button[0].click();
    });
    cy.wait('@blacklist');
    cy.wrap(null).should(() => expect(blacklistRequests).to.equal(1));
  });

  it('завершает сессию при невалидном refresh', () => {
    let blacklistRequests = 0;
    cy.intercept('POST', REFRESH_PATTERN, {
      statusCode: 401,
      body: { detail: 'Token is invalid', code: 'token_not_valid' },
    }).as('refresh');
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      request.reply({ statusCode: 401, body: { detail: 'Token is invalid' } });
    }).as('blacklist');

    visitProfile({
      access: makeAccessToken(60),
      refresh: 'invalid-refresh',
    });
    cy.wait('@refresh');
    cy.wait('@blacklist');
    cy.location('pathname').should('eq', '/login');
    assertPersistedSessionCleared();
    cy.wrap(null).should(() => expect(blacklistRequests).to.equal(1));
  });

  it('сохраняет сессию при временной network error refresh', () => {
    let blacklistRequests = 0;
    cy.intercept('POST', REFRESH_PATTERN, (request) => request.destroy()).as(
      'refresh'
    );
    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistRequests += 1;
      request.reply({});
    });

    visitProfile({
      access: makeAccessToken(60),
      refresh: 'temporarily-unavailable-refresh',
    });
    cy.wait('@refresh');
    cy.contains('button', 'Выйти').should('be.visible');
    cy.wrap(null).should(() => expect(blacklistRequests).to.equal(0));
    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.refreshToken).to.equal('temporarily-unavailable-refresh');
    });
  });

  it('восстанавливает persisted session без немедленного refresh валидного access', () => {
    let refreshRequests = 0;
    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({});
    });

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'persisted-refresh',
    });
    cy.contains('button', 'Выйти').should('be.visible');
    cy.wait(250);
    cy.wrap(null).should(() => expect(refreshRequests).to.equal(0));
  });

  it('не принимает login, завершившийся после начавшегося logout', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(3_600);

    cy.intercept('POST', '**/api/v1/auth/token/login/', (request) => {
      request.reply({
        delay: 1_000,
        body: tokenResponse('late-user', accessB, 'late-refresh'),
      });
    }).as('lateLogin');
    cy.intercept('POST', BLACKLIST_PATTERN, {}).as('blacklist');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.contains('Личный кабинет').should('be.visible');
    navigateInApp('/login');
    submitLogin('late-user');
    cy.get('@lateLogin.all').should('have.length', 1);

    navigateInApp('/my-profile');
    cy.contains('button', 'Выйти').click();
    cy.wait('@blacklist');
    assertPersistedSessionCleared();
    cy.wait('@lateLogin');
    assertPersistedSessionCleared();
  });

  it('для параллельных login применяет last-started-wins', () => {
    const firstAccess = makeAccessToken(3_600);
    const secondAccess = makeAccessToken(7_200);
    let firstLoginRequests = 0;

    cy.intercept('POST', '**/api/v1/auth/token/login/', (request) => {
      const username = (request.body as { username: string }).username;

      if (username === 'first-user') {
        firstLoginRequests += 1;
        request.alias = 'firstLogin';
        request.reply({
          delay: 800,
          body: tokenResponse('first-user', firstAccess, 'first-user-refresh'),
        });
        return;
      }

      request.alias = 'secondLogin';
      request.reply({
        delay: 100,
        body: tokenResponse('second-user', secondAccess, 'second-user-refresh'),
      });
    });

    cy.visit('http://localhost:5173/login');
    submitLogin('first-user');
    cy.wrap(null).should(() => expect(firstLoginRequests).to.equal(1));
    submitLogin('second-user');

    cy.wait('@secondLogin');
    cy.wait('@firstLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.accessToken).to.equal(secondAccess);
      expect(auth.refreshToken).to.equal('second-user-refresh');
      expect(auth.user).to.include({ username: 'second-user' });
    });
  });

  it('не запускает auto-login регистрации A после login B', () => {
    const accessB = makeAccessToken(7_200);
    let registrationRequests = 0;
    let registrationAutoLoginRequests = 0;

    cy.intercept('POST', '**/api/v1/users/', (request) => {
      registrationRequests += 1;
      request.reply({
        delay: 1_500,
        statusCode: 201,
        body: {
          ...currentUser('owner'),
          username: 'registered-user',
          email: 'registered@example.com',
        },
      });
    }).as('registerUser');
    cy.intercept('POST', '**/api/v1/auth/token/login/', (request) => {
      const username = (request.body as { username: string }).username;

      if (username === 'registered-user') {
        registrationAutoLoginRequests += 1;
        request.reply({
          body: tokenResponse(
            'registered-user',
            makeAccessToken(7_200),
            'registered-user-refresh'
          ),
        });
        return;
      }

      request.alias = 'sessionBLogin';
      request.reply({
        body: tokenResponse('second-user', accessB, 'session-b-refresh'),
      });
    });

    cy.visit('http://localhost:5173/register');
    cy.contains('label', 'Запустить свой проект').click();
    cy.contains('button', 'Далее').click();
    cy.get('input[type="email"]').type('registered@example.com');
    cy.get('input[type="text"]').type('registered-user');
    cy.get('input[type="password"]').type('Password123!');
    cy.contains('button', 'Зарегистрироваться').click();
    cy.wrap(null).should(() => expect(registrationRequests).to.equal(1));

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.wait('@registerUser');
    cy.wait(100);

    cy.wrap(null).should(() => {
      expect(registrationRequests).to.equal(1);
      expect(registrationAutoLoginRequests).to.equal(0);
    });
    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.accessToken).to.equal(accessB);
      expect(auth.refreshToken).to.equal('session-b-refresh');
      expect(auth.user).to.include({ username: 'second-user' });
    });
  });

  it('разрешает login во время logout и повторный logout новой сессии', () => {
    const accessB = makeAccessToken(7_200);
    const blacklistedTokens: string[] = [];
    let loginRequests = 0;
    let sessionAGeneration = 0;
    let logoutGeneration = 0;
    let sessionBGeneration = 0;

    cy.intercept('POST', BLACKLIST_PATTERN, (request) => {
      blacklistedTokens.push((request.body as { refresh: string }).refresh);
      request.reply({
        delay: blacklistedTokens.length === 1 ? 2_000 : 0,
        body: {},
      });
    }).as('blacklist');
    cy.intercept('POST', '**/api/v1/auth/token/login/', (request) => {
      loginRequests += 1;
      request.reply({
        body: tokenResponse('second-user', accessB, 'session-b-refresh'),
      });
    }).as('loginAfterLogout');

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'session-a-refresh',
    });
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      sessionAGeneration = getServices().auth.getSessionGeneration();
    });
    cy.contains('button', 'Выйти').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      logoutGeneration = getServices().auth.getSessionGeneration();
      expect(logoutGeneration).to.be.greaterThan(sessionAGeneration);
    });
    submitLogin('second-user');
    cy.wait(100);
    cy.wrap(null).should(() => expect(loginRequests).to.equal(0));

    cy.wait('@blacklist');
    cy.wait('@loginAfterLogout');
    cy.location('pathname').should('eq', '/my-profile');
    cy.window().should((window) => {
      const auth = readPersistedAuth(window);
      expect(auth.refreshToken).to.equal('session-b-refresh');
      expect(auth.user).to.include({ username: 'second-user' });
    });
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      sessionBGeneration = getServices().auth.getSessionGeneration();
      expect(sessionBGeneration).to.be.greaterThan(logoutGeneration);
    });
    cy.contains('button', 'Выйти').click();
    cy.wait('@blacklist');
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      expect(getServices().auth.getSessionGeneration()).to.be.greaterThan(
        sessionBGeneration
      );
    });
    cy.wrap(null).should(() => {
      expect(blacklistedTokens).to.deep.equal([
        'session-a-refresh',
        'session-b-refresh',
      ]);
    });
    assertPersistedSessionCleared();
  });

  it('не повторяет старый GET после смены поколения сессии', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    let oldGetRequests = 0;
    let crossSessionRetries = 0;

    cy.intercept('GET', '**/api/v1/users/me/projects/', (request) => {
      if (request.headers.authorization === `Bearer ${accessA}`) {
        oldGetRequests += 1;
        request.reply({
          delay: 1_500,
          statusCode: 401,
          body: { detail: 'Old session' },
        });
        return;
      }

      if (request.headers.authorization === `Bearer ${accessB}`) {
        crossSessionRetries += 1;
      }
      request.reply({ memberships: [], invitations: [] });
    }).as('oldSessionGet');
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({
      access: accessA,
      refresh: 'session-a-refresh',
      accountType: 'participant',
    });
    cy.wrap(null).should(() => expect(oldGetRequests).to.equal(1));
    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.wait('@oldSessionGet');
    cy.wrap(null).should(() => expect(crossSessionRetries).to.equal(0));
  });

  it('не повторяет старый POST с токеном новой сессии', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    let oldPostRequests = 0;
    let crossSessionRetries = 0;

    cy.intercept('POST', '**/api/v1/session-boundary-test/', (request) => {
      if (request.headers.authorization === `Bearer ${accessA}`) {
        oldPostRequests += 1;
        request.reply({
          delay: 1_500,
          statusCode: 401,
          body: { detail: 'Old session' },
        });
        return;
      }

      if (request.headers.authorization === `Bearer ${accessB}`) {
        crossSessionRetries += 1;
      }
      request.reply({});
    }).as('oldSessionPost');
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.window().then(async (window) => {
      const { getServices } = await importAutModule<AutServicesModule>(
        window,
        '/src/app/index.ts'
      );
      void getServices()
        .api.post('/session-boundary-test/', { value: 'old-session' })
        .catch(() => undefined);
    });
    cy.wrap(null).should(() => expect(oldPostRequests).to.equal(1));

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.wait('@oldSessionPost');
    cy.wrap(null).should(() => expect(crossSessionRetries).to.equal(0));
  });

  it('не повторяет старый PATCH и не возвращает его cache после смены сессии', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    const userA = { ...currentUser(), email: 'account-a@example.com' };
    const userB = {
      ...currentUser(),
      id: 2,
      username: 'second-user',
      display_name: 'Second User',
      email: 'account-b@example.com',
    };
    let crossSessionRetries = 0;

    cy.intercept('GET', '**/api/v1/users/me/', (request) => {
      request.reply(
        request.headers.authorization === `Bearer ${accessB}` ? userB : userA
      );
    });
    cy.intercept('PATCH', '**/api/v1/users/me/', (request) => {
      if (request.headers.authorization === `Bearer ${accessA}`) {
        request.reply({
          delay: 1_500,
          statusCode: 401,
          body: { detail: 'Old session' },
        });
        return;
      }

      crossSessionRetries += 1;
      request.reply(userB);
    }).as('oldSessionPatch');
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.contains('account-a@example.com').should('be.visible');
    cy.get('button[aria-label="Уведомления"]').click();
    cy.contains('[role="option"]', 'Выключены').click();
    cy.get('@oldSessionPatch.all').should('have.length', 1);

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.contains('account-b@example.com').should('be.visible');
    cy.wait('@oldSessionPatch');
    cy.contains('account-b@example.com').should('be.visible');
    cy.contains('account-a@example.com').should('not.exist');
    cy.wrap(null).should(() => expect(crossSessionRetries).to.equal(0));
  });

  it('очищает Redux user-state и игнорирует старый thunk после account switch', () => {
    const accessB = makeAccessToken(7_200);
    const staleUser = {
      ...currentUser(),
      username: 'stale-user',
      email: 'stale@example.com',
    };

    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'session-a-refresh',
    });
    cy.window().then(async (window) => {
      const [{ store }, { fetchCurrentUser }, { setCurrentUser }] =
        await Promise.all([
          importAutModule<AutStoreModule>(window, '/src/app/index.ts'),
          importAutModule<AutUserActionsModule>(
            window,
            '/src/entities/user/model/actions.ts'
          ),
          importAutModule<AutUserSliceModule>(
            window,
            '/src/entities/user/model/slice.ts'
          ),
        ]);
      store.dispatch(setCurrentUser(staleUser));
      store.dispatch(fetchCurrentUser.pending('old-user-request', undefined));
      expect(store.getState().user.currentUser).to.include({
        username: 'stale-user',
      });
    });

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.window().then(async (window) => {
      const [{ store }, { fetchCurrentUser }] = await Promise.all([
        importAutModule<AutStoreModule>(window, '/src/app/index.ts'),
        importAutModule<AutUserActionsModule>(
          window,
          '/src/entities/user/model/actions.ts'
        ),
      ]);
      expect(store.getState().user.currentUser).to.equal(null);
      expect(store.getState().user.pendingRequestIds).to.deep.equal([]);

      store.dispatch(
        fetchCurrentUser.fulfilled(staleUser, 'old-user-request', undefined)
      );
      expect(store.getState().user.currentUser).to.equal(null);
    });
  });

  it('не восстанавливает A после ошибки persisted-записи при login B', () => {
    const accessA = makeAccessToken(3_600);
    const accessB = makeAccessToken(7_200);
    let restoreSetItem = () => undefined;

    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      body: tokenResponse('second-user', accessB, 'session-b-refresh'),
    }).as('sessionBLogin');

    visitProfile({ access: accessA, refresh: 'session-a-refresh' });
    cy.window().then((window) => {
      const originalSetItem = window.Storage.prototype.setItem;
      const setItemStub = cy
        .stub(window.Storage.prototype, 'setItem')
        .callsFake(function (this: Storage, key: string, value: string) {
          if (key === 'persist:root') {
            throw new DOMException(
              'Storage write failed',
              'QuotaExceededError'
            );
          }
          return originalSetItem.call(this, key, value);
        });
      restoreSetItem = () => setItemStub.restore();
    });

    navigateInApp('/login');
    submitLogin('second-user');
    cy.wait('@sessionBLogin');
    cy.location('pathname').should('eq', '/my-profile');
    cy.window().then(async (window) => {
      const { store } = await importAutModule<AutStoreModule>(
        window,
        '/src/app/index.ts'
      );
      expect(store.getState().auth.accessToken).to.equal(accessB);
      expect(store.getState().auth.refreshToken).to.equal('session-b-refresh');
      expect(store.getState().auth.user).to.include({
        username: 'second-user',
      });
      expect(window.localStorage.getItem('persist:root')).to.equal(null);
    });

    cy.then(() => restoreSetItem());
    cy.reload();
    cy.location('pathname').should('eq', '/login');
    cy.window().then(async (window) => {
      const { store } = await importAutModule<AutStoreModule>(
        window,
        '/src/app/index.ts'
      );
      expect(store.getState().auth.accessToken).to.equal(null);
      expect(store.getState().auth.refreshToken).to.equal(null);
      expect(store.getState().auth.user).to.equal(null);
    });
  });

  it('удаляет persisted auth, если flush storage завершился ошибкой', () => {
    cy.intercept('POST', BLACKLIST_PATTERN, {}).as('blacklist');

    visitProfile({
      access: makeAccessToken(3_600),
      refresh: 'persisted-refresh',
    });
    cy.window().then((window) => {
      const originalSetItem = window.Storage.prototype.setItem;
      cy.stub(window.Storage.prototype, 'setItem').callsFake(function (
        this: Storage,
        key: string,
        value: string
      ) {
        if (key === 'persist:root') {
          throw new DOMException('Storage write failed', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      });
    });

    cy.contains('button', 'Выйти').click();
    cy.wait('@blacklist');
    cy.window().should((window) => {
      expect(window.localStorage.getItem('persist:root')).to.equal(null);
    });
  });

  it('не запускает refresh для неуспешного login без access-токена', () => {
    let refreshRequests = 0;
    cy.intercept('POST', '**/api/v1/auth/token/login/', {
      statusCode: 401,
      body: { detail: 'Invalid credentials' },
    }).as('login');
    cy.intercept('POST', REFRESH_PATTERN, (request) => {
      refreshRequests += 1;
      request.reply({});
    });

    cy.visit('http://localhost:5173/login');
    cy.get('input[name="username"]').type('unknown-user');
    cy.get('input[name="password"]').type('WrongPassword123!');
    cy.contains('button', 'Войти').click();
    cy.wait('@login');
    cy.contains('Не удалось войти. Проверьте логин и пароль.').should(
      'be.visible'
    );
    cy.wrap(null).should(() => expect(refreshRequests).to.equal(0));
  });
});
