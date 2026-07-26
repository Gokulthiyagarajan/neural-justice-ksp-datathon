import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../utils/cn';

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ showValue = false, formatValue, className, value, defaultValue, ...props }, ref) => {
  const currentValues = (value ?? defaultValue ?? [0]) as number[];

  return (
    <div className="w-full">
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-bg-tertiary">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-nj-blue" />
        </SliderPrimitive.Track>
        {currentValues.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className={cn(
              'block h-4 w-4 rounded-full border-2 border-nj-blue bg-bg-card shadow-sm',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nj-blue/40 focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing'
            )}
          />
        ))}
      </SliderPrimitive.Root>
      {showValue && (
        <div className="mt-1.5 flex justify-between text-xs text-text-secondary tabular-nums">
          {currentValues.map((v, i) => (
            <span key={i}>{formatValue ? formatValue(v) : v}</span>
          ))}
        </div>
      )}
    </div>
  );
});

Slider.displayName = 'Slider';
