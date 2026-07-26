import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '../utils/cn';

interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'dir'> {
  type?: 'always' | 'hover' | 'scroll' | 'auto';
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      type = 'auto',
      className,
      style,
      children,
      ...props
    },
    ref
  ) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      type={type}
      className={cn('relative', className)}
      style={style}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="vertical"
        className={cn(
          'scrollbar flex touch-none select-none transition-colors',
          'w-2 p-[2px]',
          'bg-transparent hover:bg-nj-blue/10',
          'data-[orientation=vertical]:h-full data-[orientation=vertical]:right-0 data-[orientation=vertical]:top-0',
          'data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:flex-col'
        )}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          className={cn(
            'scrollbar-thumb relative flex-1 rounded-full',
            'bg-border-primary hover:bg-nj-blue/30',
            'transition-colors',
            'data-[orientation=vertical]:min-h-16 data-[orientation=horizontal]:min-w-16'
          )}
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="horizontal"
        className={cn(
          'scrollbar flex touch-none select-none transition-colors',
          'h-2 p-[2px]',
          'bg-transparent hover:bg-nj-blue/10',
          'data-[orientation=vertical]:h-full data-[orientation=vertical]:right-0 data-[orientation=vertical]:top-0',
          'data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:flex-col'
        )}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          className={cn(
            'scrollbar-thumb relative flex-1 rounded-full',
            'bg-border-primary hover:bg-nj-blue/30',
            'transition-colors',
            'data-[orientation=vertical]:min-h-16 data-[orientation=horizontal]:min-w-16'
          )}
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
      <ScrollAreaPrimitive.Corner className="bg-transparent" />
    </ScrollAreaPrimitive.Root>
  )
);

ScrollArea.displayName = 'ScrollArea';

export interface ScrollBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'dir'> {
  orientation?: 'vertical' | 'horizontal';
}

export const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ orientation = 'vertical', className, style, ...props }, ref) => (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        'scrollbar flex touch-none select-none transition-colors',
        'w-2 p-[2px]',
        'bg-transparent hover:bg-nj-blue/10',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:right-0 data-[orientation=vertical]:top-0',
        'data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:flex-col',
        className
      )}
      style={style}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className={cn(
          'scrollbar-thumb relative flex-1 rounded-full',
          'bg-border-primary hover:bg-nj-blue/30',
          'transition-colors',
          'data-[orientation=vertical]:min-h-16 data-[orientation=horizontal]:min-w-16'
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
);

ScrollBar.displayName = 'ScrollBar';