import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Landing } from './screens/Landing';
import { RoleSelect } from './screens/RoleSelect';
import { Credentials } from './screens/Credentials';
import { TOTP } from './screens/TOTP';
import { MFAEnroll } from './screens/MFAEnroll';
import { MFAVerify } from './screens/MFAVerify';
import { AuditGate } from './screens/AuditGate';
import { DashboardLoad } from './screens/DashboardLoad';
import { useLoginState } from './hooks/useLoginState';
import { ROLE_CONFIGS } from './constants/roleConfig';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { JURISDICTION_BY_ROLE } from '@/constants/jurisdiction';

const roleTitle = (value: string | null) =>
  ROLE_CONFIGS.find((r) => r.value === value)?.title ?? '';

export function LoginFlow() {
  const login = useLoginState();
  const navigate = useNavigate();
  const loginMock = useAuthStore((s) => s.loginMock);
  const loginWithBackendToken = useAuthStore((s) => s.loginWithBackendToken);
  const [sessionId, setSessionId] = useState('');
  const [credentialError, setCredentialError] = useState('');

  const selectedRoleTitle = roleTitle(login.role);

  /** Resolve jurisdiction basics for a role key (handles multiple conventions). */
  const jurisdictionForRole = (roleKey: string) => {
    return JURISDICTION_BY_ROLE[roleKey] || JURISDICTION_BY_ROLE.OFFICER;
  };

  /** Handle credential submission — calls real backend, routes to MFA or audit gate */
  const handleCredentialSubmit = async (username: string, password: string) => {
    setCredentialError('');

    try {
      const nextStep = await login.verifyCredentials(username, password);

      if (nextStep === null) {
        // Invalid credentials — show error
        const remaining = login.attemptsRemaining - 1;
        if (remaining > 0) {
          setCredentialError(`Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        } else {
          setCredentialError('Account temporarily locked. Contact your District IT Supervisor.');
        }
        return;
      }

      // Success — navigate to the appropriate step
      setSessionId(login.generateSessionId());
      login.goToStep(nextStep);
    } catch {
      setCredentialError('Unable to connect to the authentication service. Try again.');
    }
  };

  /** Handle MFA code verification (enrollment or verify) */
  const handleMFAVerify = async (mfaToken: string, totpCode: string, isEnrollment: boolean) => {
    const ok = await login.verifyMFACode(mfaToken, totpCode, isEnrollment);
    return ok;
  };

  const buildMockUser = (roleKey: string) => {
    const j = jurisdictionForRole(roleKey);
    return {
      id: sessionId,
      username: login.username || login.officerName,
      roles: [roleKey],
      district_id: j.district_id ?? undefined,
      station_id: j.station_id ?? undefined,
      jurisdiction_type: j.jurisdiction_type,
    };
  };

  const stepContent = useMemo(() => {
    switch (login.step) {
      case 'landing':
        return <Landing onNext={() => login.goToStep('role-select')} />;
      case 'role-select':
        return (
          <RoleSelect
            selectedRole={login.role}
            onSelect={(role) => {
              setCredentialError('');
              login.selectRole(role);
            }}
            onNext={() => login.goToStep('credentials')}
          />
        );
      case 'credentials':
        return (
          <Credentials
            roleTitle={selectedRoleTitle}
            isLocked={login.isLocked}
            onChangeRole={() => { setCredentialError(''); login.goToStep('role-select'); }}
            onSubmit={handleCredentialSubmit}
            externalError={credentialError}
          />
        );
      case 'totp':
        // Legacy mock TOTP (fallback demo path)
        return (
          <TOTP
            roleTitle={selectedRoleTitle}
            onResend={() => { /* mock: timer auto-resets */ }}
            onSubmit={(code) => login.verifyTOTP(code)}
            onSuccess={() => login.goToStep('audit-gate')}
          />
        );
      case 'mfa-enroll':
        return (
          <MFAEnroll
            roleTitle={selectedRoleTitle}
            totpUri={login.totpUri}
            totpSecret={login.totpSecret}
            mfaToken={login.mfaToken}
            onVerify={handleMFAVerify}
            onSuccess={() => login.goToStep('audit-gate')}
            onBack={() => login.goToStep('credentials')}
          />
        );
      case 'mfa-verify':
        return (
          <MFAVerify
            roleTitle={selectedRoleTitle}
            mfaToken={login.mfaToken}
            onVerify={handleMFAVerify}
            onSuccess={() => login.goToStep('audit-gate')}
            onBack={() => login.goToStep('credentials')}
          />
        );
      case 'audit-gate':
        return (
          <AuditGate
            roleTitle={selectedRoleTitle}
            sessionId={sessionId}
            onChangeRole={() => login.goToStep('role-select')}
            onConfirm={() => login.goToStep('dashboard-load')}
          />
        );
      case 'dashboard-load':
        return (
          <DashboardLoad
            officerName={login.officerName}
            sessionId={sessionId}
            onComplete={() => {
              // After MFA, we already have the real JWT and user in localStorage.
              // Use loginWithBackendToken to set the auth store instead of loginMock.
              const token = localStorage.getItem('auth_token');
              const storedUser = localStorage.getItem('auth_user');
              const roleKey = login.role ?? 'OFFICER';
              if (token && token !== 'demo-session' && storedUser) {
                try {
                  const user = JSON.parse(storedUser);
                  loginWithBackendToken(token, user);
                } catch {
                  loginMock(buildMockUser(roleKey));
                }
              } else {
                loginMock(buildMockUser(roleKey));
              }
              navigate('/');
            }}
          />
        );
      default:
        return null;
    }
  }, [login, selectedRoleTitle, sessionId, credentialError, loginMock, loginWithBackendToken, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A1628] p-4">
      <AnimatePresence mode="wait">{stepContent}</AnimatePresence>
    </div>
  );
}
