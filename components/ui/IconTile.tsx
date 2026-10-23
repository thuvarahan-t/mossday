import { memo } from 'react';
import { View } from 'react-native';
import type { AccentName } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';

export type IconTileProps = {
  icon: IconName;
  /** System accent name, or a raw hex from data (category colours). */
  color: AccentName | string;
  size?: number;
  /** Neutral tile (e.g. the "New" category tile) with a label-coloured glyph. */
  neutral?: boolean;
};

/** Rounded-square icon with a white glyph, as in iOS Settings rows. */
export const IconTile = memo(function IconTile({ icon, color, size, neutral }: IconTileProps) {
  const theme = useTheme();
  const side = size ?? theme.sizes.iconTile;
  const background = neutral
    ? theme.colors.fill
    : color in theme.accents ? theme.accents[color as AccentName] : color;
  return (
    <View
      style={{
        width: side, height: side, borderRadius: Math.round(side * 0.25), borderCurve: 'continuous',
        backgroundColor: background, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(side * 0.58)} color={neutral ? 'label' : 'onTile'} strokeWidth={2.2} />
    </View>
  );
});
