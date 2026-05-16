import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiClient } from "../api/client";
import { colors, spacing } from "../theme";
import { formatDate, formatMoney } from "../utils";
import { Badge, Button, Card, EmptyState, H1, H2, LoadingState, Muted } from "../components/ui";

type DashboardCard = {
  label: string;
  value: number | string;
  detail: string;
  detail_value?: number | string;
  detail_format?: "money" | "number";
  format: "money" | "number";
  icon?: string;
  accent?: boolean;
};

type DashboardData = {
  scope?: {
    role_label: string;
    workshop: string;
    title: string;
    subtitle: string;
  };
  cartes?: DashboardCard[];
  stats: Record<string, number>;
  alertes: {
    urgentes: Array<Record<string, unknown>>;
    retards: Array<Record<string, unknown>>;
    vip: Array<Record<string, unknown>>;
  };
  tailleurs: Array<Record<string, unknown>>;
  tendances_modeles: Array<Record<string, unknown>>;
  timeline?: {
    title: string;
    subtitle: string;
    badge: string;
    format: "money" | "number";
    points: Array<{ label: string; value: number | string }>;
  };
};

function emptyData(): DashboardData {
  return {
    stats: {
      commandes_en_cours: 0,
      commandes_urgentes: 0,
      commandes_retard: 0,
      revenus_jour: 0,
      revenus_mois: 0,
      clients_actifs: 0,
      paiements_incomplets: 0
    },
    alertes: { urgentes: [], retards: [], vip: [] },
    tailleurs: [],
    tendances_modeles: []
  };
}

function value(value: number | string, format: "money" | "number") {
  if (format === "money") return formatMoney(value);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function DashboardScreen({ api }: { api: ApiClient }) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await api.request<DashboardData>("/dashboard/");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard indisponible.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = data.cartes?.length
    ? data.cartes
    : [
        {
          label: "Commandes en cours",
          value: data.stats.commandes_en_cours || 0,
          detail: `${data.stats.commandes_urgentes || 0} urgentes`,
          format: "number" as const
        },
        {
          label: "Revenus du jour",
          value: data.stats.revenus_jour || 0,
          detail: "ce mois",
          detail_value: data.stats.revenus_mois || 0,
          detail_format: "money" as const,
          format: "money" as const
        },
        {
          label: "Clients actifs",
          value: data.stats.clients_actifs || 0,
          detail: "clients du perimetre",
          format: "number" as const
        },
        {
          label: "Retards",
          value: data.stats.commandes_retard || 0,
          detail: `${data.stats.paiements_incomplets || 0} paiements a suivre`,
          format: "number" as const
        }
      ];

  if (loading) return <LoadingState label="Chargement du tableau de bord..." />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Badge tone="green">API connectee</Badge>
          <H1>{data.scope?.title || "Tableau de bord"}</H1>
          <Muted>{data.scope?.subtitle || "Vue de suivi selon votre role."}</Muted>
          {data.scope?.workshop ? <Muted>Atelier: {data.scope.workshop}</Muted> : null}
        </View>
        <Button tone="neutral" onPress={load}>Actualiser</Button>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {cards.map((card) => (
          <Card key={card.label} style={styles.metric}>
            <Muted>{card.label}</Muted>
            <Text style={styles.metricValue}>{value(card.value, card.format)}</Text>
            <Muted>
              {card.detail_value !== undefined ? `${value(card.detail_value, card.detail_format || card.format)} ${card.detail}` : card.detail}
            </Muted>
          </Card>
        ))}
      </View>

      <Card style={styles.section}>
        <H2>{data.timeline?.title || "Tendance"}</H2>
        <Muted>{data.timeline?.subtitle || "Donnees recentes"}</Muted>
        {data.timeline?.points?.length ? (
          <View style={styles.bars}>
            {data.timeline.points.map((point) => {
              const max = Math.max(1, ...data.timeline!.points.map((item) => Number(item.value || 0)));
              const height = Math.max(4, Math.round((Number(point.value || 0) / max) * 90));
              return (
                <View key={point.label} style={styles.barWrap}>
                  <View style={[styles.bar, { height }]} />
                  <Text style={styles.barLabel}>{point.label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState label="Aucune tendance disponible." />
        )}
      </Card>

      <Card style={styles.section}>
        <H2>Alertes</H2>
        {[...data.alertes.urgentes, ...data.alertes.retards].slice(0, 5).map((item, index) => (
          <View key={`${item.id || index}`} style={styles.row}>
            <Text style={styles.rowTitle}>{String(item.code || item.title || "Alerte")}</Text>
            <Muted>{String(item.client__full_name || item.client_name || "")}</Muted>
            {item.delivery_date ? <Muted>Livraison {formatDate(item.delivery_date)}</Muted> : null}
          </View>
        ))}
        {data.alertes.urgentes.length + data.alertes.retards.length === 0 ? <EmptyState label="Aucune alerte." /> : null}
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
    gap: spacing.md
  },
  titleBlock: {
    gap: spacing.sm
  },
  error: {
    color: colors.red,
    borderWidth: 1,
    borderColor: "#f8717166",
    backgroundColor: "#f8717118",
    padding: spacing.md,
    borderRadius: 10
  },
  grid: {
    gap: spacing.md
  },
  metric: {
    gap: spacing.sm
  },
  metricValue: {
    color: colors.ivory,
    fontSize: 25,
    fontWeight: "800"
  },
  section: {
    gap: spacing.md
  },
  bars: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs
  },
  bar: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: colors.gold
  },
  barLabel: {
    color: colors.faint,
    fontSize: 11
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 4
  },
  rowTitle: {
    color: colors.ivory,
    fontWeight: "700"
  }
});
