import type { AuthService } from '@entities/auth';

export class Api {
  readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private authService?: AuthService;

  constructor(
    baseUrl: string,
    options: { headers?: Record<string, string> } = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  setAuthService(authService: AuthService): void {
    this.authService = authService;
  }

  private getErrorMessage(data: unknown): string | null {
    if (typeof data === 'string') return data;

    if (Array.isArray(data)) {
      for (const item of data) {
        const message = this.getErrorMessage(item);
        if (message) return message;
      }
      return null;
    }

    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      for (const key of ['error', 'detail', ...Object.keys(record)]) {
        if (!(key in record)) continue;
        const message = this.getErrorMessage(record[key]);
        if (message) return message;
      }
    }

    return null;
  }

  protected async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204) return undefined as unknown as T;
      return await response.json();
    }
    const data: unknown = await response.json().catch(() => null);
    const message = this.getErrorMessage(data) ?? response.statusText;
    throw new Error(
      `Request failed with status ${response.status}: ${message}`
    );
  }

  protected async request<T>(
    uri: string,
    method: string,
    data?: object,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const queryString = params
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';

    const doFetch = async (token: string | null): Promise<Response> => {
      const headers: Record<string, string> = { ...this.defaultHeaders };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const config: RequestInit = { method, headers };
      if (data) config.body = JSON.stringify(data);
      return fetch(this.baseUrl + uri + queryString, config);
    };

    let token: string | null = null;
    if (this.authService) {
      token = this.authService.getAccessToken();
    }

    let response = await doFetch(token);

    if (response.status === 401 && this.authService) {
      await this.authService.forceRefresh();
      token = this.authService.getAccessToken();
      response = await doFetch(token);
    }

    return this.handleResponse<T>(response);
  }

  get<T>(uri: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>(uri, 'GET', undefined, params);
  }

  post<T>(uri: string, data?: object) {
    return this.request<T>(uri, 'POST', data);
  }

  put<T>(uri: string, data: object) {
    return this.request<T>(uri, 'PUT', data);
  }

  patch<T>(uri: string, data: object) {
    return this.request<T>(uri, 'PATCH', data);
  }

  delete<T>(uri: string) {
    return this.request<T>(uri, 'DELETE');
  }
}
