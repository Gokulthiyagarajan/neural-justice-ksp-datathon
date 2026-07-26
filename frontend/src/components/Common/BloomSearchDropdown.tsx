import { useState, useEffect } from 'react';
import { FileText, BarChart3, Brain, LayoutDashboard, Scale, Map, ShieldAlert } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileText, BarChart3, Brain, LayoutDashboard, Scale, Map, ShieldAlert,
};

export interface SearchResult {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: 'navigate' | 'open-drawer' | 'trigger';
  path?: string;
}

interface Props {
  query: string;
  isLoading: boolean;
  results: SearchResult[];
  staticCategories: { label: string; items: SearchResult[] }[];
  onSelect: (item: SearchResult) => void;
  onClose: () => void;
}

export function BloomSearchDropdown({ query, isLoading, results, staticCategories, onSelect }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const allItems = query.length < 2
    ? staticCategories.flatMap(c => c.items)
    : results;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, allItems.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && allItems[activeIndex]) { onSelect(allItems[activeIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, allItems, onSelect]);

  if (query.length >= 2 && isLoading) {
    return (
      <DropdownShell>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Searching...</span>
        </div>
      </DropdownShell>
    );
  }

  if (query.length >= 2 && !isLoading && results.length === 0) {
    return (
      <DropdownShell>
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No results — try a different search</p>
      </DropdownShell>
    );
  }

  return (
    <DropdownShell>
      {query.length < 2 ? (
        staticCategories.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5" style={{ color: 'rgba(0, 212, 255, 0.4)' }}>
              {cat.label}
            </p>
            {cat.items.map((item) => {
              const globalIdx = staticCategories.flatMap(c => c.items).indexOf(item);
              return (
                <DropdownItem key={item.id} item={item} isActive={globalIdx === activeIndex} onSelect={onSelect} />
              );
            })}
          </div>
        ))
      ) : (
        results.map((item, idx) => (
          <DropdownItem key={item.id} item={item} isActive={idx === activeIndex} onSelect={onSelect} />
        ))
      )}
    </DropdownShell>
  );
}

function DropdownShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-2xl z-50"
      style={{
        background: 'rgba(18, 24, 43, 0.95)',
        backdropFilter: 'blur(32px)',
        border: '1px solid rgba(0, 212, 255, 0.12)',
      }}
    >
      {children}
    </div>
  );
}

function DropdownItem({ item, isActive, onSelect }: { item: SearchResult; isActive: boolean; onSelect: (item: SearchResult) => void }) {
  const Icon = item.icon ? ICON_MAP[item.icon] : null;
  return (
    <button
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors duration-100"
      style={{
        background: isActive ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onClick={() => onSelect(item)}
      aria-label={item.label}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 text-accent-cyan" />}
      <span>{item.label}</span>
    </button>
  );
}
