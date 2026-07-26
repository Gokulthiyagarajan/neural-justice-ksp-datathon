import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { OTPInput } from '../components/OTPInput';
import { SessionChip } from '../components/SessionChip';
import { useTOTPTimer } from '../hooks/useTOTPTimer';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';

interface MFAVerifyProps {
  roleTitle: string;
  mfaToken: string;
  onVerify: (mfaToken: string, totpCode: string, isEnrollment: boolean) => Promise<boolean>;
  onSuccess: () => void;
  onBack: () => void;
}

export function MFAVerify({ roleTitle, mfaToken, onVerify, onSuccess, onBack }: MFAVerifyProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { seconds, expired } = useTOTPTimer(30);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (next: string[]) => {
    setDigits(next);
    if (hasError) {
      setHasError(false);
      setErrorDetail('');
    }
  };

  const handleComplete = async (code: string) => {
    setIsVerifying(true);
    try {
      const ok = await onVerify(mfaToken, code, false);
      if (ok) {
        onSuccess();
      } else {
        setHasError(true);
        setAttempts((a) => a + 1);
        setErrorDetail('Invalid or expired code. Try the current code from your app.');
        setDigits(Array(6).fill(''));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (err: any) {
      setHasError(true);
      setAttempts((a) => a + 1);
      setErrorDetail(err?.message || 'Verification failed. Try again.');
      setDigits(Array(6).fill(''));
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
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
        <SessionChip label={roleTitle} onBack={onBack} backLabel="Back" />
      </div>

      {isVerifying ? (
        <div className="mt-8 py-16 flex flex-col items-center justify-center bg-ksp-navy-mid border border-ksp-navy-light rounded-xl">
          <LoadingSpinner message="Verifying authentication code..." size="lg" />
        </div>
      ) : (
        <>
          <h2 className="text-center text-xl font-semibold text-ksp-white">Two-Factor Verification</h2>
          <p className="mt-1 text-center text-sm text-ksp-muted">
            Enter the 6-digit code from your authenticator app
          </p>

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
                {errorDetail || 'Incorrect code.'}
              </p>
            )}

            <div className="flex flex-col items-center gap-2 text-sm">
              <span className={expired ? 'text-ksp-danger' : seconds <= 10 ? 'text-ksp-amber' : 'text-ksp-muted'}>
                {expired ? 'Code expired. Enter the new code from your app.' : `Code refreshes in ${seconds}`}
              </span>
            </div>
          </div>

          {attempts > 0 && (
            <p className="mt-4 text-center text-[11px] text-ksp-muted/70">
              Raise an unlock request with your supervisor or call KSP IT Helpdesk: 080-2294-3000
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
