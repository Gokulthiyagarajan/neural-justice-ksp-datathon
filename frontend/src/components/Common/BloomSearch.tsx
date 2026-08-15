import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BloomSearchDropdown, type SearchResult } from './BloomSearchDropdown';

export interface BloomSearchProps {
  autoFocus?: boolean;
}

export function BloomSearch({ autoFocus }: BloomSearchProps = {}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchCategories = useMemo(
    () => [
      {
        label: t('search.quickActions'),
        items: [
          { id: 'action-fir', label: t('search.createFir'), icon: 'FileText', action: 'navigate' as const, path: '/firs' },
          { id: 'action-report', label: t('search.generateReport'), icon: 'BarChart3', action: 'navigate' as const, path: '/reports' },
          { id: 'action-ai', label: t('search.openCopilot'), icon: 'Brain', action: 'navigate' as const, path: '/ai' },
        ],
      },
      {
        label: t('search.navigate'),
        items: [
          { id: 'nav-dash', label: t('search.dashboard'), icon: 'LayoutDashboard', action: 'navigate' as const, path: '/' },
          { id: 'nav-firs', label: t('search.firExplorer'), icon: 'Scale', action: 'navigate' as const, path: '/firs' },
          { id: 'nav-geo', label: t('search.geoCommand'), icon: 'Map', action: 'navigate' as const, path: '/geo' },
          { id: 'nav-intel', label: t('search.networkAnalysis'), icon: 'ShieldAlert', action: 'navigate' as const, path: '/intelligence/networks' },
        ],
      },
    ],
    [t],
  );

  const focus = useCallback(() => {
    inputRef.current?.focus();
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (autoFocus) {
      focus();
    }
  }, [autoFocus, focus]);

  useEffect(() => {
    const handler = () => focus();
    window.addEventListener('bloom-search-focus', handler);
    return () => window.removeEventListener('bloom-search-focus', handler);
  }, [focus]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-[480px] mx-auto">
      <div
        className={`flex items-center gap-2 px-3 h-9 rounded-md transition-all duration-fast bg-bg-secondary border ${
          isOpen ? 'border-service-blue/40 ring-2 ring-service-blue/15' : 'border-border-primary'
        }`}
      >
        <Search className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-tertiary"
          aria-label={t('search.ariaLabel')}
        />
        <kbd className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-sm shrink-0 text-text-tertiary bg-bg-tertiary border border-border-secondary">
          ⌘K
        </kbd>
      </div>
      {isOpen && (
        <BloomSearchDropdown
          query={query}
          isLoading={isLoading}
          results={results}
          staticCategories={searchCategories}
          onSelect={(item) => {
            setIsOpen(false);
            setQuery('');
            if (item.action === 'navigate') navigate(item.path!);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
