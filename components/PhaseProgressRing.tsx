import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { lightTheme } from '@/theme/light';

/**
 * Progress ring that doubles as the Phase brand mark.
 *
 * The Phase logo is four 90° arcs of a circle; here they represent the
 * four quarters of a project. The arcs light up clockwise from the
 * top-right as progress crosses 25 / 50 / 75 / 100. At 0% all four arcs
 * are pale; at 100% the ring is fully Phase blue — visually identical
 * to the brand mark.
 *
 * The percentage sits centred inside in mono — the "instrument readout"
 * register from the Phase DS.
 */
export function PhaseProgressRing({
  pct,
  size = 72,
}: {
  pct: number;
  size?: number;
}) {
  const t = lightTheme;
  const main = t.colors.brand.primary; // blue-600
  const pale = '#C4D2F8'; // soft blue tint, reads as "not yet"

  const clamp = Math.max(0, Math.min(100, pct));
  // Light arcs at 25/50/75/100. Arc 1 lights at >0; arc 2 at >25; etc.
  const lit = [
    clamp > 0,
    clamp >= 25,
    clamp >= 50,
    clamp >= 75,
  ];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Arc 1 — top-right quadrant */}
      <Path
        d="M55.63 14.44 A36 36 0 0 1 85.56 44.37"
        stroke={lit[0] ? main : pale}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      {/* Arc 2 — bottom-right quadrant */}
      <Path
        d="M85.56 55.63 A36 36 0 0 1 55.63 85.56"
        stroke={lit[1] ? main : pale}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      {/* Arc 3 — bottom-left quadrant */}
      <Path
        d="M44.37 85.56 A36 36 0 0 1 14.44 55.63"
        stroke={lit[2] ? main : pale}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      {/* Arc 4 — top-left quadrant */}
      <Path
        d="M14.44 44.37 A36 36 0 0 1 44.37 14.44"
        stroke={lit[3] ? main : pale}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
      {/* Percentage label — mono, instrument-readout register */}
      <SvgText
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="GeistMono_500Medium"
        fontSize="22"
        fontWeight="600"
        fill={t.colors.text.primary}
      >
        {Math.round(clamp)}
      </SvgText>
    </Svg>
  );
}
