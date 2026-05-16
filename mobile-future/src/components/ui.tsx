import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle
} from "react-native";

import { colors, spacing, toneColor } from "../theme";

export function Screen({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: PropsWithChildren) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: PropsWithChildren) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function PoweredByMask() {
  return <Text style={styles.powered}>Powered by MASK</Text>;
}

export function Badge({
  children,
  tone = "neutral"
}: PropsWithChildren<{ tone?: "neutral" | "gold" | "green" | "red" | "blue" }>) {
  const color = toneColor(tone);
  return (
    <View style={[styles.badge, { borderColor: `${color}66`, backgroundColor: `${color}18` }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

export function Button({
  children,
  onPress,
  disabled,
  tone = "gold",
  style
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
  style?: ViewStyle;
}>) {
  const color = toneColor(tone);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: disabled ? colors.line : `${color}99`,
          backgroundColor: disabled ? colors.panelSoft : `${color}22`,
          opacity: pressed ? 0.75 : disabled ? 0.55 : 1
        },
        style
      ]}
    >
      <Text style={[styles.buttonText, { color: disabled ? colors.faint : color }]}>{children}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        style={[styles.input, props.multiline ? styles.inputMultiline : null]}
        {...props}
      />
    </View>
  );
}

export function ChoiceRow({
  options,
  value,
  onChange
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.choiceScroller}
      contentContainerStyle={styles.choiceRow}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, active ? styles.choiceActive : null]}
          >
            <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function LoadingState({ label = "Chargement..." }: { label?: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.gold} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: 10,
    padding: spacing.md
  },
  h1: {
    color: colors.ivory,
    fontSize: 26,
    fontWeight: "700"
  },
  h2: {
    color: colors.ivory,
    fontSize: 18,
    fontWeight: "700"
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20
  },
  powered: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700"
  },
  fieldWrap: {
    gap: spacing.xs
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.ink,
    color: colors.ivory,
    paddingHorizontal: spacing.md,
    fontSize: 14
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: spacing.md
  },
  choiceRow: {
    gap: spacing.sm,
    paddingVertical: 2
  },
  choiceScroller: {
    flexGrow: 0
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panelSoft
  },
  choiceActive: {
    borderColor: colors.gold,
    backgroundColor: "#d6b25e22"
  },
  choiceText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  choiceTextActive: {
    color: colors.gold
  },
  centerState: {
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28
  },
  emptyText: {
    color: colors.faint,
    fontSize: 14,
    textAlign: "center"
  }
});
