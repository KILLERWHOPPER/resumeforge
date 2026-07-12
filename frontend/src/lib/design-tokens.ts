/**
 * ResumeForge Design System Tokens
 * Modern, accessible design tokens following Tailwind CSS conventions
 * Compatible with shadcn/ui component patterns
 */

// ============================================
// COLOR SYSTEM
// ============================================

// Base neutral colors (grayscale)
export const neutral = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
};

// Primary brand colors (Blue - professional, trustworthy)
export const primary = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  950: "#172554",
};

// Secondary colors (Slate - for subtle UI elements)
export const secondary = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
};

// Accent colors (Emerald - success, positive actions)
export const success = {
  50: "#f0fdf4",
  100: "#dcfce7",
  200: "#bbf7d0",
  300: "#86efac",
  400: "#4ade80",
  500: "#22c55e",
  600: "#16a34a",
  700: "#15803d",
  800: "#166534",
  900: "#14532d",
};

// Warning colors (Amber - caution, attention)
export const warning = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  300: "#fcd34d",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
};

// Error colors (Red - danger, errors)
export const error = {
  50: "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  300: "#fca5a5",
  400: "#f87171",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
  900: "#7f1d1d",
};

// Info colors (Cyan - information, links)
export const info = {
  50: "#ecfeff",
  100: "#cffafe",
  200: "#a5f3fc",
  300: "#67e8f9",
  400: "#22d3ee",
  500: "#06b6d4",
  600: "#0891b2",
  700: "#0e7490",
  800: "#155e75",
  900: "#164e63",
};

// ============================================
// SEMANTIC COLOR ALIASES (Light Mode)
// ============================================

export const colorsLight = {
  // Backgrounds
  background: {
    primary: neutral[50],      // Page background
    secondary: neutral[100],   // Card/section background
    tertiary: neutral[200],    // Hover/active backgrounds
    inverse: neutral[900],     // Dark backgrounds
  },

  // Text colors
  text: {
    primary: neutral[900],      // Main text
    secondary: neutral[600],    // Secondary text
    tertiary: neutral[400],     // Muted text, placeholders
    inverse: neutral[50],       // Text on dark backgrounds
    link: primary[600],         // Links
    linkHover: primary[700],    // Link hover
  },

  // Border colors
  border: {
    light: neutral[200],        // Default borders
    medium: neutral[300],       // Emphasized borders
    dark: neutral[400],         // Strong borders
    focus: primary[500],        // Focus rings
    error: error[500],          // Error state borders
    success: success[500],      // Success state borders
  },

  // Interactive states
  interactive: {
    // Primary actions
    primary: {
      bg: primary[600],
      bgHover: primary[700],
      bgActive: primary[800],
      bgDisabled: primary[300],
      text: neutral[50],
      textDisabled: neutral[200],
    },
    // Secondary actions
    secondary: {
      bg: neutral[100],
      bgHover: neutral[200],
      bgActive: neutral[300],
      bgDisabled: neutral[100],
      text: neutral[700],
      textDisabled: neutral[400],
      border: neutral[300],
    },
    // Ghost/outline actions
    ghost: {
      bgHover: neutral[100],
      bgActive: neutral[200],
      text: neutral[700],
      textHover: neutral[900],
    },
    // Destructive actions
    destructive: {
      bg: error[600],
      bgHover: error[700],
      bgActive: error[800],
      bgDisabled: error[300],
      text: neutral[50],
      textDisabled: neutral[200],
    },
  },

  // Component-specific
  card: {
    bg: neutral[50],
    border: neutral[200],
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    shadowHover: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  },

  input: {
    bg: neutral[50],
    border: neutral[300],
    borderHover: neutral[400],
    borderFocus: primary[500],
    borderError: error[500],
    placeholder: neutral[400],
    text: neutral[900],
    label: neutral[700],
  },

  badge: {
    default: { bg: neutral[100], text: neutral[700], border: neutral[200] },
    primary: { bg: primary[100], text: primary[700], border: primary[200] },
    success: { bg: success[100], text: success[700], border: success[200] },
    warning: { bg: warning[100], text: warning[700], border: warning[200] },
    error: { bg: error[100], text: error[700], border: error[200] },
    info: { bg: info[100], text: info[700], border: info[200] },
  },

  // Status indicators
  status: {
    draft: { bg: neutral[100], text: neutral[700], dot: neutral[400] },
    generating: { bg: primary[100], text: primary[700], dot: primary[500] },
    completed: { bg: success[100], text: success[700], dot: success[500] },
    failed: { bg: error[100], text: error[700], dot: error[500] },
    pending: { bg: warning[100], text: warning[700], dot: warning[500] },
  },

  // Overlay/modal
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.5)",
    modalBg: neutral[50],
    modalBorder: neutral[200],
  },

  // Toast notifications
  toast: {
    success: { bg: success[50], border: success[200], text: success[800], icon: success[600] },
    error: { bg: error[50], border: error[200], text: error[800], icon: error[600] },
    warning: { bg: warning[50], border: warning[200], text: warning[800], icon: warning[600] },
    info: { bg: info[50], border: info[200], text: info[800], icon: info[600] },
  },
};

// ============================================
// SEMANTIC COLOR ALIASES (Dark Mode)
// ============================================

export const colorsDark = {
  background: {
    primary: neutral[950],
    secondary: neutral[900],
    tertiary: neutral[800],
    inverse: neutral[50],
  },

  text: {
    primary: neutral[50],
    secondary: neutral[400],
    tertiary: neutral[500],
    inverse: neutral[900],
    link: primary[400],
    linkHover: primary[300],
  },

  border: {
    light: neutral[800],
    medium: neutral[700],
    dark: neutral[600],
    focus: primary[400],
    error: error[400],
    success: success[400],
  },

  interactive: {
    primary: {
      bg: primary[600],
      bgHover: primary[500],
      bgActive: primary[700],
      bgDisabled: primary[800],
      text: neutral[50],
      textDisabled: neutral[600],
    },
    secondary: {
      bg: neutral[800],
      bgHover: neutral[700],
      bgActive: neutral[600],
      bgDisabled: neutral[800],
      text: neutral[300],
      textDisabled: neutral[600],
      border: neutral[600],
    },
    ghost: {
      bgHover: neutral[800],
      bgActive: neutral[700],
      text: neutral[300],
      textHover: neutral[50],
    },
    destructive: {
      bg: error[600],
      bgHover: error[500],
      bgActive: error[700],
      bgDisabled: error[800],
      text: neutral[50],
      textDisabled: neutral[600],
    },
  },

  card: {
    bg: neutral[900],
    border: neutral[800],
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
    shadowHover: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
  },

  input: {
    bg: neutral[900],
    border: neutral[700],
    borderHover: neutral[600],
    borderFocus: primary[400],
    borderError: error[400],
    placeholder: neutral[500],
    text: neutral[50],
    label: neutral[300],
  },

  badge: {
    default: { bg: neutral[800], text: neutral[300], border: neutral[700] },
    primary: { bg: primary[900], text: primary[300], border: primary[800] },
    success: { bg: success[900], text: success[300], border: success[800] },
    warning: { bg: warning[900], text: warning[300], border: warning[800] },
    error: { bg: error[900], text: error[300], border: error[800] },
    info: { bg: info[900], text: info[300], border: info[800] },
  },

  status: {
    draft: { bg: neutral[800], text: neutral[300], dot: neutral[500] },
    generating: { bg: primary[900], text: primary[300], dot: primary[400] },
    completed: { bg: success[900], text: success[300], dot: success[400] },
    failed: { bg: error[900], text: error[300], dot: error[400] },
    pending: { bg: warning[900], text: warning[300], dot: warning[400] },
  },

  overlay: {
    backdrop: "rgba(0, 0, 0, 0.7)",
    modalBg: neutral[900],
    modalBorder: neutral[800],
  },

  toast: {
    success: { bg: success[900], border: success[800], text: success[100], icon: success[400] },
    error: { bg: error[900], border: error[800], text: error[100], icon: error[400] },
    warning: { bg: warning[900], border: warning[800], text: warning[100], icon: warning[400] },
    info: { bg: info[900], border: info[800], text: info[100], icon: info[400] },
  },
};

// ============================================
// SPACING SYSTEM
// ============================================

// Base unit: 4px (0.25rem)
export const spacing = {
  0: "0",
  1: "0.25rem",   // 4px
  2: "0.5rem",    // 8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  7: "1.75rem",   // 28px
  8: "2rem",      // 32px
  9: "2.25rem",   // 36px
  10: "2.5rem",   // 40px
  11: "2.75rem",  // 44px
  12: "3rem",     // 48px
  14: "3.5rem",   // 56px
  16: "4rem",     // 64px
  20: "5rem",     // 80px
  24: "6rem",     // 96px
  28: "7rem",     // 112px
  32: "8rem",     // 128px
  36: "9rem",     // 144px
  40: "10rem",    // 160px
  44: "11rem",    // 176px
  48: "12rem",    // 192px
  52: "13rem",    // 208px
  56: "14rem",    // 224px
  60: "15rem",    // 240px
  64: "16rem",    // 256px
  72: "18rem",    // 288px
  80: "20rem",    // 320px
  96: "24rem",    // 384px
};

// Semantic spacing aliases
export const space = {
  none: spacing[0],
  xs: spacing[1],      // 4px
  sm: spacing[2],      // 8px
  md: spacing[4],      // 16px
  lg: spacing[6],      // 24px
  xl: spacing[8],      // 32px
  "2xl": spacing[12],  // 48px
  "3xl": spacing[16],  // 64px
  "4xl": spacing[24],  // 96px
};

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const fontFamilies = {
  sans: [
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ].join(", "),
  mono: [
    "JetBrains Mono",
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace",
  ].join(", "),
};

export const fontSizes = {
  xs: ["0.75rem", { lineHeight: "1rem" }],      // 12px
  sm: ["0.875rem", { lineHeight: "1.25rem" }],  // 14px
  base: ["1rem", { lineHeight: "1.5rem" }],     // 16px
  lg: ["1.125rem", { lineHeight: "1.75rem" }],  // 18px
  xl: ["1.25rem", { lineHeight: "1.75rem" }],   // 20px
  "2xl": ["1.5rem", { lineHeight: "2rem" }],    // 24px
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
  "5xl": ["3rem", { lineHeight: "1" }],         // 48px
  "6xl": ["3.75rem", { lineHeight: "1" }],      // 60px
  "7xl": ["4.5rem", { lineHeight: "1" }],       // 72px
  "8xl": ["6rem", { lineHeight: "1" }],         // 96px
  "9xl": ["8rem", { lineHeight: "1" }],         // 128px
};

export const fontWeights = {
  thin: "100",
  extralight: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
};

export const lineHeights = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
};

export const letterSpacings = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
};

// Semantic typography
export const typography = {
  // Display headings
  display: {
    xl: { fontSize: fontSizes["6xl"][0], lineHeight: fontSizes["6xl"][1].lineHeight, fontWeight: fontWeights.bold, letterSpacing: letterSpacings.tight },
    lg: { fontSize: fontSizes["5xl"][0], lineHeight: fontSizes["5xl"][1].lineHeight, fontWeight: fontWeights.bold, letterSpacing: letterSpacings.tight },
    md: { fontSize: fontSizes["4xl"][0], lineHeight: fontSizes["4xl"][1].lineHeight, fontWeight: fontWeights.bold, letterSpacing: letterSpacings.tight },
    sm: { fontSize: fontSizes["3xl"][0], lineHeight: fontSizes["3xl"][1].lineHeight, fontWeight: fontWeights.semibold, letterSpacing: letterSpacings.tight },
  },

  // Headings
  heading: {
    h1: { fontSize: fontSizes["3xl"][0], lineHeight: fontSizes["3xl"][1].lineHeight, fontWeight: fontWeights.bold },
    h2: { fontSize: fontSizes["2xl"][0], lineHeight: fontSizes["2xl"][1].lineHeight, fontWeight: fontWeights.semibold },
    h3: { fontSize: fontSizes.xl[0], lineHeight: fontSizes.xl[1].lineHeight, fontWeight: fontWeights.semibold },
    h4: { fontSize: fontSizes.lg[0], lineHeight: fontSizes.lg[1].lineHeight, fontWeight: fontWeights.semibold },
    h5: { fontSize: fontSizes.base[0], lineHeight: fontSizes.base[1].lineHeight, fontWeight: fontWeights.semibold },
    h6: { fontSize: fontSizes.sm[0], lineHeight: fontSizes.sm[1].lineHeight, fontWeight: fontWeights.semibold },
  },

  // Body text
  body: {
    lg: { fontSize: fontSizes.lg[0], lineHeight: fontSizes.lg[1].lineHeight, fontWeight: fontWeights.normal },
    base: { fontSize: fontSizes.base[0], lineHeight: fontSizes.base[1].lineHeight, fontWeight: fontWeights.normal },
    sm: { fontSize: fontSizes.sm[0], lineHeight: fontSizes.sm[1].lineHeight, fontWeight: fontWeights.normal },
    xs: { fontSize: fontSizes.xs[0], lineHeight: fontSizes.xs[1].lineHeight, fontWeight: fontWeights.normal },
  },

  // Labels & UI text
  label: {
    lg: { fontSize: fontSizes.base[0], lineHeight: fontSizes.base[1].lineHeight, fontWeight: fontWeights.medium },
    base: { fontSize: fontSizes.sm[0], lineHeight: fontSizes.sm[1].lineHeight, fontWeight: fontWeights.medium },
    sm: { fontSize: fontSizes.xs[0], lineHeight: fontSizes.xs[1].lineHeight, fontWeight: fontWeights.medium },
  },

  // Code
  code: {
    sm: { fontSize: fontSizes.xs[0], lineHeight: fontSizes.xs[1].lineHeight, fontFamily: fontFamilies.mono },
    base: { fontSize: fontSizes.sm[0], lineHeight: fontSizes.sm[1].lineHeight, fontFamily: fontFamilies.mono },
    lg: { fontSize: fontSizes.base[0], lineHeight: fontSizes.base[1].lineHeight, fontFamily: fontFamilies.mono },
  },
};

// ============================================
// SHADOW SYSTEM
// ============================================

export const shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",

  // Colored shadows
  primary: {
    sm: "0 1px 3px 0 rgb(37 99 235 / 0.3), 0 1px 2px -1px rgb(37 99 235 / 0.3)",
    md: "0 4px 6px -1px rgb(37 99 235 / 0.3), 0 2px 4px -2px rgb(37 99 235 / 0.3)",
    lg: "0 10px 15px -3px rgb(37 99 235 / 0.3), 0 4px 6px -4px rgb(37 99 235 / 0.3)",
  },
  success: {
    sm: "0 1px 3px 0 rgb(22 163 74 / 0.3), 0 1px 2px -1px rgb(22 163 74 / 0.3)",
    md: "0 4px 6px -1px rgb(22 163 74 / 0.3), 0 2px 4px -2px rgb(22 163 74 / 0.3)",
  },
  error: {
    sm: "0 1px 3px 0 rgb(220 38 38 / 0.3), 0 1px 2px -1px rgb(220 38 38 / 0.3)",
    md: "0 4px 6px -1px rgb(220 38 38 / 0.3), 0 2px 4px -2px rgb(220 38 38 / 0.3)",
  },

  // Focus rings
  focus: "0 0 0 3px rgb(59 130 246 / 0.4)",
  focusError: "0 0 0 3px rgb(239 68 68 / 0.4)",
  focusSuccess: "0 0 0 3px rgb(34 197 94 / 0.4)",
};

// ============================================
// BORDER RADIUS SYSTEM
// ============================================

export const borderRadius = {
  none: "0",
  xs: "0.125rem",   // 2px
  sm: "0.25rem",    // 4px
  md: "0.375rem",   // 6px
  lg: "0.5rem",     // 8px
  xl: "0.75rem",    // 12px
  "2xl": "1rem",    // 16px
  "3xl": "1.5rem",  // 24px
  full: "9999px",
};

// Semantic radius
export const radius = {
  none: borderRadius.none,
  sm: borderRadius.sm,      // Small elements (badges, chips)
  md: borderRadius.md,      // Default (inputs, buttons)
  lg: borderRadius.lg,      // Cards, modals
  xl: borderRadius.xl,      // Large containers
  full: borderRadius.full,  // Pills, avatars
};

// ============================================
// TRANSITION & ANIMATION SYSTEM
// ============================================

export const transitions = {
  // Durations
  duration: {
    fastest: "50ms",
    fast: "100ms",
    normal: "150ms",
    slow: "200ms",
    slower: "300ms",
    slowest: "500ms",
  },

  // Easings
  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  // Common combinations
  default: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  fast: "100ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
};

// ============================================
// Z-INDEX SYSTEM
// ============================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  max: 2147483647,
};

// ============================================
// BREAKPOINTS (Tailwind compatible)
// ============================================

export const breakpoints = {
  sm: "640px",   // Small tablets
  md: "768px",   // Tablets
  lg: "1024px",  // Laptops
  xl: "1280px",  // Desktops
  "2xl": "1536px", // Large desktops
};

// ============================================
// CONTAINER SIZES
// ============================================

export const container = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
  full: "100%",
};

// ============================================
// COMPONENT DEFAULTS
// ============================================

export const components = {
  button: {
    height: {
      sm: "32px",
      md: "40px",
      lg: "48px",
      xl: "56px",
    },
    padding: {
      sm: "0.5rem 0.75rem",
      md: "0.625rem 1rem",
      lg: "0.75rem 1.5rem",
      xl: "1rem 2rem",
    },
    fontSize: {
      sm: fontSizes.xs[0],
      md: fontSizes.sm[0],
      lg: fontSizes.base[0],
      xl: fontSizes.lg[0],
    },
    borderRadius: radius.md,
    fontWeight: fontWeights.medium,
    transition: transitions.default,
    focusRing: shadows.focus,
  },

  input: {
    height: {
      sm: "32px",
      md: "40px",
      lg: "48px",
    },
    padding: {
      sm: "0.5rem 0.75rem",
      md: "0.625rem 1rem",
      lg: "0.75rem 1rem",
    },
    fontSize: {
      sm: fontSizes.xs[0],
      md: fontSizes.sm[0],
      lg: fontSizes.base[0],
    },
    borderRadius: radius.md,
    borderWidth: "1px",
    transition: transitions.default,
    focusRing: shadows.focus,
  },

  card: {
    padding: {
      sm: spacing[4],
      md: spacing[6],
      lg: spacing[8],
    },
    borderRadius: radius.lg,
    borderWidth: "1px",
    shadow: colorsLight.card.shadow,
    shadowHover: colorsLight.card.shadowHover,
  },

  modal: {
    maxWidth: {
      sm: "320px",
      md: "400px",
      lg: "560px",
      xl: "720px",
      full: "95vw",
    },
    borderRadius: radius.xl,
    padding: spacing[6],
    backdropBlur: "4px",
  },

  toast: {
    minWidth: "280px",
    maxWidth: "480px",
    padding: "1rem 1.25rem",
    borderRadius: radius.lg,
    borderWidth: "1px",
    gap: spacing[3],
    iconSize: "20px",
  },

  badge: {
    height: {
      sm: "20px",
      md: "24px",
      lg: "28px",
    },
    padding: {
      sm: "0 0.5rem",
      md: "0 0.625rem",
      lg: "0 0.75rem",
    },
    fontSize: {
      sm: fontSizes.xs[0],
      md: fontSizes.xs[0],
      lg: fontSizes.sm[0],
    },
    fontWeight: fontWeights.medium,
    borderRadius: radius.full,
  },

  avatar: {
    size: {
      xs: "24px",
      sm: "32px",
      md: "40px",
      lg: "48px",
      xl: "64px",
      "2xl": "80px",
    },
    borderRadius: radius.full,
  },

  table: {
    cellPadding: "0.75rem 1rem",
    headerFontWeight: fontWeights.semibold,
    headerFontSize: fontSizes.sm[0],
    rowFontSize: fontSizes.sm[0],
    borderWidth: "1px",
    borderColor: colorsLight.border.light,
    hoverBg: colorsLight.background.tertiary,
  },

  dropdown: {
    minWidth: "180px",
    maxWidth: "320px",
    padding: spacing[2],
    borderRadius: radius.lg,
    borderWidth: "1px",
    borderColor: colorsLight.border.light,
    shadow: shadows.lg,
    itemPadding: "0.5rem 0.75rem",
    itemBorderRadius: radius.md,
    itemHoverBg: colorsLight.background.tertiary,
    gap: spacing[1],
  },

  tabs: {
    height: "40px",
    indicatorHeight: "2px",
    indicatorColor: primary[600],
    tabPadding: "0 1rem",
    tabFontSize: fontSizes.sm[0],
    tabFontWeight: fontWeights.medium,
    gap: spacing[1],
  },

  tooltip: {
    maxWidth: "280px",
    padding: "0.5rem 0.75rem",
    fontSize: fontSizes.xs[0],
    borderRadius: radius.md,
    bg: neutral[900],
    text: neutral[50],
    shadow: shadows.lg,
    gap: spacing[2],
    arrowSize: "6px",
  },

  skeleton: {
    baseColor: neutral[200],
    highlightColor: neutral[100],
    animationDuration: "1.5s",
    borderRadius: radius.md,
  },

  progress: {
    height: {
      sm: "4px",
      md: "6px",
      lg: "8px",
    },
    borderRadius: radius.full,
    bg: neutral[200],
    indicatorBg: primary[600],
    transition: transitions.default,
  },

  switch: {
    width: "44px",
    height: "24px",
    thumbSize: "20px",
    borderRadius: radius.full,
    bgOff: neutral[300],
    bgOn: primary[600],
    thumbBg: neutral[50],
    transition: transitions.fast,
  },

  checkbox: {
    size: "18px",
    borderRadius: radius.sm,
    borderWidth: "2px",
    borderColor: colorsLight.border.medium,
    bgChecked: primary[600],
    borderColorChecked: primary[600],
    iconColor: neutral[50],
    transition: transitions.fast,
  },

  radio: {
    size: "18px",
    borderRadius: radius.full,
    borderWidth: "2px",
    borderColor: colorsLight.border.medium,
    bgChecked: primary[600],
    borderColorChecked: primary[600],
    innerDotSize: "8px",
    innerDotColor: neutral[50],
    transition: transitions.fast,
  },

  slider: {
    trackHeight: "4px",
    trackBorderRadius: radius.full,
    trackBg: neutral[200],
    thumbSize: "16px",
    thumbBorderRadius: radius.full,
    thumbBg: primary[600],
    thumbBorder: "0",
    thumbShadow: shadows.md,
    focusRing: shadows.focus,
    transition: transitions.fast,
  },
};

// ============================================
// EXPORT ALL TOKENS
// ============================================

export const tokens = {
  colors: {
    primitive: { neutral, primary, secondary, success, warning, error, info },
    semantic: { light: colorsLight, dark: colorsDark },
  },
  spacing,
  space,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  typography,
  shadows,
  borderRadius,
  radius,
  transitions,
  zIndex,
  breakpoints,
  container,
  components,
};

export default tokens;