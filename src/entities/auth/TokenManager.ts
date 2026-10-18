import { AUTH } from '@shared/api/constants';
import type {
  AuthUser,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from './types';

const REFRESH_REQUEST_TIMEOUT_MS = 10_000;
const AUTO_REFRESH_RETRY_DELAY_MS = 30_000;

export class TokenRefreshError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'TokenRefreshError';
    this.status = status;
  }

  get isSessionInvalid(): boolean {
    return this.status === 400 || this.status === 401;
  }
}

export class SessionEndedError extends Error {
  constructor() {
    super('Authentication session has ended');
    this.name = 'SessionEndedError';
  }
}

export interface LogoutRefreshState {
  refreshToken: string | null;
  refreshRequest: Promise<TokenRefreshResponse> | null;
}

export class TokenManager {
  private readonly onSessionInvalid: () => void;
  private readonly accessTokenLifetimeMs: number;
  private readonly refreshSafetyMarginMs: number;
  private readonly setAuthData: (
    access: string,
    refresh: string,
    user: AuthUser
  ) => void;
  private readonly selectAccessToken: () => string | null;
  private readonly selectRefreshToken: () => string | null;
  private readonly baseApiUrl: string;

  private refreshInProgress: Promise<TokenRefreshResponse> | null = null;
  private refreshRequestInProgress: Promise<TokenRefreshResponse> | null = null;
  private timerId: number | null = null;
  private sessionVersion = 0;
  private sessionEnding = false;
  private sessionInitialized = false;

  constructor(
    onSessionInvalid: () => void,
    accessTokenLifetimeMs: number,
    refreshSafetyMarginMs: number,
    setAuthData: (access: string, refresh: string, user: AuthUser) => void,
    selectAccessToken: () => string | null,
    selectRefreshToken: () => string | null,
    baseApiUrl: string
  ) {
    this.onSessionInvalid = onSessionInvalid;
    this.accessTokenLifetimeMs = accessTokenLifetimeMs;
    this.refreshSafetyMarginMs = refreshSafetyMarginMs;
    this.setAuthData = setAuthData;
    this.selectAccessToken = selectAccessToken;
    this.selectRefreshToken = selectRefreshToken;
    this.baseApiUrl = baseApiUrl;
  }

  public getAccessToken(): string | null {
    return this.sessionEnding ? null : this.selectAccessToken();
  }

  public isSessionEnding(): boolean {
    return this.sessionEnding;
  }

  public getSessionGeneration(): number {
    return this.sessionVersion;
  }

  public startSession(): void {
    this.sessionVersion += 1;
    this.sessionEnding = false;
    this.sessionInitialized = true;
    this.refreshInProgress = null;
    this.refreshRequestInProgress = null;
    this.stopAutoRefresh();
  }

  public restoreSession(): void {
    if (this.sessionInitialized) return;
    this.sessionInitialized = true;

    if (!this.selectRefreshToken()) {
      this.stopAutoRefresh();
      if (this.selectAccessToken()) this.onSessionInvalid();
      return;
    }

    this.sessionVersion += 1;
    this.sessionEnding = false;
    this.startAutoRefresh();
  }

  public beginLogout(): LogoutRefreshState {
    if (!this.sessionEnding) {
      this.sessionEnding = true;
      this.sessionVersion += 1;
      this.stopAutoRefresh();
    }

    return {
      refreshToken: this.selectRefreshToken(),
      refreshRequest: this.refreshRequestInProgress,
    };
  }

  public async ensureValidToken(): Promise<string | null> {
    if (this.sessionEnding) throw new SessionEndedError();

    const access = this.selectAccessToken();
    if (access && !this.shouldRefreshAccessToken(access)) return access;

    if (!this.selectRefreshToken()) {
      throw new TokenRefreshError('No refresh token available', 401);
    }

    await this.refreshTokens();
    return this.getRequiredAccessToken();
  }

  public async forceRefresh(): Promise<string> {
    if (this.sessionEnding) throw new SessionEndedError();
    if (!this.selectRefreshToken()) {
      throw new TokenRefreshError('No refresh token available', 401);
    }

    await this.refreshTokens();
    return this.getRequiredAccessToken();
  }

  public startAutoRefresh(delayOverrideMs?: number): void {
    if (
      this.timerId !== null ||
      this.sessionEnding ||
      !this.selectRefreshToken()
    ) {
      return;
    }

    const access = this.selectAccessToken();
    const delay =
      delayOverrideMs ??
      (access ? this.getAutoRefreshDelay(access, Date.now()) : 0);

    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      void this.runAutoRefresh();
    }, delay);
  }

  public stopAutoRefresh(): void {
    if (this.timerId === null) return;

    window.clearTimeout(this.timerId);
    this.timerId = null;
  }

  private refreshTokens(): Promise<TokenRefreshResponse> {
    if (this.sessionEnding) {
      return Promise.reject(new SessionEndedError());
    }

    if (this.refreshInProgress) return this.refreshInProgress;

    const refreshToken = this.selectRefreshToken();
    if (!refreshToken) {
      return Promise.reject(
        new TokenRefreshError('No refresh token available', 401)
      );
    }

    const sessionVersion = this.sessionVersion;
    const refreshRequest = this.requestTokenRefresh(refreshToken);
    this.refreshRequestInProgress = refreshRequest;

    const refresh = refreshRequest.then(
      (result) => {
        if (this.sessionEnding || sessionVersion !== this.sessionVersion) {
          throw new SessionEndedError();
        }

        this.setAuthData(result.access, result.refresh, result.user);
        this.stopAutoRefresh();
        this.startAutoRefresh();
        return result;
      },
      (error: unknown) => {
        if (this.sessionEnding || sessionVersion !== this.sessionVersion) {
          throw new SessionEndedError();
        }

        throw error;
      }
    );

    this.refreshInProgress = refresh;
    void refresh.then(
      () => this.clearRefreshPromises(refresh, refreshRequest),
      () => this.clearRefreshPromises(refresh, refreshRequest)
    );

    return refresh;
  }

  private clearRefreshPromises(
    refresh: Promise<TokenRefreshResponse>,
    refreshRequest: Promise<TokenRefreshResponse>
  ): void {
    if (this.refreshInProgress === refresh) this.refreshInProgress = null;
    if (this.refreshRequestInProgress === refreshRequest) {
      this.refreshRequestInProgress = null;
    }
  }

  private async requestTokenRefresh(
    refreshToken: string
  ): Promise<TokenRefreshResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      REFRESH_REQUEST_TIMEOUT_MS
    );
    const data: TokenRefreshRequest = { refresh: refreshToken };

    try {
      const response = await fetch(`${this.baseApiUrl}${AUTH}refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseData: unknown = await response.json().catch(() => null);
        const message =
          this.getErrorMessage(responseData) ?? response.statusText;
        throw new TokenRefreshError(
          `Refresh failed with status ${response.status}: ${message}`,
          response.status
        );
      }

      return (await response.json()) as TokenRefreshResponse;
    } catch (error) {
      if (error instanceof TokenRefreshError) throw error;

      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Refresh request timed out'
          : 'Refresh request failed because of a network error';
      throw new TokenRefreshError(message);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async runAutoRefresh(): Promise<void> {
    if (this.sessionEnding || !this.selectRefreshToken()) return;

    const sessionVersion = this.sessionVersion;

    try {
      await this.refreshTokens();
    } catch (error) {
      if (
        this.sessionEnding ||
        sessionVersion !== this.sessionVersion ||
        error instanceof SessionEndedError
      ) {
        return;
      }

      if (error instanceof TokenRefreshError && error.isSessionInvalid) {
        this.onSessionInvalid();
        return;
      }

      console.error(error);
      this.startAutoRefresh(AUTO_REFRESH_RETRY_DELAY_MS);
    }
  }

  private getRequiredAccessToken(): string {
    const access = this.getAccessToken();
    if (!access) throw new SessionEndedError();
    return access;
  }

  private shouldRefreshAccessToken(accessToken: string): boolean {
    const expirationMs = this.getAccessTokenExpirationMs(accessToken);
    if (expirationMs === null) return false;
    return expirationMs - Date.now() <= this.refreshSafetyMarginMs;
  }

  private getAutoRefreshDelay(
    accessToken: string | null,
    nowMs: number
  ): number {
    const expirationMs = accessToken
      ? this.getAccessTokenExpirationMs(accessToken)
      : null;

    if (expirationMs === null) {
      return Math.max(
        0,
        this.accessTokenLifetimeMs - this.refreshSafetyMarginMs
      );
    }

    return Math.max(0, expirationMs - nowMs - this.refreshSafetyMarginMs);
  }

  private getAccessTokenExpirationMs(accessToken: string): number | null {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;

    try {
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const decodedPayload: unknown = JSON.parse(
        window.atob(normalizedPayload)
      );

      if (
        !decodedPayload ||
        typeof decodedPayload !== 'object' ||
        typeof (decodedPayload as { exp?: unknown }).exp !== 'number'
      ) {
        return null;
      }

      return (decodedPayload as { exp: number }).exp * 1000;
    } catch {
      return null;
    }
  }

  private getErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;

    const record = data as Record<string, unknown>;
    const message = record.error ?? record.detail;
    return typeof message === 'string' ? message : null;
  }
}
