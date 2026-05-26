/**
 * Design tokens — single source of truth.
 * Ported from 03_Design_System_and_Screen_Specs.md Part B.
 * Every color has a light + dark pair. Resolve via theme/light.ts or theme/dark.ts.
 */

type ColorPair = { light: string; dark: string };

export const colors = {
  bg: {
    canvas: { light: '#FBFAF7', dark: '#0E0E10' } as ColorPair,
    surface: { light: '#FFFFFF', dark: '#19191C' } as ColorPair,
    surface2: { light: '#F4F2EE', dark: '#222226' } as ColorPair,
    scrim: { light: 'rgba(11,11,12,0.35)', dark: 'rgba(0,0,0,0.55)' } as ColorPair,
  },
  border: {
    subtle: { light: '#ECEAE4', dark: '#2A2A30' } as ColorPair,
    strong: { light: '#D8D5CE', dark: '#3A3A42' } as ColorPair,
  },
  text: {
    primary: { light: '#0B0B0C', dark: '#FAFAF7' } as ColorPair,
    secondary: { light: '#52524F', dark: '#A8A8A2' } as ColorPair,
    tertiary: { light: '#8B8A85', dark: '#6D6D67' } as ColorPair,
    inverse: { light: '#FFFFFF', dark: '#0B0B0C' } as ColorPair,
    link: { light: '#1B4DD9', dark: '#7FA4FF' } as ColorPair,
  },
  brand: {
    primary: { light: '#1B4DD9', dark: '#1B4DD9' } as ColorPair,
    primaryPressed: { light: '#143BAA', dark: '#143BAA' } as ColorPair,
    tint: { light: '#EAF0FF', dark: '#0F1F45' } as ColorPair,
  },
  destructive: {
    text: { light: '#B5301A', dark: '#F47A65' } as ColorPair,
    bg: { light: '#FBE1DC', dark: '#3A150E' } as ColorPair,
  },
} as const;

/**
 * Status colors — keyed by project_status enum from the architecture doc.
 * Each entry has a text and bg pair in both modes.
 * Critical: `delayed` is warm amber, never red.
 */
export const statusColors = {
  quote_sent: {
    text: { light: '#8B6F2A', dark: '#F4D58B' } as ColorPair,
    bg: { light: '#FBF3DC', dark: '#3A2F11' } as ColorPair,
  },
  scheduled: {
    text: { light: '#1B4DD9', dark: '#7FA4FF' } as ColorPair,
    bg: { light: '#EAF0FF', dark: '#0F1F45' } as ColorPair,
  },
  materials_ordered: {
    text: { light: '#1B4DD9', dark: '#7FA4FF' } as ColorPair,
    bg: { light: '#EAF0FF', dark: '#0F1F45' } as ColorPair,
  },
  in_progress: {
    text: { light: '#197A4D', dark: '#62D69B' } as ColorPair,
    bg: { light: '#E2F5EA', dark: '#0F2A1D' } as ColorPair,
  },
  delayed: {
    text: { light: '#A04A1C', dark: '#F4A872' } as ColorPair,
    bg: { light: '#FBE9DC', dark: '#3A1F0E' } as ColorPair,
  },
  awaiting_approval: {
    text: { light: '#8B6F2A', dark: '#F4D58B' } as ColorPair,
    bg: { light: '#FBF3DC', dark: '#3A2F11' } as ColorPair,
  },
  awaiting_inspection: {
    text: { light: '#5B4A8B', dark: '#B5A2F4' } as ColorPair,
    bg: { light: '#EFEAFB', dark: '#221A38' } as ColorPair,
  },
  completed: {
    text: { light: '#0B0B0C', dark: '#FAFAF7' } as ColorPair,
    bg: { light: '#F4F2EE', dark: '#222226' } as ColorPair,
  },
} as const;

export type ProjectStatus = keyof typeof statusColors;

/**
 * Status copy map — humanised labels for StatusBadge.
 * Headlines (e.g. "On track for Friday") live with the screen, not here.
 */
export const statusLabels: Record<ProjectStatus, string> = {
  quote_sent: 'Quote sent',
  scheduled: 'Scheduled',
  materials_ordered: 'Materials ordered',
  in_progress: 'In progress',
  delayed: 'Delayed',
  awaiting_approval: 'Awaiting approval',
  awaiting_inspection: 'Awaiting inspection',
  completed: 'Completed',
};

/**
 * Elevation — RN-friendly shadow descriptors.
 * Use on the View's style as a spread: `{...elevation.light[2]}`.
 * Android elevation prop is included for parity.
 */
export const elevation = {
  light: {
    1: { shadowColor: '#0B0B0C', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    2: { shadowColor: '#0B0B0C', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    3: { shadowColor: '#0B0B0C', shadowOpacity: 0.08, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
    sheet: { shadowColor: '#0B0B0C', shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  },
  dark: {
    1: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    2: { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    3: { shadowColor: '#000000', shadowOpacity: 0.6, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
    sheet: { shadowColor: '#000000', shadowOpacity: 0.6, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  },
} as const;

/**
 * Typography — SF Pro by default on iOS (no fontFamily needed),
 * Inter as Android fallback (V1, not configured yet).
 * Letter spacing applied per spec hierarchy rules.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.3 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  bodyLg: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyLgEmphasis: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 0.4, textTransform: 'uppercase' as const },
  mono: { fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: 'Menlo' },
} as const;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

/**
 * Motion — for use with Reanimated's withTiming / withSpring.
 * Curves expressed as cubic bezier control points; supply via Easing.bezier.
 */
export const motion = {
  fast: { duration: 150, easing: [0.2, 0, 0, 1] as const },
  normal: { duration: 240, easing: [0.25, 1, 0.5, 1] as const },
  slow: { duration: 360, easing: [0.25, 1, 0.5, 1] as const },
  springSnappy: { damping: 18, stiffness: 220 },
  springGentle: { damping: 22, stiffness: 140 },
} as const;

/**
 * Haptics — descriptor strings map to expo-haptics calls.
 * Call site converts these to Haptics.* invocations.
 * Rule: never fire more often than every 2s on average.
 */
export const haptics = {
  primaryPress: 'impactLight',
  selection: 'selection',
  statusCompleted: 'notificationSuccess',
  milestoneTick: 'impactMedium',
  destructiveConfirm: 'notificationWarning',
  error: 'notificationError',
} as const;
