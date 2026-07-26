/** Neural Justice — institutional intelligence console design tokens */

export const palette = {
  graphite: '#0B0E14',
  steel: '#1A1F2B',
  raised: '#242A38',
  serviceBlue: '#3E6E96',
  signalAmber: '#D69A3E',
  alertRed: '#C4453F',
  verifiedGreen: '#4C9E76',
} as const;

export const colors = {
  palette,
  brand: {
    navy: palette.graphite,
    navyLight: palette.steel,
    blue: palette.serviceBlue,
    blueLight: '#4A82AD',
    gold: palette.signalAmber,
  },
  semantic: {
    critical: palette.alertRed,
    high: palette.signalAmber,
    medium: palette.serviceBlue,
    low: palette.verifiedGreen,
    info: palette.serviceBlue,
    resolved: palette.verifiedGreen,
    inProgress: palette.signalAmber,
  },
  semanticBg: {
    critical: 'rgba(196, 69, 63, 0.12)',
    high: 'rgba(214, 154, 62, 0.12)',
    medium: 'rgba(62, 110, 150, 0.12)',
    low: 'rgba(76, 158, 118, 0.12)',
    info: 'rgba(62, 110, 150, 0.12)',
  },
  semanticBorder: {
    critical: 'rgba(196, 69, 63, 0.28)',
    high: 'rgba(214, 154, 62, 0.28)',
    medium: 'rgba(62, 110, 150, 0.28)',
    low: 'rgba(76, 158, 118, 0.28)',
    info: 'rgba(62, 110, 150, 0.28)',
  },
  neutral: {
    50: '#F4F5F7',
    100: '#E2E4E9',
    200: '#C5C9D2',
    300: '#9BA3B0',
    400: '#6B7380',
    500: '#4A5160',
    600: '#353B48',
    700: '#242A38',
    800: '#1A1F2B',
    900: '#0B0E14',
    950: '#060810',
  },
  bg: {
    primary: 'var(--bg-primary)',
    secondary: 'var(--bg-secondary)',
    tertiary: 'var(--bg-tertiary)',
    card: 'var(--bg-card)',
    sidebar: 'var(--bg-sidebar)',
    dark: 'var(--bg-dark)',
    raised: 'var(--bg-raised)',
  },
  text: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-tertiary)',
    inverse: 'var(--text-inverse)',
  },
  border: {
    primary: 'var(--border-primary)',
    secondary: 'var(--border-secondary)',
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  full: '9999px',
} as const;

export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  floating: 'var(--shadow-floating)',
  card: 'var(--shadow-card)',
} as const;

export const typography = {
  fontFamilies: {
    display: 'var(--font-display)',
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    kannada: 'var(--font-kannada)',
  },
  fontSizes: {
    display: '2rem',
    headingXl: '1.75rem',
    headingL: '1.5rem',
    headingM: '1.25rem',
    headingS: '1.125rem',
    bodyLg: '1rem',
    body: '0.875rem',
    caption: '0.75rem',
    micro: '0.625rem',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.06em',
    console: '0.12em',
  },
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const transitions = {
  instant: '0ms',
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  base: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
  panel: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const motion = {
  stagger: '60ms',
  reducedMotion: '0.01ms',
} as const;

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/** Standard chart time ranges — single convention app-wide */
export const chartTimeRanges = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
] as const;
