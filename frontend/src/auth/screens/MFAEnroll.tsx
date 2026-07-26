import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Copy, Check, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { OTPInput } from '../components/OTPInput';
import { SessionChip } from '../components/SessionChip';
import { useTOTPTimer } from '../hooks/useTOTPTimer';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';

interface MFAEnrollProps {
  roleTitle: string;
  totpUri: string;
  totpSecret: string;
  mfaToken: string;
  onVerify: (mfaToken: string, totpCode: string, isEnrollment: boolean) => Promise<boolean>;
  onSuccess: () => void;
  onBack: () => void;
}

export function MFAEnroll({ roleTitle, totpUri, totpSecret, mfaToken, onVerify, onSuccess, onBack }: MFAEnrollProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
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
      const ok = await onVerify(mfaToken, code, true);
      if (ok) {
        onSuccess();
      } else {
        setHasError(true);
        setErrorDetail('Invalid code. Check your authenticator app and try the current code.');
        setDigits(Array(6).fill(''));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (err: any) {
      setHasError(true);
      setErrorDetail(err?.message || 'Verification failed. Try again.');
      setDigits(Array(6).fill(''));
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  // Extract the base32 secret from the URI for display
  const displaySecret = totpSecret.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || totpSecret;

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
          <h2 className="text-center text-xl font-semibold text-ksp-white">Set Up Authenticator</h2>
          <p className="mt-1 text-center text-sm text-ksp-muted">
            Scan the QR code with Google Authenticator, Authy, or Microsoft Authenticator
          </p>

          {/* QR Code */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG
                value={totpUri}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Manual entry toggle */}
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="flex items-center gap-1.5 text-xs text-ksp-muted hover:text-ksp-white transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {showManual ? 'Hide manual entry' : "Can't scan? Enter code manually"}
            </button>

            {showManual && (
              <div className="w-full p-3 rounded-lg bg-ksp-navy-mid border border-ksp-navy-light">
                <p className="text-[10px] uppercase tracking-wider text-ksp-muted mb-1.5">Manual entry key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-ksp-white break-all select-all">
                    {displaySecret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 p-1.5 rounded-md hover:bg-ksp-navy-light transition-colors"
                    title="Copy secret"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-ksp-muted" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* OTP input */}
            <p className="text-sm text-ksp-muted">Enter the 6-digit code from your app</p>
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
                {expired ? 'Code expired. Enter the new code.' : `Code refreshes in ${seconds}`}
              </span>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-ksp-muted/70">
            Your authenticator app generates a new code every 30 seconds. You must set it up now — you cannot skip this step.
          </p>
        </>
      )}
    </motion.div>
  );
}
