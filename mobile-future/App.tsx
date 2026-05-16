import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

import { ApiClient } from "./src/api/client";
import { mobileApiConfig } from "./src/api/config";
import { colors } from "./src/theme";
import { Session } from "./src/types";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";

export default function App() {
  const api = useMemo(() => new ApiClient(mobileApiConfig.API_BASE_URL), []);
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.ink).catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .loadSession()
      .then(setSession)
      .finally(() => setBooting(false));
  }, [api]);

  async function logout() {
    await api.clearSession();
    setSession(null);
  }

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.gold} />
        <StatusBar style="light" backgroundColor={colors.ink} translucent={false} />
      </View>
    );
  }

  return (
    <>
      {session ? (
        <HomeScreen api={api} session={session} onSessionChange={setSession} onLogout={logout} />
      ) : (
        <LoginScreen api={api} onLogin={setSession} />
      )}
      <StatusBar style="light" backgroundColor={colors.ink} translucent={false} />
    </>
  );
}
