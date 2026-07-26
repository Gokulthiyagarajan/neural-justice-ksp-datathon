import * as React from 'react';
import { cn } from '../utils/cn';

interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  type?: string;
  disabled?: boolean;
  as?: React.ElementType;
  p?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  px?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  py?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  m?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  mx?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  my?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  mt?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  mr?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  mb?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  ml?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  flex?: boolean;
  inlineFlex?: boolean;
  grid?: boolean;
  block?: boolean;
  hidden?: boolean;
  absolute?: boolean;
  relative?: boolean;
  fixed?: boolean;
  sticky?: boolean;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  inset?: string;
  w?: string;
  h?: string;
  minW?: string;
  maxW?: string;
  minH?: string;
  maxH?: string;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | 'card' | 'cardHover';
  bg?: string;
  textColor?: string;
  border?: string;
  borderColor?: string;
  transition?: string;
  cursor?: string;
  pointerEvents?: string;
  userSelect?: string;
  zIndex?: 'hide' | 'base' | 'dropdown' | 'sticky' | 'modal' | 'popover' | 'tooltip' | 'toast';
}

const spacingMap = {
  1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)',
  4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)',
  8: 'var(--space-8)', 10: 'var(--space-10)', 12: 'var(--space-12)',
  16: 'var(--space-16)', 20: 'var(--space-20)', 24: 'var(--space-24)',
} as const;

const radiusMap = {
  sm: 'var(--radius-sm)', md: 'var(--radius-md)',
  lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-full)',
} as const;

const shadowMap = {
  sm: 'var(--shadow-sm)', md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)',
  card: 'var(--shadow-card)', cardHover: 'var(--shadow-card-hover)',
} as const;

const zIndexMap = {
  hide: 'var(--z-hide)', base: 'var(--z-base)',
  dropdown: 'var(--z-dropdown)', sticky: 'var(--z-sticky)',
  modal: 'var(--z-modal)', popover: 'var(--z-popover)',
  tooltip: 'var(--z-tooltip)', toast: 'var(--z-toast)',
} as const;

export const Box = React.forwardRef<any, BoxProps>(
  (
    {
      as: Component = 'div',
      p, px, py,
      m, mx, my, mt, mr, mb, ml,
      gap,
      flex, inlineFlex, grid, block, hidden,
      absolute, relative, fixed, sticky,
      top, right, bottom, left, inset,
      w, h, minW, maxW, minH, maxH,
      overflow, overflowX, overflowY,
      rounded, shadow,
      bg, textColor, border, borderColor,
      transition, cursor, pointerEvents, userSelect, zIndex,
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const computedStyle = {
      ...style,
      ...(p && { padding: spacingMap[p] }),
      ...(px && { paddingLeft: spacingMap[px], paddingRight: spacingMap[px] }),
      ...(py && { paddingTop: spacingMap[py], paddingBottom: spacingMap[py] }),
      ...(m && { margin: spacingMap[m] }),
      ...(mx && { marginLeft: spacingMap[mx], marginRight: spacingMap[mx] }),
      ...(my && { marginTop: spacingMap[my], marginBottom: spacingMap[my] }),
      ...(mt && { marginTop: spacingMap[mt] }),
      ...(mr && { marginRight: spacingMap[mr] }),
      ...(mb && { marginBottom: spacingMap[mb] }),
      ...(ml && { marginLeft: spacingMap[ml] }),
      ...(gap && { gap: spacingMap[gap] }),
      ...(flex && { display: 'flex' }),
      ...(inlineFlex && { display: 'inline-flex' }),
      ...(grid && { display: 'grid' }),
      ...(block && { display: 'block' }),
      ...(hidden && { display: 'none' }),
      ...(absolute && { position: 'absolute' }),
      ...(relative && { position: 'relative' }),
      ...(fixed && { position: 'fixed' }),
      ...(sticky && { position: 'sticky' }),
      ...(top && { top }),
      ...(right && { right }),
      ...(bottom && { bottom }),
      ...(left && { left }),
      ...(inset && { inset }),
      ...(w && { width: w }),
      ...(h && { height: h }),
      ...(minW && { minWidth: minW }),
      ...(maxW && { maxWidth: maxW }),
      ...(minH && { minHeight: minH }),
      ...(maxH && { maxHeight: maxH }),
      ...(overflow && { overflow: overflow as React.CSSProperties['overflow'] }),
      ...(overflowX && { overflowX: overflowX as React.CSSProperties['overflowX'] }),
      ...(overflowY && { overflowY: overflowY as React.CSSProperties['overflowY'] }),
      ...(rounded && { borderRadius: radiusMap[rounded] }),
      ...(shadow && { boxShadow: shadowMap[shadow] }),
      ...(bg && { backgroundColor: bg }),
      ...(textColor && { color: textColor }),
      ...(border && { border }),
      ...(borderColor && { borderColor }),
      ...(transition && { transition }),
      ...(cursor && { cursor }),
      ...(pointerEvents && { pointerEvents }),
      ...(userSelect && { userSelect }),
      ...(zIndex && { zIndex: zIndexMap[zIndex] as React.CSSProperties['zIndex'] }),
    } as React.CSSProperties;

    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={computedStyle}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Box.displayName = 'Box';

export const Flex = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ children, className, style, ...props }, ref) => (
    <Box ref={ref} flex className={className} style={style} {...props}>
      {children}
    </Box>
  )
);
Flex.displayName = 'Flex';

export const Grid = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ children, className, style, ...props }, ref) => (
    <Box ref={ref} grid className={className} style={style} {...props}>
      {children}
    </Box>
  )
);
Grid.displayName = 'Grid';