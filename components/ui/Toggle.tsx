import { Switch, type SwitchProps } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = SwitchProps & {
  value: boolean;
  onValueChange: (v: boolean) => void;
};

/**
 * Wraps the RN Switch with our brand colours so toggles look on-spec.
 * iOS-native — keeps haptic + accessibility behaviour for free.
 */
export function Toggle({ value, onValueChange, ...rest }: Props) {
  const t = lightTheme;
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: t.colors.border.strong, true: t.colors.brand.primary }}
      ios_backgroundColor={t.colors.border.strong}
      {...rest}
    />
  );
}
