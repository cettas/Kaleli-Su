/**
 * Modern Design System for SUDAĞITIM PRO
 * Theme tokens and design constants
 */

export const theme = {
  // Brand Colors
  colors: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },
    secondary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    accent: {
      50: '#fef3c7',
      100: '#fde68a',
      200: '#fcd34d',
      300: '#fbbf24',
      400: '#f59e0b',
      500: '#d97706',
      600: '#b45309',
      700: '#92400e',
      800: '#78350f',
      900: '#451a03',
    },
    success: {
      light: '#d1fae5',
      DEFAULT: '#10b981',
      dark: '#047857',
    },
    warning: {
      light: '#fef3c7',
      DEFAULT: '#f59e0b',
      dark: '#d97706',
    },
    error: {
      light: '#fee2e2',
      DEFAULT: '#ef4444',
      dark: '#dc2626',
    },
    info: {
      light: '#dbeafe',
      DEFAULT: '#3b82f6',
      dark: '#1d4ed8',
    },
  },

  // Neutral Colors
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
  },

  // Border Radius
  borderRadius: {
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '2.5rem',  // 40px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: '0 0 20px rgb(79 70 229 / 0.3)',
    'glow-lg': '0 0 40px rgb(79 70 229 / 0.4)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: '600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Z-Index Scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
};

// CSS Custom Properties for runtime theming
export const cssVars = `
  :root {
    /* Primary Colors */
    --color-primary-50: ${theme.colors.primary[50]};
    --color-primary-100: ${theme.colors.primary[100]};
    --color-primary-200: ${theme.colors.primary[200]};
    --color-primary-300: ${theme.colors.primary[300]};
    --color-primary-400: ${theme.colors.primary[400]};
    --color-primary-500: ${theme.colors.primary[500]};
    --color-primary-600: ${theme.colors.primary[600]};
    --color-primary-700: ${theme.colors.primary[700]};
    --color-primary-800: ${theme.colors.primary[800]};
    --color-primary-900: ${theme.colors.primary[900]};

    /* Neutral Colors */
    --color-neutral-0: ${theme.neutral[0]};
    --color-neutral-50: ${theme.neutral[50]};
    --color-neutral-100: ${theme.neutral[100]};
    --color-neutral-200: ${theme.neutral[200]};
    --color-neutral-300: ${theme.neutral[300]};
    --color-neutral-400: ${theme.neutral[400]};
    --color-neutral-500: ${theme.neutral[500]};
    --color-neutral-600: ${theme.neutral[600]};
    --color-neutral-700: ${theme.neutral[700]};
    --color-neutral-800: ${theme.neutral[800]};
    --color-neutral-900: ${theme.neutral[900]};
    --color-neutral-950: ${theme.neutral[950]};

    /* Semantic Colors */
    --color-success: ${theme.colors.success.DEFAULT};
    --color-success-light: ${theme.colors.success.light};
    --color-warning: ${theme.colors.warning.DEFAULT};
    --color-warning-light: ${theme.colors.warning.light};
    --color-error: ${theme.colors.error.DEFAULT};
    --color-error-light: ${theme.colors.error.light};
    --color-info: ${theme.colors.info.DEFAULT};
    --color-info-light: ${theme.colors.info.light};

    /* Spacing */
    --spacing-xs: ${theme.spacing.xs};
    --spacing-sm: ${theme.spacing.sm};
    --spacing-md: ${theme.spacing.md};
    --spacing-lg: ${theme.spacing.lg};
    --spacing-xl: ${theme.spacing.xl};
    --spacing-2xl: ${theme.spacing['2xl]};
    --spacing-3xl: ${theme.spacing['3xl]};

    /* Border Radius */
    --radius-sm: ${theme.borderRadius.sm};
    --radius-md: ${theme.borderRadius.md};
    --radius-lg: ${theme.borderRadius.lg};
    --radius-xl: ${theme.borderRadius.xl};
    --radius-2xl: ${theme.borderRadius['2xl]};
    --radius-3xl: ${theme.borderRadius['3xl]};
    --radius-full: ${theme.borderRadius.full};

    /* Shadows */
    --shadow-sm: ${theme.shadows.sm};
    --shadow: ${theme.shadows.DEFAULT};
    --shadow-md: ${theme.shadows.md};
    --shadow-lg: ${theme.shadows.lg};
    --shadow-xl: ${theme.shadows.xl};
    --shadow-2xl: ${theme.shadows['2xl']};
    --shadow-glow: ${theme.shadows.glow};

    /* Transitions */
    --transition-fast: ${theme.transitions.fast};
    --transition-base: ${theme.transitions.base};
    --transition-slow: ${theme.transitions.slow};
    --transition-spring: ${theme.transitions.spring};
  }
`;

// Animation keyframes
export const animations = {
  fadeIn: 'fadeIn 0.3s ease-out',
  fadeOut: 'fadeOut 0.2s ease-in',
  slideInUp: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  slideInDown: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  slideInLeft: 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  slideInRight: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  scaleIn: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  scaleOut: 'scaleOut 0.2s ease-in',
  bounce: 'bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  spin: 'spin 1s linear infinite',
  shimmer: 'shimmer 2s linear infinite',
};

export const animationKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes slideInUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes slideInDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes slideInLeft {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes scaleOut {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(0.9); opacity: 0; }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgb(79 70 229 / 0.3); }
    50% { box-shadow: 0 0 40px rgb(79 70 229 / 0.5); }
  }

  @keyframes ripple {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
`;

export type Theme = typeof theme;
