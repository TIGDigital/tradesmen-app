import Svg, { Path } from 'react-native-svg';

import { lightTheme } from '@/theme/light';

/**
 * The Phase ring — four 90° arcs of a circle, three solid Phase blue and
 * one paler. Reads as "almost there" or "3/4 of the way through a phase."
 * The official brand mark.
 *
 * Props:
 *   size       — outer width/height in px (default 56)
 *   reversed   — render the pale arc in white instead of blue-300, for
 *                use on dark / brand-coloured backgrounds.
 *
 * Source: assets/brand/phase-mark.svg + phase-mark-white.svg.
 * Geometry is the spec — don't redraw it ad-hoc.
 */
export function PhaseLogo({ size = 56, reversed = false }: { size?: number; reversed?: boolean }) {
  const t = lightTheme;
  const main = t.colors.brand.primary;
  const pale = reversed ? '#FFFFFF' : '#91A8F6';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* three solid blue arcs */}
      <Path
        d="M55.63 14.44 A36 36 0 0 1 85.56 44.37"
        stroke={main}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M85.56 55.63 A36 36 0 0 1 55.63 85.56"
        stroke={main}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M44.37 85.56 A36 36 0 0 1 14.44 55.63"
        stroke={main}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      {/* fourth arc — paler */}
      <Path
        d="M14.44 44.37 A36 36 0 0 1 44.37 14.44"
        stroke={pale}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
