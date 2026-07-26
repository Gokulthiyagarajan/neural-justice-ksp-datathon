import * as React from 'react';
import { cn } from '../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
}

const DefaultSeparator = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="text-text-tertiary shrink-0"
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    { items, separator = DefaultSeparator, maxItems, className, ...props },
    ref
  ) => {
    let displayItems = items;
    let collapsed = false;

    if (maxItems && items.length > maxItems) {
      collapsed = true;
      displayItems = [items[0], ...items.slice(items.length - (maxItems - 1))];
    }

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center', className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            const showEllipsis = collapsed && index === 1;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && <li aria-hidden="true" className="flex">{separator}</li>}
                {showEllipsis && (
                  <>
                    <li className="text-sm text-text-tertiary px-1">…</li>
                    <li aria-hidden="true" className="flex">{separator}</li>
                  </>
                )}
                <li className="flex items-center">
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="flex items-center gap-1.5 text-sm font-medium text-text-primary"
                    >
                      {item.icon}
                      {item.label}
                    </span>
                  ) : item.href || item.onClick ? (
                    <a
                      href={item.href}
                      onClick={
                        item.onClick
                          ? (e) => {
                              if (!item.href) e.preventDefault();
                              item.onClick?.();
                            }
                          : undefined
                      }
                      className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-nj-blue"
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                      {item.icon}
                      {item.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';
