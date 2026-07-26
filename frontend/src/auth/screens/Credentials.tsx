import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { SessionChip } from '../components/SessionChip';
import { ForgotCredentialsModal } from '../components/ForgotCredentialsModal';
import { COPY } from '../constants/copy';

interface CredentialsProps {
  roleTitle: string;
  isLocked: boolean;
  onChangeRole: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
  externalError?: string;
}

export function Credentials({
  roleTitle,
  isLocked,
  onChangeRole,
  onSubmit,
  externalError,
}: CredentialsProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const next: typeof errors = {};
    if (!username.trim()) next.username = COPY.credentials.usernameError;
    if (!password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsVerifying(true);
    try {
      await onSubmit(username, password);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[440px] px-4"
      >
        <div className="rounded-xl border border-ksp-danger/40 bg-ksp-danger/10 p-5 text-center">
          <AlertCircle className="w-8 h-8 text-ksp-danger mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-ksp-white">{COPY.credentials.lockoutTitle}</h3>
          <p className="mt-2 text-sm text-ksp-muted leading-relaxed">{COPY.credentials.lockoutText}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[440px] px-4"
    >
      <div className="mb-5">
        <SessionChip label={roleTitle} onBack={onChangeRole} backLabel={COPY.credentials.changeRole} />
      </div>

      <AnimatePresence>
        {(authError || externalError) && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ x: { duration: 0.4 } }}
            className="mb-4 flex items-center gap-2 text-sm text-ksp-danger bg-ksp-danger/10 border border-ksp-danger/30 border-l-[3px] border-l-ksp-danger rounded-lg px-3 py-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{externalError || authError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.08em] text-ksp-muted mb-1.5">
            {COPY.credentials.usernameLabel}
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={COPY.credentials.usernamePlaceholder}
            autoFocus
            className="w-full h-11 min-h-12 px-3 rounded-lg appearance-none bg-ksp-navy-mid border border-ksp-navy-light text-ksp-white outline-none placeholder:text-ksp-muted/60 focus:border-ksp-amber focus:shadow-[0_0_0_1px_rgba(245,158,11,0.3)] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors duration-150"
          />
          {errors.username && <p className="mt-1 text-xs text-ksp-danger">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.08em] text-ksp-muted mb-1.5">
            {COPY.credentials.passwordLabel}
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={COPY.credentials.passwordPlaceholder}
              className="w-full h-11 min-h-12 px-3 pr-10 rounded-lg appearance-none bg-ksp-navy-mid border border-ksp-navy-light text-ksp-white outline-none placeholder:text-ksp-muted/60 focus:border-ksp-amber focus:shadow-[0_0_0_1px_rgba(245,158,11,0.3)] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors duration-150"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ksp-muted hover:text-ksp-white min-h-12 min-w-12 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none rounded-md"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-ksp-danger">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          className="w-full h-12 min-h-12 rounded-xl bg-ksp-amber text-ksp-navy font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
          {isVerifying ? 'Verifying...' : COPY.credentials.submitBtn}
        </button>

        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="w-full text-center text-xs text-ksp-muted/70 hover:text-ksp-white underline-offset-2 hover:underline transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none rounded-md"
        >
          {COPY.credentials.forgotCredentials}
        </button>
      </form>

      <ForgotCredentialsModal isOpen={showForgot} onClose={() => setShowForgot(false)} />
    </motion.div>
  );
}
