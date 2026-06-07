/**
 * Design tokens — single source of truth.
 *
 * Ported from the Phase Design System (Jun 2026):
 *   - "Stone" warm-neutral scale (paper, not stark white)
 *   - Phase Blue #1B4DD9 as the single brand colour
 *   - Tool semantics: muted green/amber/brick — never neon
 *   - Warm-tinted soft shadows (rgba(29,27,22,…))
 *   - Geist for body/headings, Geist Mono for stamped labels + numbers
 *   - Moderate radii: 6/10/14/20/28
 *
 * Every colour has a light + dark pair. Resolve via theme/light.ts or
 * theme/dark.ts. The dark mode is a warm graphite night, not pure black.
 */

type ColorPair = { light: string; dark: string };

export const colors = {
  bg: {
    // surface-page / surface-card / surface-sunken / scrim
    canvas:   { light: '#FBFAF7', dark: '#121211' } as ColorPair, // stone-25 / warm graphite night
    surface:  { light: '#FFFFFF', dark: '#1B1A17' } as ColorPair, // stone-0 / surface-card dark
    surface2: { light: '#F6F4EE', dark: '#161512' } as ColorPair, // stone-50 / surface-sunken dark
    scrim:    { light: 'rgba(29,27,22,0.35)', dark: 'rgba(0,0,0,0.55)' } as ColorPair,
  },
  border: {
    subtle: { light: '#ECE8DF', dark: '#262420' } as ColorPair, // stone-100
    strong: { light: '#DDD8CC', dark: '#322F29' } as ColorPair, // stone-200
  },
  text: {
    primary:   { light: '#1D1B16', dark: '#F4F1EA' } as ColorPair, // stone-900 / dark text-strong
    secondary: { light: '#494539', dark: '#D3CDC0' } as ColorPair, // stone-700 / dark text-body
    tertiary:  { light: '#7E7768', dark: '#968F7F' } as ColorPair, // stone-500 / dark text-muted
    inverse:   { light: '#FBFAF7', dark: '#1D1B16' } as ColorPair,
    link:      { light: '#1A3FB0', dark: '#91A8F6' } as ColorPair, // blue-700 / blue-300
  },
  brand: {
    primary:        { light: '#1B4DD9', dark: '#3257E4' } as ColorPair, // blue-600 / blue-500
    primaryPressed: { light: '#1A3FB0', dark: '#1B4DD9' } as ColorPair, // blue-700 / blue-600
    tint:           { light: '#EEF2FE', dark: '#1B336E' } as ColorPair, // blue-50 / blue-900-ish
  },
  destructive: {
    text: { light: '#A13A23', dark: '#E07A5F' } as ColorPair, // brick-600
    bg:   { light: '#F7E9E4', dark: '#3A1A12' } as ColorPair, // brick-50 / warm shade
  },
} as const;

/**
 * Status colours — keyed by project_status enum.
 *
 * Phase Design System rule: muted, tool-like, never neon. Delayed is warm
 * brick (not fire-alarm red); awaiting/scheduled use the same family.
 */
export const statusColors = {
  quote_sent: {
    // attention / awaiting
    text: { light: '#855818', dark: '#E0A951' } as ColorPair, // amber-700
    bg:   { light: '#F8EFDD', dark: '#2A2113' } as ColorPair, // amber-50
  },
  scheduled: {
    // info
    text: { light: '#1A3FB0', dark: '#91A8F6' } as ColorPair, // blue-700
    bg:   { light: '#EEF2FE', dark: '#1B2545' } as ColorPair, // blue-50
  },
  materials_ordered: {
    text: { light: '#1A3FB0', dark: '#91A8F6' } as ColorPair,
    bg:   { light: '#EEF2FE', dark: '#1B2545' } as ColorPair,
  },
  in_progress: {
    // on-track
    text: { light: '#19724B', dark: '#4CB583' } as ColorPair, // green-600
    bg:   { light: '#E8F3EC', dark: '#16291F' } as ColorPair, // green-50
  },
  delayed: {
    // blocked — warm brick, not red
    text: { light: '#A13A23', dark: '#E07A5F' } as ColorPair, // brick-600
    bg:   { light: '#F7E9E4', dark: '#3A1A12' } as ColorPair, // brick-50
  },
  awaiting_approval: {
    text: { light: '#855818', dark: '#E0A951' } as ColorPair,
    bg:   { light: '#F8EFDD', dark: '#2A2113' } as ColorPair,
  },
  awaiting_inspection: {
    text: { light: '#855818', dark: '#E0A951' } as ColorPair,
    bg:   { light: '#F8EFDD', dark: '#2A2113' } as ColorPair,
  },
  completed: {
    // strong neutral — like a stamp
    text: { light: '#1D1B16', dark: '#F4F1EA' } as ColorPair,
    bg:   { light: '#F6F4EE', dark: '#2F2C25' } as ColorPair,
  },
} as const;

export type ProjectStatus = keyof typeof statusColors;

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
 * Elevation — RN-friendly shadow descriptors using Phase's warm-tinted
 * shadow base (#1D1B16 / rgba(29,27,22,…)) so shadows feel like the
 * room they're in, not generic black.
 */
export const elevation = {
  light: {
    1: { shadowColor: '#1D1B16', shadowOpacity: 0.06, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    2: { shadowColor: '#1D1B16', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, // shadow-sm
    3: { shadowColor: '#1D1B16', shadowOpacity: 0.10, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 8 }, // shadow-lg
    sheet: { shadowColor: '#1D1B16', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  },
  dark: {
    1: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    2: { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    3: { shadowColor: '#000000', shadowOpacity: 0.6, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
    sheet: { shadowColor: '#000000', shadowOpacity: 0.6, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  },
} as const;

/**
 * Typography — Geist for everything, Geist Mono for "stamped" mono labels
 * (status codes, dates, metrics).
 *
 * Phase rule: display + headings get tight negative tracking; mono labels
 * uppercase with 0.12em tracking (~12% letter-spacing) — the "Fluke
 * instrument" register.
 *
 * Font family names match what @expo-google-fonts/geist registers when
 * loaded via useFonts() in app/_layout.tsx.
 */
export const type = {
  display:        { fontSize: 34, lineHeight: 41, fontWeight: '600', letterSpacing: -0.85, fontFamily: 'Geist_600SemiBold' },
  title1:         { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.5,  fontFamily: 'Geist_600SemiBold' },
  title2:         { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.35, fontFamily: 'Geist_600SemiBold' },
  title3:         { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2,  fontFamily: 'Geist_600SemiBold' },
  bodyLg:         { fontSize: 17, lineHeight: 24, fontWeight: '400', fontFamily: 'Geist_400Regular' },
  bodyLgEmphasis: { fontSize: 17, lineHeight: 24, fontWeight: '600', fontFamily: 'Geist_600SemiBold' },
  body:           { fontSize: 15, lineHeight: 22, fontWeight: '400', fontFamily: 'Geist_400Regular' },
  footnote:       { fontSize: 13, lineHeight: 18, fontWeight: '400', fontFamily: 'Geist_400Regular' },
  // "Tool stamp" — uppercase mono labels with wide tracking. Signature Phase move.
  caption:        { fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 1.32, textTransform: 'uppercase' as const, fontFamily: 'GeistMono_500Medium' },
  mono:           { fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: 'GeistMono_500Medium' },
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

/**
 * Corner radii — Phase prescribes 6 / 10 / 14 / 20 / 28. We don't
 * pill-everything; pills are reserved for status + toggles via `full`.
 */
export const radius = {
  sm: 6,   // small chip
  md: 10,  // default control (input, button)
  lg: 14,  // card
  xl: 20,  // sheet / large panel
  '2xl': 28, // app-icon-scale tile
  full: 9999,
} as const;

/**
 * Motion — Phase rule: calm and dependable, no bounce, no overshoot.
 * Quick ease-out, 120-180ms.
 */
export const motion = {
  fast:        { duration: 120, easing: [0.2, 0, 0, 1] as const },
  normal:      { duration: 180, easing: [0.2, 0, 0, 1] as const },
  slow:        { duration: 260, easing: [0.16, 1, 0.3, 1] as const },
  springSnappy:{ damping: 22, stiffness: 240 },
  springGentle:{ damping: 26, stiffness: 160 },
} as const;

export const haptics = {
  primaryPress:        'impactLight',
  selection:           'selection',
  statusCompleted:     'notificationSuccess',
  milestoneTick:       'impactMedium',
  destructiveConfirm:  'notificationWarning',
  error:               'notificationError',
} as const;
