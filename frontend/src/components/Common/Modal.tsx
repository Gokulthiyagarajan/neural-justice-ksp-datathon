import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 animate-fade-in motion-reduce:animate-none"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
        style={{ background: 'rgba(8, 12, 20, 0.7)', backdropFilter: 'blur(4px)' }}
      />
      <div className={`relative bg-bg-card rounded-xl shadow-2xl w-full ${sizeClasses[size]} mx-4 max-h-[90vh] flex flex-col animate-fade-in-scale motion-reduce:animate-none`}
        style={{
          border: '1px solid var(--border-primary)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-secondary">
          <h3 className="text-base font-semibold text-text-primary font-display">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors duration-fast text-text-tertiary hover:text-text-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border-secondary bg-bg-secondary rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
