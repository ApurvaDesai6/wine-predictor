/**
 * Wine Price Prediction App - Design System
 * 
 * A unified design system inspired by Vivino's clean UX
 * with professional dark theme styling.
 */

export const colors = {
  // Background layers
  background: {
    DEFAULT: '#0c0f14',      // Near-black base
    secondary: '#13171d',     // Elevated surfaces
    tertiary: '#1a1f27',      // Cards/modals
    elevated: '#222831',      // Highest elevation
  },
  
  // Foreground text
  foreground: {
    DEFAULT: '#f8fafc',       // Primary text (white)
    secondary: '#94a3b8',     // Secondary text (slate)
    muted: '#64748b',         // Muted text
    subtle: '#475569',        // Very subtle text
  },
  
  // Accent colors - Wine-inspired palette
  accent: {
    primary: '#c9a227',       // Gold/Amber (primary actions)
    primaryHover: '#ddb52f',
    primaryMuted: 'rgba(201, 162, 39, 0.15)',
    
    secondary: '#8b2635',     // Burgundy/Wine red
    secondaryHover: '#a33344',
    secondaryMuted: 'rgba(139, 38, 53, 0.15)',
    
    tertiary: '#d4a574',      // Champagne/Gold
    tertiaryMuted: 'rgba(212, 165, 116, 0.15)',
  },
  
  // Semantic colors
  semantic: {
    success: '#22c55e',       // Green
    successMuted: 'rgba(34, 197, 94, 0.15)',
    successBg: 'rgba(34, 197, 94, 0.08)',
    
    warning: '#f59e0b',       // Amber
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    warningBg: 'rgba(245, 158, 11, 0.08)',
    
    error: '#ef4444',         // Red
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    errorBg: 'rgba(239, 68, 68, 0.08)',
    
    info: '#3b82f6',          // Blue
    infoMuted: 'rgba(59, 130, 246, 0.15)',
    infoBg: 'rgba(59, 130, 246, 0.08)',
  },
  
  // Border colors
  border: {
    DEFAULT: 'rgba(148, 163, 184, 0.1)',
    subtle: 'rgba(148, 163, 184, 0.05)',
    strong: 'rgba(148, 163, 184, 0.2)',
    accent: 'rgba(201, 162, 39, 0.3)',
  },
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',     // 12px
  lg: '1rem',        // 16px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  
  // Accent glow effects
  glow: {
    amber: '0 0 20px rgba(201, 162, 39, 0.3)',
    burgundy: '0 0 20px rgba(139, 38, 53, 0.3)',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-geist-mono)', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1.2' }],       // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const transitions = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
  bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Animation variants for Framer Motion
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
} as const;

// Common component styles
export const componentStyles = {
  card: {
    base: `bg-background-secondary border border-border-DEFAULT rounded-xl`,
    interactive: `hover:border-border-accent hover:shadow-lg transition-all duration-200`,
    elevated: `bg-background-tertiary shadow-xl`,
  },
  button: {
    primary: `bg-accent-primary hover:bg-accent-primaryHover text-background 
              font-semibold rounded-xl transition-all duration-200 
              active:scale-[0.98] focus:outline-none focus:ring-2 
              focus:ring-accent-primary/50`,
    secondary: `bg-background-tertiary hover:bg-background-elevated 
                text-foreground border border-border-DEFAULT 
                font-medium rounded-xl transition-all duration-200`,
    ghost: `text-foreground-secondary hover:text-foreground 
            hover:bg-background-tertiary rounded-lg transition-all duration-200`,
  },
  input: {
    base: `bg-background-tertiary border border-border-DEFAULT 
           text-foreground placeholder:text-foreground-subtle 
           rounded-xl focus:border-accent-primary focus:ring-1 
           focus:ring-accent-primary/30 transition-all duration-200`,
  },
  badge: {
    base: `inline-flex items-center gap-1.5 px-2.5 py-1 
           rounded-full text-xs font-medium`,
    success: `bg-semantic-successBg text-semantic-success border border-semantic-successMuted`,
    warning: `bg-semantic-warningBg text-semantic-warning border border-semantic-warningMuted`,
    error: `bg-semantic-errorBg text-semantic-error border border-semantic-errorMuted`,
    info: `bg-semantic-infoBg text-semantic-info border border-semantic-infoMuted`,
  },
} as const;

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
  motionVariants,
  componentStyles,
};
