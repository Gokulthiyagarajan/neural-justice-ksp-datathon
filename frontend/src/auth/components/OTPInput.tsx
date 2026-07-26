import { forwardRef } from 'react';
import { clsx } from 'clsx';

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export const OTPInput = forwardRef<HTMLInputElement, OTPInputProps>(function OTPInput(
  { length = 6, value, onChange, onComplete, disabled = false, hasError = false },
  ref
) {
  const handleChange = (index: number, digit: string) => {
    if (!/^[\d]*$/.test(digit)) return;
    const next = [...value];
    next[index] = digit.slice(-1);
    onChange(next);

    // Move focus to the next slot after a valid digit (if not the last slot)
    if (digit && index < length - 1) {
      const inputs = document.querySelectorAll('input[aria-label^="Digit"]');
      const nextInput = inputs[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }

    if (next.every((d) => d !== '') && onComplete) {
      onComplete(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const inputs = e.currentTarget.parentElement?.querySelectorAll('input');
      const prev = inputs?.[index - 1] as HTMLInputElement | undefined;
      prev?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(length - pasted.length).fill(''));
    onChange(next);
    if (pasted.length === length && onComplete) onComplete(pasted);
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste} role="group" aria-label="One-time passcode">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={i === 0 ? ref : undefined}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          className={clsx(
            'w-12 h-14 text-center font-mono text-2xl rounded-lg border transition-colors duration-150 outline-none appearance-none',
            hasError
              ? 'border-ksp-danger bg-ksp-danger/5 text-ksp-white'
              : value[i]
                ? 'border-ksp-steel bg-ksp-navy-mid text-ksp-white'
                : 'border-ksp-navy-light bg-ksp-navy-mid text-ksp-white',
            'focus:border-ksp-amber focus:bg-ksp-navy-light focus:shadow-[0_0_0_1px_rgba(245,158,11,0.3)]'
          )}
        />
      ))}
    </div>
  );
});
