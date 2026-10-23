import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Card } from './Card';
import { Icon } from './Icon';
import { IconTile, type IconTileProps } from './IconTile';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { ColorToken } from '@/constants/theme';
import type { TextVariant } from '@/constants/typography';

/**
 * iOS inset-grouped list: a card whose rows are split by hairlines that start at the text,
 * not under the icon. `separatorInset` defaults to rows with an icon tile.
 */
export function GroupedList({ children, separatorInset, style }: {
  children: ReactNode; separatorInset?: number; style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const inset = separatorInset ?? theme.sizes.rowPadding + theme.sizes.iconTile + theme.spacing.md;
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Card padding="none" style={style}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 && <Separator inset={inset} />}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

export function Separator({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: theme.sizes.hairline, marginLeft: inset, backgroundColor: theme.colors.separator }} />;
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: Pick<IconTileProps, 'icon' | 'color' | 'neutral'>;
  /** Right-hand text (secondary label) — amounts, settings values. */
  value?: string;
  valueColor?: ColorToken;
  /** `chevron` for navigation rows, or any control (Toggle, Stepper). */
  accessory?: 'chevron' | ReactNode;
  titleVariant?: TextVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Content below the title row (e.g. the per-category progress bar). */
  footer?: ReactNode;
};

/** A row inside `GroupedList`. Pressable rows highlight like iOS and scale very slightly. */
export function ListRow({
  title, subtitle, icon, value, valueColor = 'secondaryLabel', accessory, titleVariant = 'body',
  onPress, accessibilityLabel, footer,
}: ListRowProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  const body = (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.fill }, highlightStyle]} />
      <View style={[styles.row, { minHeight: theme.sizes.rowMinHeight, paddingHorizontal: theme.sizes.rowPadding, gap: theme.spacing.md }]}>
        {icon && <IconTile {...icon} />}
        <View style={[styles.text, { paddingVertical: theme.spacing.sm }]}>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <View style={styles.text}>
              <Text variant={titleVariant} numberOfLines={2}>{title}</Text>
              {subtitle ? <Text variant="subheadline" color="secondaryLabel" numberOfLines={2}>{subtitle}</Text> : null}
            </View>
            {value ? <Text color={valueColor} tabular numberOfLines={1}>{value}</Text> : null}
            {accessory === 'chevron'
              ? <Icon name="chevronRight" size={theme.sizes.iconSmall} color="tertiaryLabel" strokeWidth={2.4} />
              : accessory}
          </View>
          {footer}
        </View>
      </View>
    </>
  );

  if (!onPress) return <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>{body}</View>;
  return (
    <PressableScale pressedScale={0.98} pressProgress={progress} onPress={onPress} accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </PressableScale>
  );
}

/** Grouped-list header: footnote, uppercase, aligned with the row text. */
export function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="footnote"
      color="secondaryLabel"
      accessibilityRole="header"
      style={{
        textTransform: 'uppercase',
        paddingHorizontal: theme.sizes.screenInset + theme.sizes.rowPadding,
        marginTop: theme.spacing.xxl,
        marginBottom: theme.spacing.sm,
      }}
    >
      {title}
    </Text>
  );
}

/** Section title above a card ("Habits", "To-dos") with an optional trailing element. */
export function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionTitle, {
      paddingHorizontal: theme.sizes.titleInset, marginTop: theme.spacing.xxxl, marginBottom: theme.spacing.md,
    }]}>
      <Text variant="title3" weight="bold" accessibilityRole="header">{title}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
