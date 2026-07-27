// DEMO ONLY — these constants are used exclusively in development/demo mode.
// They are compiled into the bundle; do NOT use real credentials here.
// In production builds, the login flow must call the real /api/auth/login
// endpoint; these values are never sent to a live credential store.
// Gate: VITE_DEMO_MODE must be "true" (set in .env.local) to activate
// the one-click auto-fill path (auto-fills rank cards with demo credentials).

export const MOCK_USERNAME = 'admin';
export const MOCK_PASSWORD = 'test123';
export const MOCK_TOTP_CODE = '123456';
export const MOCK_OFFICER_NAME = 'KSP Officer';

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MINUTES = 30;

/** Role-based officer display names for the login flow. */
export const ROLE_OFFICER_NAMES: Record<string, string> = {
  SUPER_ADMIN: 'Commissioner Kumaraswamy',
  SUPERVISOR: 'SP Nagaraj',
  INVESTIGATOR: 'Inspector Venkatesh',
  ANALYST: 'PSI Shyamala',
  OFFICER: 'PC Rajan',
};