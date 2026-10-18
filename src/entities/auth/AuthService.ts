import { persistor, store } from '@app/store';
import { resetUserState } from '@entities/user/model/slice';
import { logout, setAuthData } from '@features/auth/model/authSlice';
import type { Api } from '@shared/api/api.class';
import { AUTH } from '@shared/api/constants';
import {
  TokenRefreshError,
  type LogoutRefreshState,
  type TokenManager,
} from './TokenManager';
import type { TokenLoginRequest, TokenPairResponse } from './types';

const BLACKLIST_REQUEST_TIMEOUT_MS = 5_000;
const REFRESH_LOGOUT_WAIT_TIMEOUT_MS = 10_500;

export class StaleLoginError extends Error {
  constructor() {
    super('Login result belongs to an outdated session');
    this.name = 'StaleLoginError';
  }
}

export interface AuthOperation {
  readonly id: number;
  readonly sessionGeneration: number;
}

export class AuthService {
  private readonly api: Api;
  private readonly tokenManager: TokenManager;
  private readonly clearCachedState: () => void;
  private logoutPromise: Promise<void> | null = null;
  private persistCleanupPromise: Promise<void> | null = null;
  private latestLoginAttempt = 0;

  constructor(
    api: Api,
    tokenManager: TokenManager,
    clearCachedState: () => void = () => undefined
  ) {
    this.api = api;
    this.tokenManager = tokenManager;
    this.clearCachedState = clearCachedState;
  }

  async login(
    data: TokenLoginRequest,
    operation?: AuthOperation
  ): Promise<TokenPairResponse> {
    const loginOperation = operation ?? this.beginAuthOperation();
    const activeLogout = this.logoutPromise;
    if (activeLogout) await activeLogout;

    this.assertAuthOperationCurrent(loginOperation);

    const response = await this.api.post<TokenPairResponse>(
      `${AUTH}login/`,
      data
    );

    this.assertAuthOperationCurrent(loginOperation);
    await this.commitLogin(response, loginOperation);
    return response;
  }

  beginAuthOperation(): AuthOperation {
    return {
      id: ++this.latestLoginAttempt,
      sessionGeneration: this.tokenManager.getSessionGeneration(),
    };
  }

  isAuthOperationCurrent(operation: AuthOperation): boolean {
    return (
      operation.id === this.latestLoginAttempt &&
      operation.sessionGeneration === this.tokenManager.getSessionGeneration()
    );
  }

  async forceRefresh(): Promise<void> {
    const sessionGeneration = this.tokenManager.getSessionGeneration();

    try {
      await this.tokenManager.forceRefresh();
    } catch (error) {
      if (
        error instanceof TokenRefreshError &&
        error.isSessionInvalid &&
        sessionGeneration === this.tokenManager.getSessionGeneration()
      ) {
        await this.logout();
      }
      throw error;
    }
  }

  async refresh(): Promise<void> {
    await this.ensureValidToken();
  }

  restoreSession(): void {
    this.tokenManager.restoreSession();
  }

  isSessionEnding(): boolean {
    return this.tokenManager.isSessionEnding();
  }

  logout(): Promise<void> {
    if (this.logoutPromise) return this.logoutPromise;

    this.latestLoginAttempt += 1;
    const refreshState = this.tokenManager.beginLogout();
    store.dispatch(logout());
    store.dispatch(resetUserState());
    this.clearCachedState();

    const persistCleanup = this.ensurePersistedAuthCleared();
    const logoutOperation = this.finishLogout(refreshState, persistCleanup);
    this.logoutPromise = logoutOperation;
    void logoutOperation.then(
      () => this.clearLogoutPromise(logoutOperation),
      () => this.clearLogoutPromise(logoutOperation)
    );
    return logoutOperation;
  }

  getAccessToken(): string | null {
    return this.tokenManager.getAccessToken();
  }

  getSessionGeneration(): number {
    return this.tokenManager.getSessionGeneration();
  }

  async ensureValidToken(): Promise<string | null> {
    const sessionGeneration = this.tokenManager.getSessionGeneration();

    try {
      return await this.tokenManager.ensureValidToken();
    } catch (error) {
      if (
        error instanceof TokenRefreshError &&
        error.isSessionInvalid &&
        sessionGeneration === this.tokenManager.getSessionGeneration()
      ) {
        await this.logout();
      }
      throw error;
    }
  }

  private async finishLogout(
    refreshState: LogoutRefreshState,
    persistCleanup: Promise<unknown>
  ): Promise<void> {
    let refreshToBlacklist = refreshState.refreshToken;

    if (refreshState.refreshRequest) {
      try {
        const result = await this.withTimeout(
          refreshState.refreshRequest,
          REFRESH_LOGOUT_WAIT_TIMEOUT_MS
        );
        refreshToBlacklist = result.refresh;
      } catch {
        // The locally captured token is still the best available revoke target.
      }
    }

    if (refreshToBlacklist) {
      await this.blacklistRefreshToken(refreshToBlacklist);
    }

    await persistCleanup;
  }

  private clearLogoutPromise(logoutOperation: Promise<void>): void {
    if (this.logoutPromise === logoutOperation) this.logoutPromise = null;
  }

  private async commitLogin(
    response: TokenPairResponse,
    operation: AuthOperation
  ): Promise<void> {
    await this.waitForPersistCleanup();
    this.assertAuthOperationCurrent(operation);

    const replacesSession = this.hasAuthState();
    store.dispatch(resetUserState());
    this.clearCachedState();

    this.tokenManager.startSession();
    const sessionGeneration = this.tokenManager.getSessionGeneration();

    if (replacesSession) {
      store.dispatch(logout());
      await this.ensurePersistedAuthCleared();

      if (
        operation.id !== this.latestLoginAttempt ||
        sessionGeneration !== this.tokenManager.getSessionGeneration()
      ) {
        throw new StaleLoginError();
      }
    }

    store.dispatch(setAuthData(response));
    this.tokenManager.startAutoRefresh();
  }

  private hasAuthState(): boolean {
    const { accessToken, refreshToken, user } = store.getState().auth;
    return Boolean(accessToken || refreshToken || user);
  }

  private assertAuthOperationCurrent(operation: AuthOperation): void {
    if (!this.isAuthOperationCurrent(operation)) throw new StaleLoginError();
  }

  private async waitForPersistCleanup(): Promise<void> {
    if (this.persistCleanupPromise) await this.persistCleanupPromise;
  }

  private ensurePersistedAuthCleared(): Promise<void> {
    if (this.persistCleanupPromise) return this.persistCleanupPromise;

    const cleanup = this.clearPersistedAuth();
    this.persistCleanupPromise = cleanup;
    void cleanup.then(
      () => this.clearPersistCleanupPromise(cleanup),
      () => this.clearPersistCleanupPromise(cleanup)
    );
    return cleanup;
  }

  private clearPersistCleanupPromise(cleanup: Promise<void>): void {
    if (this.persistCleanupPromise === cleanup) {
      this.persistCleanupPromise = null;
    }
  }

  private async clearPersistedAuth(): Promise<void> {
    try {
      await persistor.flush();
    } catch {
      // Purge below is the fallback when writing the cleared state failed.
    }

    try {
      await persistor.purge();
      return;
    } catch {
      // Redux Persist can fail together with the configured storage adapter.
    }

    try {
      window.localStorage.removeItem('persist:root');
    } catch {
      // In-memory auth is already cleared; storage may be unavailable entirely.
    }
  }

  private async blacklistRefreshToken(refresh: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      BLACKLIST_REQUEST_TIMEOUT_MS
    );

    try {
      await fetch(`${this.api.baseUrl}${AUTH}blacklist/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
        signal: controller.signal,
      });
    } catch {
      // Logout is local-first; blacklist failures must never restore the session.
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timeoutId: number | null = null;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Operation timed out')),
            timeoutMs
          );
        }),
      ]);
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }
}
