import { Search, X, ArrowUp, ArrowDown, Hash } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface NodeSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function NodeSearch({ value, onChange, resultCount, onNavigate }: NodeSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 absolute top-4 left-1/2 -translate-x-1/2 z-20"
      style={{
        borderRadius: '12px',
        minWidth: 320,
        maxWidth: 420,
        background: 'rgba(11, 17, 32, 0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Search className="w-4 h-4 shrink-0" style={{ color: '#5C6573' }} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find entity by name or ID... (⌘F)"
        className="flex-1 bg-transparent text-[13px] outline-none border-none placeholder:text-[#5C6573]"
        style={{ color: '#E8EAED' }}
        aria-label="Find entity"
      />

      {/* Result count */}
      {value.trim() && resultCount !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}>
            <Hash className="w-3 h-3" />
            {resultCount}
          </span>
          {resultCount > 0 && onNavigate && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Previous match"
                aria-label="Previous match"
              >
                <ArrowUp className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Next match"
                aria-label="Next match"
              >
                <ArrowDown className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Clear */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
        </button>
      )}
    </div>
  );
}
