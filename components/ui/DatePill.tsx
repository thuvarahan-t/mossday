import { formatLongDate, formatShortDate, relativeDayName, todayLocalDate, type LocalDate } from '@/lib/date';
import { useTheme } from '@/hooks/useTheme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type DatePillProps = {
  date: LocalDate;
  today?: LocalDate;
  onPress: () => void;
};

/** Compact date selector; its parent owns cycling dates or opening a picker. */
export function DatePill({ date, today = todayLocalDate(), onPress }: DatePillProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={`Change date, ${formatLongDate(date)}`}
      style={{
        minHeight: theme.sizes.touchTarget,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="subheadline">{relativeDayName(date, today) ?? formatShortDate(date)}</Text>
    </PressableScale>
  );
}
