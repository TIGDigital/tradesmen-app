import { colors, elevation, haptics, motion, radius, space, statusColors, statusLabels, type } from './tokens';

const resolve = <T extends Record<string, any>>(group: T) =>
  Object.fromEntries(
    Object.entries(group).map(([k, v]) => [k, v.dark])
  ) as { [K in keyof T]: T[K]['dark'] };

export const darkTheme = {
  colors: {
    bg: resolve(colors.bg),
    border: resolve(colors.border),
    text: resolve(colors.text),
    brand: resolve(colors.brand),
    destructive: resolve(colors.destructive),
  },
  status: Object.fromEntries(
    Object.entries(statusColors).map(([k, v]) => [k, { text: v.text.dark, bg: v.bg.dark }])
  ) as Record<keyof typeof statusColors, { text: string; bg: string }>,
  statusLabels,
  elevation: elevation.dark,
  type,
  space,
  radius,
  motion,
  haptics,
} as const;
