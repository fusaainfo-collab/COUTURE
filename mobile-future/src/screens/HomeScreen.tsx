import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { ApiClient } from "../api/client";
import { menuItems, resourceConfigs } from "../config/modules";
import { colors, spacing } from "../theme";
import { ApiList, ScreenKey, Session } from "../types";
import { getRole } from "../utils";
import { ApiScreen } from "./ApiScreen";
import { DashboardScreen } from "./DashboardScreen";
import { MessagesScreen } from "./MessagesScreen";
import { ReportsScreen } from "./ReportsScreen";
import { ResourceScreen } from "./ResourceScreen";
import { Badge, Button, ChoiceRow, Muted, PoweredByMask } from "../components/ui";

type Workshop = {
  id: number;
  name: string;
  role?: string;
};

export function HomeScreen({
  api,
  session,
  onSessionChange,
  onLogout
}: {
  api: ApiClient;
  session: Session;
  onSessionChange: (session: Session) => void;
  onLogout: () => void;
}) {
  const role = getRole(session.user);
  const [active, setActive] = useState<ScreenKey>("dashboard");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopError, setWorkshopError] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  const visibleMenu = useMemo(() => menuItems.filter((item) => item.roles.includes(role)), [role]);
  const activeItem = visibleMenu.find((item) => item.key === active);
  const activeWorkshopId = session.workshopId || String(workshops[0]?.id || "");
  const activeWorkshop = workshops.find((workshop) => String(workshop.id) === activeWorkshopId);
  const drawerWidth = Math.min(304, Math.max(260, width - 44));

  useEffect(() => {
    if (!visibleMenu.some((item) => item.key === active)) {
      setActive("dashboard");
    }
  }, [active, visibleMenu]);

  useEffect(() => {
    api
      .list<Workshop>("/workshops/")
      .then((payload: ApiList<Workshop>) => {
        setWorkshops(payload.results);
        const selected = session.workshopId || String(payload.results[0]?.id || "");
        if (selected && selected !== session.workshopId) {
          api.saveWorkshopId(selected);
          onSessionChange({ ...session, workshopId: selected });
        }
      })
      .catch((error) => setWorkshopError(error instanceof Error ? error.message : "Ateliers indisponibles."));
  }, [api]);

  useEffect(() => {
    if (!drawerVisible) return;
    Animated.timing(drawerProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [drawerProgress, drawerVisible]);

  async function changeWorkshop(workshopId: string) {
    await api.saveWorkshopId(workshopId);
    onSessionChange({ ...session, workshopId });
    Alert.alert("Atelier actif", "Le contexte atelier a ete change.");
  }

  function openDrawer() {
    setDrawerVisible(true);
  }

  function closeDrawer() {
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  }

  function selectScreen(screen: ScreenKey) {
    setActive(screen);
    closeDrawer();
  }

  function renderActiveScreen() {
    if (active === "dashboard") return <DashboardScreen api={api} />;
    if (active === "reports") return <ReportsScreen api={api} />;
    if (active === "messages") return <MessagesScreen api={api} user={session.user} />;
    if (active === "api") return <ApiScreen />;
    const config = resourceConfigs[active];
    return <ResourceScreen api={api} config={config} role={role} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable onPress={openDrawer} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>Menu</Text>
          </Pressable>
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>{activeWorkshop?.name || "Atelier Couture"}</Text>
            <Muted>{menuLabel(activeItem, role)}</Muted>
            <PoweredByMask />
          </View>
          <Badge tone="gold">{role}</Badge>
        </View>

        {workshopError ? <Text style={styles.warning}>{workshopError}</Text> : null}

        <View style={styles.content}>{renderActiveScreen()}</View>

        <Modal transparent visible={drawerVisible} animationType="none" onRequestClose={closeDrawer}>
          <View style={styles.drawerRoot}>
            <Pressable style={styles.backdrop} onPress={closeDrawer} />
            <Animated.View
              style={[
                styles.drawer,
                {
                  width: drawerWidth,
                  transform: [
                    {
                      translateX: drawerProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-drawerWidth, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.drawerHeader}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>CS</Text>
                </View>
                <View style={styles.drawerTitleBlock}>
                  <Text style={styles.drawerTitle}>{activeWorkshop?.name || "Atelier Couture"}</Text>
                  <Muted>Gestion atelier</Muted>
                </View>
                <Pressable onPress={closeDrawer} style={styles.closeButton}>
                  <Text style={styles.closeText}>X</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.drawerMenu}>
                {visibleMenu.map((item) => {
                  const selected = item.key === active;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => selectScreen(item.key)}
                      style={[styles.drawerItem, selected ? styles.drawerItemActive : null]}
                    >
                      <Text style={[styles.drawerItemText, selected ? styles.drawerItemTextActive : null]}>
                        {menuLabel(item, role)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.drawerFooter}>
                {workshops.length ? (
                  <View style={styles.workshops}>
                    <Muted>Atelier actif</Muted>
                    <ChoiceRow
                      value={activeWorkshopId}
                      onChange={changeWorkshop}
                      options={workshops.map((workshop) => ({ label: workshop.name, value: String(workshop.id) }))}
                    />
                  </View>
                ) : null}
                <View style={styles.userCard}>
                  <Text style={styles.userName}>{session.user.full_name || session.user.username || "Utilisateur"}</Text>
                  <Muted>{sessionLabel(role)}</Muted>
                  <PoweredByMask />
                  <Button tone="neutral" onPress={onLogout} style={styles.logoutButton}>
                    Deconnexion
                  </Button>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function menuLabel(item: (typeof menuItems)[number] | undefined, role: string) {
  if (!item) return "Dashboard";
  return role === "client" && item.clientLabel ? item.clientLabel : item.label;
}

function sessionLabel(role: string) {
  if (role === "admin") return "Session admin";
  if (role === "client") return "Espace client";
  if (role === "tailor") return "Espace tailleur";
  return "Session atelier";
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink
  },
  shell: {
    flex: 1,
    backgroundColor: colors.ink
  },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  menuButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.panelSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  menuButtonText: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "800"
  },
  brand: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  brandTitle: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0
  },
  workshops: {
    gap: spacing.sm
  },
  warning: {
    margin: spacing.md,
    color: colors.red
  },
  content: {
    flex: 1
  },
  drawerRoot: {
    flex: 1,
    flexDirection: "row"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000099"
  },
  drawer: {
    height: "100%",
    backgroundColor: "#08090bf2",
    borderRightWidth: 1,
    borderRightColor: colors.line,
    padding: spacing.md
  },
  drawerHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  logo: {
    height: 42,
    width: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6b25e66",
    backgroundColor: "#d6b25e18",
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.gold,
    fontWeight: "900"
  },
  drawerTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  drawerTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "800"
  },
  closeButton: {
    height: 38,
    width: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  drawerMenu: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs
  },
  drawerItem: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: "center"
  },
  drawerItemActive: {
    backgroundColor: "#f7f1e81f"
  },
  drawerItemText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  drawerItemTextActive: {
    color: colors.ivory
  },
  drawerFooter: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md
  },
  userCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: "#f7f1e80e",
    padding: spacing.md,
    gap: spacing.sm
  },
  userName: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "800"
  },
  logoutButton: {
    marginTop: spacing.xs
  }
});
