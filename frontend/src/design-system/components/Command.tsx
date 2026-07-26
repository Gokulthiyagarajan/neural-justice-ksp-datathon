import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../utils/cn';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string[];
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface CommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

function matches(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.description?.toLowerCase().includes(q) ?? false) ||
    (item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)
  );
}

export const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  (
    {
      open,
      onOpenChange,
      items,
      placeholder = 'Type a command or search...',
      emptyMessage = 'No results found.',
      className,
    },
    ref
  ) => {
    const [query, setQuery] = React.useState('');
    const [activeIndex, setActiveIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const filtered = React.useMemo(
      () => items.filter((item) => matches(item, query)),
      [items, query]
    );

    React.useEffect(() => {
      setActiveIndex(0);
    }, [query]);

    React.useEffect(() => {
      if (open) {
        setQuery('');
        setActiveIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }, [open]);

    const select = React.useCallback(
      (item: CommandItem) => {
        if (item.disabled) return;
        item.onSelect?.();
        onOpenChange?.(false);
      },
      [onOpenChange]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) select(item);
      }
    };

    const grouped = React.useMemo(() => {
      const groups: Record<string, CommandItem[]> = {};
      filtered.forEach((item) => {
        const g = item.group || '';
        (groups[g] ||= []).push(item);
      });
      return groups;
    }, [filtered]);

    let flatIndex = -1;

    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-[var(--z-modal)] bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in"
          />
          <DialogPrimitive.Content
            ref={ref}
            onKeyDown={handleKeyDown}
            className={cn(
              'fixed left-1/2 top-[20%] z-[var(--z-modal)] w-full max-w-lg -translate-x-1/2',
              'overflow-hidden rounded-[16px] border border-border-primary bg-bg-card shadow-xl',
              'data-[state=open]:animate-fade-in-up',
              className
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              Command Menu
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2 border-b border-border-primary px-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary">
                  {emptyMessage}
                </div>
              ) : (
                Object.entries(grouped).map(([group, groupItems]) => (
                  <div key={group || 'ungrouped'} className="mb-1">
                    {group && (
                      <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                        {group}
                      </div>
                    )}
                    {groupItems.map((item) => {
                      flatIndex += 1;
                      const isActive = flatIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => select(item)}
                          onMouseEnter={() => setActiveIndex(filtered.indexOf(item))}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm',
                            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                            isActive
                              ? 'bg-nj-blue/10 text-nj-blue'
                              : 'text-text-primary hover:bg-hover-bg'
                          )}
                        >
                          {item.icon && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              {item.icon}
                            </span>
                          )}
                          <span className="flex flex-1 flex-col">
                            <span className="font-medium">{item.label}</span>
                            {item.description && (
                              <span className="text-xs text-text-secondary">
                                {item.description}
                              </span>
                            )}
                          </span>
                          {item.shortcut && (
                            <kbd className="rounded border border-border-primary bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

Command.displayName = 'Command';
