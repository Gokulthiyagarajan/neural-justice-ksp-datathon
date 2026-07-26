import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../utils/cn';

interface TooltipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  skipDelayDuration?: number;
  children: React.ReactElement;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      side = 'top',
      align = 'center',
      sideOffset = 8,
      delayDuration = 200,
      skipDelayDuration = 50,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    if (!React.isValidElement(children)) {
      throw new Error('Tooltip requires a single child element');
    }

    const child = children as React.ReactElement & { ref?: React.Ref<unknown> };

    return (
      <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>
            {React.cloneElement(child, {
              ref: (el: HTMLElement) => {
                const childRef = child.ref;
                if (typeof childRef === 'function') childRef(el);
                else if (childRef && typeof childRef === 'object') (childRef as React.MutableRefObject<unknown>).current = el;
              },
            } as Partial<unknown>)}
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              ref={ref}
              side={side}
              align={align}
              sideOffset={sideOffset}
              className={cn(
                'tooltip z-50 bg-nj-navy text-white text-xs px-2.5 py-1.5 rounded-[8px] shadow-lg',
                'animate-fade-in-down',
                'data-[state=delayed-open]:animate-fade-in-down',
                'data-[state=closed]:animate-fade-out-up',
                className
              )}
              style={style}
              {...props}
            >
              {content}
              <TooltipPrimitive.Arrow className="fill-nj-navy w-2 h-2" />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ asChild = true, className, style, ...props }, ref) => (
    <TooltipPrimitive.Trigger
      ref={ref}
      asChild={asChild}
      className={cn('', className)}
      style={style}
      {...props}
    />
  )
);

TooltipTrigger.displayName = 'TooltipTrigger';