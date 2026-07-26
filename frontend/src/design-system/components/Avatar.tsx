import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../utils/cn';
import { Box } from './Box';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      fallback,
      size = 'md',
      shape = 'circle',
      className,
      style,
      ...props
    },
    ref
  ) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden',
        sizeClasses[size],
        shape === 'circle' && 'rounded-full',
        shape === 'square' && 'rounded-[10px]',
        className
      )}
      style={style}
      {...props}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={alt}
        className="aspect-square h-full w-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className={cn(
          'flex items-center justify-center bg-nj-blue/10 text-nj-blue font-medium',
          'h-full w-full'
        )}
        delayMs={600}
      >
        {fallback || (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 00-16 0" />
          </svg>
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
);

Avatar.displayName = 'Avatar';

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  overlap?: number;
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ max = 5, size = 'md', overlap = 8, className, style, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children).filter(React.isValidElement);
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    return (
      <Box
        ref={ref}
        as="div"
        className={cn('flex items-center', className)}
        style={style}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <Box
            key={index}
            as="div"
            className={cn('relative', index > 0 && `-ml-${overlap} border-2 border-bg-primary`)}
            style={{ zIndex: visibleChildren.length - index }}
          >
            {React.cloneElement(child as React.ReactElement<any>, { size })}
          </Box>
        ))}
        {remainingCount > 0 && (
          <Box
            as="div"
            className={cn(
              'flex items-center justify-center bg-nj-blue/10 text-nj-blue font-medium border-2 border-bg-primary -ml-px',
              sizeClasses[size],
              'rounded-full'
            )}
          >
            +{remainingCount}
          </Box>
        )}
      </Box>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';