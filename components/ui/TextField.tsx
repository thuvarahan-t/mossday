import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { fontFamilies, textVariants, type TextVariant } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { Icon } from './Icon';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** `outlined` = bordered field (one-time title), `filled` = grey field, `bare` = inline text (editor, card). */
  appearance?: 'outlined' | 'filled' | 'bare';
  variant?: TextVariant;
  bold?: boolean;
};

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Text input styled with the type tokens; outlined fields turn green while focused. */
export function TextField({ appearance = 'outlined', variant = 'body', bold, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const focus = useSharedValue(0);
  const { separator, accentBar } = theme.colors;
  const focusStyle = useAnimatedStyle(() => ({ borderColor: interpolateColor(focus.get(), [0, 1], [separator, accentBar]) }));
  const { weight, ...metrics } = textVariants[variant];
  const framed = appearance !== 'bare';
  return (
    <AnimatedTextInput
      {...rest}
      multiline={multiline}
      onFocus={(event) => { focus.set(animateTo(1, 'snappy', reduced)); onFocus?.(event); }}
      onBlur={(event) => { focus.set(animateTo(0, 'snappy', reduced)); onBlur?.(event); }}
      placeholderTextColor={theme.colors.tertiaryLabel}
      selectionColor={theme.colors.accentBar}
      cursorColor={theme.colors.accentBar}
      style={[
        metrics,
        {
          fontFamily: fontFamilies[bold ? 'bold' : weight],
          color: theme.colors.label,
          textAlignVertical: multiline ? 'top' : 'center',
          padding: 0,
        },
        framed && {
          minHeight: theme.sizes.fieldHeight,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: multiline ? theme.spacing.md : 0,
          borderRadius: theme.radii.lg,
          borderCurve: 'continuous',
          backgroundColor: appearance === 'filled' ? theme.colors.fill : theme.colors.card,
          borderWidth: appearance === 'outlined' ? 1.5 : 0,
        },
        framed && focusStyle,
      ]}
    />
  );
}

/** iOS search field: grey rounded field with a magnifier. */
export function SearchField({ value, onChangeText, placeholder = 'Search' }: {
  value: string; onChangeText: (text: string) => void; placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.search, {
      height: theme.sizes.searchHeight, borderRadius: theme.radii.md, backgroundColor: theme.colors.fill,
      paddingHorizontal: theme.spacing.sm, gap: theme.spacing.xs, marginHorizontal: theme.sizes.screenInset,
    }]}>
      <Icon name="search" size={theme.sizes.iconSmall + 1} color="secondaryLabel" />
      <View style={styles.flex}>
        <TextField
          appearance="bare"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={placeholder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', borderCurve: 'continuous' },
  flex: { flex: 1 },
});
