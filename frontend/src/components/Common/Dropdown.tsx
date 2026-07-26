import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, isOpen, onToggle, align = 'right', className = '' }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onToggle(false), [onToggle]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        const focusable = triggerRef.current?.querySelector<HTMLElement>('button, [href]');
        focusable?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const focusableElements = dropdownRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <div ref={triggerRef}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 z-50 min-w-[280px] max-w-sm py-1',
            'bg-bg-secondary border border-border-primary rounded-md shadow-floating',
            'animate-panel-enter motion-reduce:animate-none',
            alignClass,
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      )}
    </div>
  );
}
