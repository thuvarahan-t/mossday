import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace';

const ROWS: KeypadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'backspace']];

export type NumberKeypadProps = {
  onKey: (key: KeypadKey) => void;
  /** Long-press on backspace. */
  onClear?: () => void;
};

export type NumberKeypadLayoutProps = NumberKeypadProps & {
  /** Row height; forms on short screens pass less than the default (never below a touch target). */
  keyHeight?: number;
};

const Key = memo(function Key({ value, onKey, onClear }: { value: KeypadKey } & NumberKeypadProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const highlight = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const isBackspace = value === 'backspace';
  return (
    <PressableScale
      style={styles.key}
      pressProgress={progress}
      accessibilityLabel={isBackspace ? 'Delete' : value === '.' ? 'Decimal point' : value}
      onPress={() => { haptics.tap(); onKey(value); }}
      onLongPress={isBackspace && onClear ? () => { haptics.tick(); onClear(); } : undefined}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.highlight, {
          width: theme.sizes.keypadKeyHeight + theme.spacing.lg, height: '100%',
          borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill,
        }, highlight]}
      />
      {isBackspace
        ? <Icon name="backspace" size={theme.sizes.iconLarge + 6} />
        : <Text variant="largeTitle" weight="regular">{value}</Text>}
    </PressableScale>
  );
});

/** Phone-style amount keypad (no key backgrounds, a soft circle highlights the pressed key). */
export function NumberKeypad({ onKey, onClear, keyHeight }: NumberKeypadLayoutProps) {
  const theme = useTheme();
  const rowHeight = { height: Math.max(theme.sizes.touchTarget, keyHeight ?? theme.sizes.keypadKeyHeight) };
  return (
    <View style={{ paddingHorizontal: theme.spacing.xxl }}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={[styles.row, rowHeight]}>
          {row.map((value) => <Key key={value} value={value} onKey={onKey} onClear={onClear} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  key: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  highlight: { position: 'absolute' },
});
