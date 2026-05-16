import { ScrollView, StyleSheet, Text, View } from "react-native";

import { mobileApiConfig } from "../api/config";
import { colors, spacing } from "../theme";
import { Card, H1, H2, Muted } from "../components/ui";

export function ApiScreen() {
  const rows = Object.entries(mobileApiConfig);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <H1>API mobile</H1>
        <Muted>Configuration utilisee par l'application iOS et Android.</Muted>
      </View>
      <Card style={styles.section}>
        <H2>Connexion</H2>
        {rows.map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Muted>{key}</Muted>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </Card>
      <Card style={styles.section}>
        <H2>Headers</H2>
        <Muted>Chaque requete authentifiee envoie le token utilisateur. Si un atelier est actif, l'app ajoute aussi X-Workshop-ID.</Muted>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md
  },
  header: {
    gap: spacing.sm
  },
  section: {
    gap: spacing.md
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 4
  },
  value: {
    color: colors.ivory,
    fontWeight: "700"
  }
});
