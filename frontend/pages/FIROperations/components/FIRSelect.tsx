import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { C } from '../theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FIRSelect({ value, options, onChange, placeholder = 'All' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: C.navyMid,
          border: `1px solid ${open ? C.amber : C.navyLight}`,
          borderRadius: 8,
          padding: '8px 12px',
          color: current ? C.white : C.muted,
          fontSize: 13,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: 240,
            overflowY: 'auto',
            background: C.navyMid,
            border: `1px solid ${C.navyLight}`,
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 13,
                color: opt.value === value ? C.amber : C.white,
                background: opt.value === value ? C.amberDim : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = C.navyLight;
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
