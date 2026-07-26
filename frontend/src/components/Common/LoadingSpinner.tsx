import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} aria-hidden="true" style={{ color: 'var(--accent-cyan)' }} />
      {message && <p className="text-sm text-text-tertiary">{message}</p>}
      <span className="sr-only">{message || 'Loading...'}</span>
    </div>
  );
}
