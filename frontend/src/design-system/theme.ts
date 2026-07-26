import { colors, spacing, radius, shadows, typography, transitions, zIndex } from './tokens';

const cssVars: Record<string, string> = {};

Object.entries(colors.brand).forEach(([key, value]) => {
  cssVars[`--nj-${key}`] = value;
});

Object.entries(colors.semantic).forEach(([key, value]) => {
  cssVars[`--nj-${key}`] = value;
});

Object.entries(colors.semanticBg).forEach(([key, value]) => {
  cssVars[`--nj-${key}-bg`] = value;
});

Object.entries(colors.semanticBorder).forEach(([key, value]) => {
  cssVars[`--nj-${key}-border`] = value;
});

Object.entries(colors.neutral).forEach(([key, value]) => {
  cssVars[`--gray-${key}`] = value;
});

Object.entries(colors.bg).forEach(([key, value]) => {
  cssVars[`--bg-${key}`] = value;
});

Object.entries(colors.text).forEach(([key, value]) => {
  cssVars[`--text-${key}`] = value;
});

Object.entries(colors.border).forEach(([key, value]) => {
  cssVars[`--border-${key}`] = value;
});

Object.entries(spacing).forEach(([key, value]) => {
  cssVars[`--space-${key}`] = value;
});

Object.entries(radius).forEach(([key, value]) => {
  cssVars[`--radius-${key}`] = value;
});

Object.entries(shadows).forEach(([key, value]) => {
  cssVars[`--shadow-${key}`] = value;
});

Object.entries(typography.fontFamilies).forEach(([key, value]) => {
  cssVars[`--font-${key}`] = value;
});

Object.entries(typography.fontSizes).forEach(([key, value]) => {
  cssVars[`--font-size-${key}`] = value;
});

Object.entries(transitions).forEach(([key, value]) => {
  cssVars[`--motion-${key}`] = value;
});

Object.entries(zIndex).forEach(([key, value]) => {
  cssVars[`--z-${key}`] = String(value);
});

export function injectDesignTokens(): string {
  let css = ':root {\n';
  Object.entries(cssVars).forEach(([key, value]) => {
    css += `  ${key}: ${value};\n`;
  });
  css += '}\n';
  return css;
}

export const designTokens = cssVars;