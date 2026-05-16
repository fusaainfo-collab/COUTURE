import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiClient } from "../api/client";
import { colors, spacing } from "../theme";
import { ApiList } from "../types";
import { formatMoney } from "../utils";
import { Card, EmptyState, H1, H2, LoadingState, Muted } from "../components/ui";

type DashboardData = {
  stats: Record<string, number>;
};

type Row = Record<string, unknown>;

export function ReportsScreen({ api }: { api: ApiClient }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [tailors, setTailors] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [dashboardPayload, ordersPayload, paymentsPayload, clientsPayload, tailorsPayload] = await Promise.all([
        api.request<DashboardData>("/dashboard/"),
        api.list<Row>("/commandes/"),
        api.list<Row>("/paiements/"),
        api.list<Row>("/clients/"),
        api.list<Row>("/tailleurs/")
      ]);
      setDashboard(dashboardPayload);
      setOrders(ordersPayload.results);
      setPayments(paymentsPayload.results);
      setClients(clientsPayload.results);
      setTailors(tailorsPayload.results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Rapports indisponibles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Chargement des rapports..." />;

  const stats = dashboard?.stats || {};
  const indicators = [
    ["Revenus du jour", formatMoney(stats.revenus_jour || 0)],
    ["Revenus du mois", formatMoney(stats.revenus_mois || 0)],
    ["Benefice du mois", formatMoney(stats.benefice_mois || 0)],
    ["Commandes en cours", String(stats.commandes_en_cours || 0)],
    ["Commandes urgentes", String(stats.commandes_urgentes || 0)],
    ["Commandes en retard", String(stats.commandes_retard || 0)],
    ["Clients actifs", String(stats.clients_actifs || 0)]
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <H1>Rapports</H1>
        <Muted>Synthese mobile des donnees atelier.</Muted>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card style={styles.section}>
        <H2>Indicateurs</H2>
        {indicators.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Muted>{label}</Muted>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </Card>
      <List title="Paiements recents" rows={payments.slice(0, 6).map((item) => [String(item.client_name || "-"), formatMoney(item.amount), String(item.status || "-")])} />
      <List title="Commandes a suivre" rows={orders.slice(0, 6).map((item) => [String(item.code || "-"), String(item.client_name || "-"), String(item.status || "-")])} />
      <List title="Clients" rows={clients.slice(0, 6).map((item) => [String(item.full_name || "-"), String(item.phone || "-"), `VIP ${item.vip_level || 0}`])} />
      <List title="Tailleurs" rows={tailors.slice(0, 6).map((item) => [String(item.full_name || "-"), String(item.specialty || "-"), `${item.quality_score || "-"} / 5`])} />
    </ScrollView>
  );
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <Card style={styles.section}>
      <H2>{title}</H2>
      {rows.length === 0 ? <EmptyState label="Aucune donnee." /> : null}
      {rows.map((row, index) => (
        <View key={`${title}-${index}`} style={styles.row}>
          <Text style={styles.value}>{row[0]}</Text>
          <Muted>{row.slice(1).join(" | ")}</Muted>
        </View>
      ))}
    </Card>
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
    fontWeight: "800"
  },
  error: {
    color: colors.red,
    borderWidth: 1,
    borderColor: "#f8717166",
    backgroundColor: "#f8717118",
    padding: spacing.md,
    borderRadius: 10
  }
});
