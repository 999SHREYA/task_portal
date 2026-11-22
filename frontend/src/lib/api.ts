// The ONLY place that talks to the backend.
//  - Adds the access token to every request.
//  - On a 401, refreshes the token once and retries the request.
//
// The access token lives in memory only (not localStorage), so an XSS
// attack can't steal a long-lived token. The refresh token is an httpOnly
// cookie the browser sends automatically to /api/auth/*.
import type { User } from './types';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: FieldError[] = []
  ) {
    super(message);
  }
}

type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

let accessToken: string | null = null;
let onSessionExpired: () => void = () => {};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// AuthContext registers a callback so we can log the user out.
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ''}`;
}

// Only one refresh request at a time. Refresh tokens are rotated (each one
// works once), so two parallel refreshes would log the user out.
let refreshPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

export function refreshSession() {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null;
      const body = await res.json();
      setAccessToken(body.data.accessToken);
      return body.data as { user: User; accessToken: string };
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
}

async function request<T>(path: string, { method = 'GET', query, body }: RequestOptions = {}, isRetry = false): Promise<T> {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'include',
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  // Access token expired? Refresh once, then retry the same request.
  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) return request<T>(path, { method, query, body }, true);
    onSessionExpired();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Request failed (${res.status})`, res.status, data?.error?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};
