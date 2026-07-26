import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function variant(
  base: string,
  variants: Record<string, Record<string, string>>,
  compoundVariants?: Array<{ className: string; conditions: Record<string, string> }>,
  defaultVariants?: Record<string, string>
) {
  return (props: Record<string, any> = {}) => {
    let className = base;
    const resolvedVariants = { ...defaultVariants, ...props };

    Object.entries(variants).forEach(([variantKey, variantValues]) => {
      const value = resolvedVariants[variantKey];
      if (value && variantValues[value]) {
        className += ` ${variantValues[value]}`;
      }
    });

    if (compoundVariants) {
      compoundVariants.forEach(({ className: cvClassName, conditions }) => {
        const matches = Object.entries(conditions).every(
          ([key, value]) => resolvedVariants[key] === value
        );
        if (matches) {
          className += ` ${cvClassName}`;
        }
      });
    }

    return className;
  };
}

export function dataAttr(condition: boolean | undefined): string {
  return condition ? 'data-state="open"' : 'data-state="closed"';
}

export function ariaAttr(condition: boolean | undefined, attr: 'expanded' | 'selected' | 'checked' | 'pressed' | 'disabled'): string {
  if (condition === undefined) {return '';}
  return condition ? `aria-${attr}="true"` : `aria-${attr}="false"`;
}