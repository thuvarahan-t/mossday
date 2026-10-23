import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconTile } from '@/components/ui/IconTile';
import type { IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { formatLongDate, todayLocalDate } from '@/lib/date';

/** Logical width of shared images; captured at the device's pixel ratio, so it stays crisp. */
export const SHARE_CARD_WIDTH = 380;

export type ShareCardContent = {
  /** Tab icon shown in the brand row. */
  icon: IconName;
  title: string;
  subtitle?: string;
  body: ReactNode;
};

/**
 * Frame of every shared image: the Mossday brand row with today's date, the tab's title,
 * its summary content, and a quiet footer. Everything sits on one 20 pt grid.
 */
export function ShareCard({ icon, title, subtitle, body }: ShareCardContent) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { width: SHARE_CARD_WIDTH, padding: theme.spacing.xl, gap: theme.spacing.lg, backgroundColor: theme.colors.groupedBackground }]}>
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        <IconTile icon={icon} color="green" size={theme.sizes.iconTile - 4} />
        <Text variant="headline" style={styles.fill}>Mossday</Text>
        <Text variant="footnote" color="secondaryLabel">{formatLongDate(todayLocalDate())}</Text>
      </View>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title1">{title}</Text>
        {subtitle ? <Text color="secondaryLabel">{subtitle}</Text> : null}
      </View>
      {body}
      <Text variant="caption1" color="tertiaryLabel" align="center">Tracked with Mossday · offline and private</Text>
    </View>
  );
}

/** White rounded panel inside a share card (the cards of the app, without screen insets). */
export function SharePanel({ children, gap }: { children: ReactNode; gap?: number }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radii.card, borderCurve: 'continuous', padding: theme.spacing.lg, gap: gap ?? theme.spacing.md }}>
      {children}
    </View>
  );
}

/** One aligned line in a share panel: optional leading element, text, trailing value. */
export function ShareLine({ leading, title, detail, value, muted }: {
  leading?: ReactNode; title: string; detail?: string; value?: string; muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { gap: theme.spacing.md }]}>
      {leading}
      <View style={styles.fill}>
        <Text numberOfLines={1} color={muted ? 'secondaryLabel' : 'label'} strikethrough={muted}>{title}</Text>
        {detail ? <Text variant="footnote" color="secondaryLabel" numberOfLines={1}>{detail}</Text> : null}
      </View>
      {value ? <Text tabular>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
});
