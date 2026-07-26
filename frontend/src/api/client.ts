export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// In production (build-time): VITE_API_URL points to the deployed backend root.
// In development: falls back to '/api' which the Vite dev server proxies.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getUrl(url: string): string {
  // Already fully qualified — use as-is.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // BASE_URL is the full base including /api (e.g. '/api' in dev, or
  // 'https://.../server/neural-justice-backend/api' in production).
  // Strip a leading /api prefix from the path if present to avoid
  // double-prefixing when BASE_URL already contains it.
  const path = url.startsWith('/api') ? url.slice(4) : url;
  return `${BASE_URL}${path}`;
}

// Refresh the access token using the refresh token cookie
async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include the refresh token cookie
        headers: {
          'Content-Type': 'application/json',
        },
        // Send empty body - the refresh token comes from the cookie
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        // Refresh failed - clear local tokens
        localStorage.removeItem('auth_token');
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.access_token;
      if (newAccessToken) {
        localStorage.setItem('auth_token', newAccessToken);
        return newAccessToken;
      }
      return null;
    } catch {
      localStorage.removeItem('auth_token');
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  data?: Record<string, any>,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  let url = getUrl(path);

  if (params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    }
    url += `?${query.toString()}`;
  }

  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Include cookies for refresh token
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    // On 401 (except login), attempt to refresh the token and retry once.
    // Skip refresh for the demo sentinel token — it's not a real JWT and
    // the backend has no refresh cookie for it, so refresh would 422 and
    // delete the token, breaking the demo session.
    const isDemoSession = token === 'demo-session';
    if (response.status === 401 && !path.includes('/auth/login') && !isDemoSession) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry the original request with the new token
        const headersWithNewToken: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        };
        const retryResponse = await fetch(url, {
          ...config,
          headers: headersWithNewToken,
        });
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      // Refresh failed or retry failed
      localStorage.removeItem('auth_token');
      throw new ApiError('UNAUTHORIZED', 'Session expired');
    }

    const errorData = await response.json().catch(() => ({}));
    const code = errorData?.error?.code || 'UNKNOWN';
    const message = errorData?.error?.message || errorData?.detail || response.statusText;
    throw new ApiError(code, message, response.status);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => request<T>('POST', path, data, params),
  put: <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => request<T>('PUT', path, data, params),
  patch: <T>(path: string, data?: Record<string, any>, params?: Record<string, string | number | boolean | undefined>) => request<T>('PATCH', path, data, params),
  delete: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => request<T>('DELETE', path, undefined, params),
};