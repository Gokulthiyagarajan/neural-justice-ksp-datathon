import { create } from 'zustand';
import { api } from '@/api/client';
import type { User } from '@/types';

interface GoogleAuthPayload {
  id_token?: string;
  access_token?: string;
  email?: string;
  name?: string;
  google_user_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<void>;
  /** Login with a backend-issued token and user data (used after real MFA verification). */
  loginWithBackendToken: (accessToken: string, user: User) => void;
  loginMock: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  /** Update the current user's profile fields (name, photo, etc.) and persist. */
  updateProfile: (updates: Partial<Pick<User, 'name' | 'profile_picture'>>) => void;
}

// Sentinel token used by the local demo / mock login flow. It is persisted to
// localStorage so the session survives page refresh, new tabs, and browser
// restart — exactly like a real JWT would. It is intentionally NOT a valid
// backend JWT, so checkAuth() recognizes it locally instead of calling /me.
export const DEMO_TOKEN = 'demo-session';

function isDemoToken(token: string | null): boolean {
  return token === DEMO_TOKEN;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const res = await api.post<{
      access_token: string;
      user: User;
    }>('/api/auth/login', { username, password });

    localStorage.setItem('auth_token', res.access_token);
    set({
      user: res.user,
      token: res.access_token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Continue with local logout even if server call fails
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loginWithGoogle: async (payload: GoogleAuthPayload) => {
    const res = await api.post<{
      access_token: string;
      user: User;
      is_new_user: boolean;
    }>('/api/auth/google', payload);

    localStorage.setItem('auth_token', res.access_token);
    set({
      user: res.user,
      token: res.access_token,
      isAuthenticated: true,
    });
  },

  /** Login with a backend-issued token and user data (used after real MFA verification). */
  loginWithBackendToken: (accessToken: string, user: User) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
  },

  loginMock: (user: User) => {
    // Local demo / mock auth. Persist a sentinel token to localStorage so the
    // session survives refresh, new tabs, and browser restart (previously this
    // was in-memory only, which caused an unwanted redirect to /login on every
    // page reload). The token is verified locally by checkAuth() — it is not a
    // real backend JWT. Also persist the user object so roles survive refresh.
    localStorage.setItem('auth_token', DEMO_TOKEN);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token: DEMO_TOKEN, isAuthenticated: true, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    // Demo / mock session: validate locally (no backend call needed or possible,
    // since the sentinel is not a real JWT). Restores the session from storage
    // so the user stays on the current route across refresh / new tab.
    if (isDemoToken(token)) {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          set({ user: JSON.parse(storedUser), isAuthenticated: true, isLoading: false });
        } catch {
          set({ isAuthenticated: true, isLoading: false });
        }
      } else {
        set({ isAuthenticated: true, isLoading: false });
      }
      return;
    }

    // Real backend session: verify the JWT by fetching the current user.
    try {
      const user = await api.get<User>('/api/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      console.error('[Auth] JWT verification failed:', err);
      localStorage.removeItem('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: (updates) => {
    const current = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const merged = { ...current, ...updates };
    localStorage.setItem('auth_user', JSON.stringify(merged));
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : null }));
  },
}));
