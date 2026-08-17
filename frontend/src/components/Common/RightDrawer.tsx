import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useRightDrawer } from '@/store/rightDrawerStore';
import { useFocusTrap } from '@/design-system/hooks';

export function RightDrawer() {
  const { isOpen, title, content, close } = useRightDrawer();
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(asideRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-250"
        style={{ background: 'rgba(8, 12, 20, 0.6)' }}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col animate-slide-left motion-reduce:animate-none"
        style={{
          width: 'min(100vw, 400px)',
          background: 'rgba(18, 24, 43, 0.85)',
          backdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(0, 212, 255, 0.12)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="flex items-center justify-between px-5 h-14 shrink-0"
          style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.06)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {content}
        </div>
      </aside>
    </>
  );
}
