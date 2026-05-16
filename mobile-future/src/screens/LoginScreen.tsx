import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiClient } from "../api/client";
import { colors, spacing } from "../theme";
import { Session } from "../types";
import { Button, Card, Field, H1, Muted, PoweredByMask, Screen } from "../components/ui";

export function LoginScreen({ api, onLogin }: { api: ApiClient; onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!username.trim() || !password) {
      setError("Identifiant et mot de passe obligatoires.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await api.login(username.trim(), password);
      onLogin(session);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>CS</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>COUTURE SIR</Text>
              <Muted>Application atelier</Muted>
              <PoweredByMask />
            </View>
          </View>

          <View style={styles.hero}>
            <H1>Connexion</H1>
            <Muted>Accedez a vos commandes, clients, mesures, paiements et messages.</Muted>
          </View>

          <Card style={styles.form}>
            <Field
              label="Identifiant"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Votre identifiant"
            />
            <Field
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Votre mot de passe"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button onPress={submit} disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </Card>
          <View style={styles.poweredWrap}>
            <PoweredByMask />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.xl
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  logo: {
    height: 54,
    width: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d6b25e66",
    backgroundColor: "#d6b25e18",
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 18
  },
  brandTitle: {
    color: colors.ivory,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0
  },
  hero: {
    gap: spacing.sm
  },
  form: {
    gap: spacing.md
  },
  poweredWrap: {
    alignItems: "center"
  },
  error: {
    borderWidth: 1,
    borderColor: "#f8717166",
    backgroundColor: "#f8717118",
    color: colors.red,
    padding: spacing.md,
    borderRadius: 10,
    lineHeight: 20
  }
});
