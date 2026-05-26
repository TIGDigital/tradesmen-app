import { colors, elevation, haptics, motion, radius, space, statusColors, statusLabels, type } from './tokens';

const resolve = <T extends Record<string, any>>(group: T) =>
  Object.fromEntries(
    Object.entries(group).map(([k, v]) => [k, v.light])
  ) as { [K in keyof T]: T[K]['light'] };

export const lightTheme = {
  colors: {
    bg: resolve(colors.bg),
    border: resolve(colors.border),
    text: resolve(colors.text),
    brand: resolve(colors.brand),
    destructive: resolve(colors.destructive),
  },
  status: Object.fromEntries(
    Object.entries(statusColors).map(([k, v]) => [k, { text: v.text.light, bg: v.bg.light }])
  ) as Record<keyof typeof statusColors, { text: string; bg: string }>,
  statusLabels,
  elevation: elevation.light,
  type,
  space,
  radius,
  motion,
  haptics,
} as const;

export type Theme = typeof lightTheme;
