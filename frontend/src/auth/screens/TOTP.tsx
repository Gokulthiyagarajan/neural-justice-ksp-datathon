import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { OTPInput } from '../components/OTPInput';
import { SessionChip } from '../components/SessionChip';
import { COPY } from '../constants/copy';
import { useTOTPTimer } from '../hooks/useTOTPTimer';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';

interface TOTPProps {
  roleTitle: string;
  onResend: () => void;
  onSubmit: (code: string) => Promise<boolean> | boolean;
  onSuccess: () => void;
}

export function TOTP({ roleTitle, onResend, onSubmit, onSuccess }: TOTPProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { seconds, expired } = useTOTPTimer(30);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (next: string[]) => {
    setDigits(next);
    if (hasError) setHasError(false);
  };

  const handleComplete = async (code: string) => {
    setIsVerifying(true);
    try {
      const ok = await onSubmit(code);
      if (ok) {
        onSuccess();
      } else {
        setHasError(true);
        setAttempts((a) => a + 1);
        setDigits(Array(6).fill(''));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setHasError(true);
      setAttempts((a) => a + 1);
      setDigits(Array(6).fill(''));
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    onResend();
    setDigits(Array(6).fill(''));
    setHasError(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[440px] px-4"
    >
      <div className="mb-5">
        <SessionChip label={roleTitle} />
      </div>

      {isVerifying ? (
        <div className="mt-8 py-16 flex flex-col items-center justify-center bg-ksp-navy-mid border border-ksp-navy-light rounded-xl">
          <LoadingSpinner message="Verifying authentication code..." size="lg" />
        </div>
      ) : (
        <>
          <h2 className="text-center text-xl font-semibold text-ksp-white">{COPY.totp.header}</h2>
          <p className="mt-1 text-center text-sm text-ksp-muted">{COPY.totp.subtext}</p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <OTPInput
              ref={inputRef}
              value={digits}
              onChange={handleChange}
              onComplete={handleComplete}
              hasError={hasError}
              disabled={isVerifying}
            />

            {hasError && (
              <p className="flex items-center gap-1.5 text-sm text-ksp-danger" role="alert">
                <AlertCircle className="w-4 h-4" />
                {COPY.totp.incorrectCode}
              </p>
            )}

            <div className="flex flex-col items-center gap-2 text-sm">
              <span className={expired ? 'text-ksp-danger' : seconds <= 10 ? 'text-ksp-amber' : 'text-ksp-muted'}>
                {expired ? COPY.totp.codeExpired : COPY.totp.codeExpiresIn(Math.max(0, seconds))}
              </span>
              <button
                type="button"
                onClick={handleResend}
                className="flex items-center gap-1 text-ksp-muted hover:text-ksp-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {COPY.totp.cantAccess}
              </button>
            </div>
          </div>

          {attempts > 0 && (
            <p className="mt-4 text-center text-[11px] text-ksp-muted/70">{COPY.totp.escalationText}</p>
          )}
        </>
      )}
    </motion.div>
  );
}
