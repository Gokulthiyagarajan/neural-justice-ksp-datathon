import { useAuthStore } from '@/store/authStore';
import type { KSPRole } from '@/config/navConfig';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  /** Case-insensitive role check — matches both old lowercase and new UPPERCASE sessions. */
  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    const normalized = roles.map((r) => r.toUpperCase());
    return user.roles.some((r) => normalized.includes(r.toUpperCase()));
  };

  /** Get the user's primary role as a KSPRole, defaulting to OFFICER. */
  const getPrimaryRole = (): KSPRole => {
    const raw = user?.roles?.[0] ?? 'OFFICER';
    return raw.toUpperCase() as KSPRole;
  };

  return { user, isAuthenticated, isLoading, login, loginWithGoogle, logout, updateProfile, hasRole, getPrimaryRole };
}
