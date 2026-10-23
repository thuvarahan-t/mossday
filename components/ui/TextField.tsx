import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fontFamilies, textVariants, type TextVariant } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** `outlined` = bordered field (one-time title), `filled` = grey field, `bare` = inline text (editor, card). */
  appearance?: 'outlined' | 'filled' | 'bare';
  variant?: TextVariant;
  bold?: boolean;
};

/** Text input styled with the type tokens; outlined fields turn green while focused. */
export function TextField({ appearance = 'outlined', variant = 'body', bold, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const { weight, ...metrics } = textVariants[variant];
  const framed = appearance !== 'bare';
  return (
    <TextInput
      {...rest}
      multiline={multiline}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
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
          borderColor: focused ? theme.colors.accentBar : theme.colors.separator,
        },
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
