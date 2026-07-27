import { useState, useCallback } from 'react';
import { api } from '@/api/client';
import { DEMO_TOKEN } from '@/store/authStore';
import type { KSPRole } from '@/config/navConfig';
import {
  MOCK_USERNAME,
  MOCK_PASSWORD,
  MOCK_TOTP_CODE,
  MOCK_OFFICER_NAME,
  ROLE_OFFICER_NAMES,
  MAX_LOGIN_ATTEMPTS,
} from '../constants/mockCredentials';
import {
  buildOTPAuthURI,
  verifyTOTPCode,
  storeTOTPSecret,
  getStoredTOTPSecret,
  hasTOTPEnrolled,
} from '../utils/totp';

export type LoginStep =
  | 'landing'
  | 'role-select'
  | 'credentials'
  | 'totp'           // Legacy mock TOTP (kept for fallback)
  | 'mfa-enroll'     // Real TOTP: first-time enrollment (QR code)
  | 'mfa-verify'     // Real TOTP: returning user verification
  | 'audit-gate'
  | 'dashboard-load';

/** Backend response when MFA is required */
interface MFAResponse {
  mfa_required: boolean;
  mfa_token: string;
  totp_setup: boolean;        // true = enrollment, false = verify
  totp_secret?: string;       // enrollment only
  totp_uri?: string;          // enrollment only
  user_hint?: {
    id: string;
    username: string;
    roles: string[];
    district_id?: string;
    station_id?: string;
  };
}

/** Backend response for direct token (exempt user or demo fallback) */
interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  mfa_required?: boolean;
  user?: {
    id: string;
    username: string;
    roles: string[];
    district_id?: string;
    station_id?: string;
  };
}

export interface LoginState {
  step: LoginStep;
  selectedRole: KSPRole | null;
  username: string;
  sessionId: string;
  credentialAttempts: number;
  totpAttempts: number;
  isLocked: boolean;
  // MFA state
  mfaToken: string;
  totpUri: string;
  totpSecret: string;
  totpSetup: boolean;
  loginAttempts: number;       // how many credential submissions have been attempted
  // MFA user data from backend
  mfaUser: {
    id: string;
    username: string;
    roles: string[];
    district_id?: string;
    station_id?: string;
  } | null;
}

export function useLoginState() {
  const [state, setState] = useState<LoginState>({
    step: 'landing',
    selectedRole: null,
    username: '',
    sessionId: '',
    credentialAttempts: 0,
    totpAttempts: 0,
    isLocked: false,
    mfaToken: '',
    totpUri: '',
    totpSecret: '',
    totpSetup: false,
    loginAttempts: 0,
    mfaUser: null,
  });

  const goToStep = useCallback((step: LoginStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const selectRole = useCallback(
    (role: KSPRole | null) => {
      // Clear any stale auth token/user from a previous session so the new
      // login flow starts fresh — prevents the old role from leaking into
      // the DashboardLoad completion callback.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      setState((prev) => ({
        ...prev,
        selectedRole: role,
        // Clear MFA/TOTP state when role changes — prevents stale enrollment
        // data from a previously selected role leaking into the new role's flow.
        totpUri: '',
        totpSecret: '',
        mfaToken: '',
        totpSetup: false,
        credentialAttempts: 0,
        totpAttempts: 0,
      }));
    },
    []
  );

  const generateSessionId = useCallback(() => {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 5; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `KSP-${year}-BLR-${random}`;
  }, []);

  /**
   * Submit credentials to the real backend. Returns:
   *  - 'mfa-enroll' if first-time MFA setup is needed
   *  - 'mfa-verify' if TOTP verification is needed
   *  - 'audit-gate' if user is exempt or demo fallback succeeded
   *  - null on failure (caller shows error)
   *
   * IMPORTANT: Demo credentials (admin/test123) ALWAYS go through the mock
   * TOTP flow so the frontend-selected role is respected. The real backend
   * does not know about the role selector, so its response would overwrite
   * the selected role (typically defaulting to SUPER_ADMIN/CP).
   */
  const verifyCredentials = useCallback(
    async (username: string, password: string): Promise<'totp' | 'mfa-enroll' | 'mfa-verify' | 'audit-gate' | null> => {
      // ── DEMO CREDENTIALS CHECK — ALWAYS TAKES PRIORITY ─────────────
      // When admin/test123 is entered, immediately use the mock TOTP flow
      // with the frontend-selected role. This prevents the real backend
      // from returning a default user object that overwrites the role.
      if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
        if (hasTOTPEnrolled(username, state.selectedRole)) {
          const stored = getStoredTOTPSecret(username, state.selectedRole);
          setState((prev) => ({
            ...prev,
            username,
            credentialAttempts: 0,
            mfaToken: 'demo-mfa-token',
            totpSecret: stored || '',
            totpSetup: false,
          }));
          return 'mfa-verify';
        }
        // First-time login for this role — use the documented demo TOTP secret
        // so codes remain consistent across sessions and match the README docs.
        const secret = 'JBSWY3DPEHPK3PXP';
        const uri = buildOTPAuthURI(secret, username, 'NeuralJustice', state.selectedRole);
        setState((prev) => ({
          ...prev,
          username,
          credentialAttempts: 0,
          mfaToken: 'demo-mfa-token',
          totpSecret: secret,
          totpUri: uri,
          totpSetup: true,
        }));
        return 'mfa-enroll';
      }

      // ── REAL BACKEND PATH (non-demo credentials) ─────────────────
      try {
        const res = await api.post<TokenResponse | MFAResponse>('/api/auth/login', {
          username,
          password,
        });

        const data = res as MFAResponse;

        // Check if MFA is required
        if (data.mfa_required) {
          setState((prev) => ({
            ...prev,
            username,
            mfaToken: data.mfa_token,
            totpUri: data.totp_uri || '',
            totpSecret: data.totp_secret || '',
            totpSetup: data.totp_setup,
            credentialAttempts: 0,
            mfaUser: data.user_hint || null,
          }));
          return data.totp_setup ? 'mfa-enroll' : 'mfa-verify';
        }

        // Direct token (exempt user)
        const tokenData = res as TokenResponse;
        if (tokenData.access_token && tokenData.access_token !== DEMO_TOKEN) {
          localStorage.setItem('auth_token', tokenData.access_token);
        }
        if (tokenData.user) {
          const userObj = {
            id: tokenData.user.id,
            username: tokenData.user.username,
            roles: tokenData.user.roles,
            district_id: tokenData.user.district_id,
            station_id: tokenData.user.station_id,
          };
          localStorage.setItem('auth_user', JSON.stringify(userObj));
          setState((prev) => ({ ...prev, mfaUser: userObj }));
        }

        setState((prev) => ({
          ...prev,
          username,
          credentialAttempts: 0,
        }));
        return 'audit-gate';
      } catch (err: any) {
        // 401 = invalid credentials
        if (err?.statusCode === 401) {
          const newAttempts = state.credentialAttempts + 1;
          const locked = newAttempts >= MAX_LOGIN_ATTEMPTS;
          setState((prev) => ({
            ...prev,
            credentialAttempts: newAttempts,
            isLocked: locked,
          }));
          return null;
        }
        // Non-401 error (backend down, network, etc.)
        return null;
      }
    },
    [state.credentialAttempts, state.selectedRole, generateSessionId]
  );

  /**
   * Submit TOTP code to the backend for MFA verification.
   * Falls back to client-side TOTP verification when backend is unavailable.
   * On successful enrollment, stores the secret so subsequent logins use mfa-verify.
   */
  const verifyMFACode = useCallback(
    async (mfaToken: string, totpCode: string, isEnrollment: boolean): Promise<boolean> => {
      try {
        // Try real backend first
        const res = await api.post<{
          access_token: string;
          refresh_token?: string;
          user?: { id: string; username: string; roles: string[]; district_id?: string; station_id?: string };
        }>('/api/auth/verify-mfa', {
          mfa_token: mfaToken,
          totp_code: totpCode,
          is_enrollment: isEnrollment,
        });

        if (res.access_token) {
          localStorage.setItem('auth_token', res.access_token);
          if (res.user) {
            const userObj = {
              id: res.user.id,
              username: res.user.username,
              roles: res.user.roles,
              district_id: res.user.district_id,
              station_id: res.user.station_id,
            };
            localStorage.setItem('auth_user', JSON.stringify(userObj));
            setState((prev) => ({ ...prev, mfaUser: userObj, totpAttempts: 0 }));
          }
          // Store secret if enrollment (keyed by username+selectedRole so each role gets its own)
          if (isEnrollment && state.totpSecret) {
            storeTOTPSecret(state.username || 'admin', state.totpSecret, state.selectedRole);
          }
          return true;
        }
        return false;
      } catch {
        // Backend unavailable (session expired, wrong endpoint, etc.)
        // Use client-side TOTP verification as fallback.
        const secret = isEnrollment
          ? state.totpSecret
          : getStoredTOTPSecret(state.username || 'admin', state.selectedRole);

        if (!secret) {
          setState((prev) => ({
            ...prev,
            totpAttempts: prev.totpAttempts + 1,
          }));
          return false;
        }

        // Accept the documented demo TOTP fallback code (123456) for admin/test123
        const isDemoAccount =
          state.username === 'admin' && secret === 'JBSWY3DPEHPK3PXP';
        const isValid =
          isDemoAccount && totpCode === '123456'
            ? true
            : verifyTOTPCode(secret, totpCode);

        if (isValid) {
          // On successful enrollment, persist the secret (keyed by username+selectedRole)
          if (isEnrollment) {
            storeTOTPSecret(state.username || 'admin', secret, state.selectedRole);
          }
          setState((prev) => ({
            ...prev,
            totpAttempts: 0,
            mfaUser: prev.mfaUser || {
              id: state.username || 'admin',
              username: state.username || 'admin',
              roles: [state.selectedRole ?? 'OFFICER'],
            },
          }));
          return true;
        }

        setState((prev) => ({
          ...prev,
          totpAttempts: prev.totpAttempts + 1,
        }));
        return false;
      }
    },
    [state.totpSecret, state.username, state.selectedRole, state.totpAttempts]
  );

  /**
   * Legacy mock TOTP verification (kept for fallback demo path).
   */
  const verifyTOTP = useCallback(
    (code: string): boolean => {
      const isValid = code === MOCK_TOTP_CODE;

      if (!isValid) {
        const newAttempts = state.totpAttempts + 1;
        const locked = newAttempts >= MAX_LOGIN_ATTEMPTS;
        setState((prev) => ({
          ...prev,
          totpAttempts: newAttempts,
          isLocked: locked,
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        totpAttempts: 0,
      }));
      return true;
    },
    [state.totpAttempts]
  );

  const resetLockout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLocked: false,
      credentialAttempts: 0,
      totpAttempts: 0,
    }));
  }, []);

  return {
    step: state.step,
    role: state.selectedRole,
    username: state.username,
    officerName: state.selectedRole
      ? (ROLE_OFFICER_NAMES[state.selectedRole] || MOCK_OFFICER_NAME)
      : MOCK_OFFICER_NAME,
    isLocked: state.isLocked,
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - state.credentialAttempts,
    // MFA state
    mfaToken: state.mfaToken,
    totpUri: state.totpUri,
    totpSecret: state.totpSecret,
    totpSetup: state.totpSetup,
    // Actions
    goToStep,
    selectRole,
    generateSessionId,
    verifyCredentials,
    verifyMFACode,
    verifyTOTP,      // legacy mock fallback
    resetLockout,
  };
}
