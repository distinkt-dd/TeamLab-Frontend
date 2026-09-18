import type { RootState } from '@app';
import { AuthService } from '@entities/auth/AuthService';
import { TokenManager } from '@entities/auth/TokenManager';
import type { AuthUser } from '@entities/auth/types';
import { logout, setAuthData } from '@features/auth/model/authSlice';
import {
  selectAccessToken,
  selectRefreshToken,
} from '@features/auth/model/selectors';
import type { Store } from '@reduxjs/toolkit';
import { Api } from '@shared/api/api.class';

interface Services {
  api: Api;
  auth: AuthService;
}

let services: Services | null = null;
let tokenManagerInstance: TokenManager | null = null;

const normalizeApiBaseUrl = (url: string): string => {
  const trimmedUrl = url.replace(/\/+$/, '');
  return trimmedUrl.endsWith('/api/v1') ? trimmedUrl : `${trimmedUrl}/api/v1`;
};

export function initServices(store: Store<RootState>): Services {
  if (tokenManagerInstance) {
    tokenManagerInstance.stopAutoRefresh();
  }

  const configuredBaseUrl =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    'http://localhost:8000';
  const baseUrl = normalizeApiBaseUrl(configuredBaseUrl);
  const api = new Api(baseUrl);

  const tokenManager = new TokenManager(
    () => {
      tokenManager.stopAutoRefresh();
      store.dispatch(logout());
      window.location.href = '/login';
    },
    7_200_000,
    5 * 60 * 1000,
    (access: string, refresh: string, user: AuthUser) =>
      store.dispatch(setAuthData({ access, refresh, user })),
    () => selectAccessToken(store.getState()),
    () => selectRefreshToken(store.getState()),
    baseUrl
  );

  tokenManagerInstance = tokenManager;

  const auth = new AuthService(api, tokenManager);
  api.setAuthService(auth);

  services = { api, auth };
  return services;
}

export function getServices(): Services {
  if (!services) {
    throw new Error('Сервисы не инициализированы.');
  }
  return services;
}
