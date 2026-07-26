import type { ReactNode } from 'react';

interface AetherButtonProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}

export function AetherButton({ children, onClick, icon }: AetherButtonProps) {
  return (
    <button onClick={onClick} className="aether-primary-btn">
      {children}
      <span className="aether-primary-btn__chip">
        {icon ? icon : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </span>
    </button>
  );
}
