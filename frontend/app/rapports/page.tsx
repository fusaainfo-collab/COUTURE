"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer, RefreshCw, WalletCards } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardData = {
  stats: {
    commandes_en_cours: number;
    commandes_urgentes: number;
    commandes_retard: number;
    revenus_jour: number | string;
    revenus_mois: number | string;
    depenses_mois: number | string;
    benefice_mois: number | string;
    clients_actifs: number;
    paiements_incomplets: number;
  };
};

type Order = {
  code: string;
  client_name: string;
  status: string;
  priority: string;
  delivery_date: string;
  total_price: string;
  balance_due: string;
};

type Payment = {
  reference: string;
  client_name: string;
  amount: string;
  method: string;
  status: string;
  paid_at: string;
};

type Client = {
  full_name: string;
  phone: string;
  vip_level: number;
  commandes_actives: number;
};

type Tailor = {
  full_name: string;
  specialty: string;
  status: string;
  quality_score: string | number;
  commandes_actives: number;
};

export default function RapportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const [dashboardPayload, ordersPayload, paymentsPayload, clientsPayload, tailorsPayload] = await Promise.all([
        apiFetch<DashboardData>("/dashboard/"),
        apiFetch<ApiList<Order>>("/commandes/"),
        apiFetch<ApiList<Payment>>("/paiements/"),
        apiFetch<ApiList<Client>>("/clients/"),
        apiFetch<ApiList<Tailor>>("/tailleurs/")
      ]);

      setDashboard(dashboardPayload);
      setOrders(ordersPayload.results);
      setPayments(paymentsPayload.results);
      setClients(clientsPayload.results);
      setTailors(tailorsPayload.results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const reportRows = useMemo(
    () => [
      ["Revenus du jour", formatMoney(dashboard?.stats.revenus_jour ?? 0), "Finance"],
      ["Revenus du mois", formatMoney(dashboard?.stats.revenus_mois ?? 0), "Finance"],
      ["Benefice du mois", formatMoney(dashboard?.stats.benefice_mois ?? 0), "Finance"],
      ["Commandes en cours", String(dashboard?.stats.commandes_en_cours ?? 0), "Production"],
      ["Commandes urgentes", String(dashboard?.stats.commandes_urgentes ?? 0), "Production"],
      ["Commandes en retard", String(dashboard?.stats.commandes_retard ?? 0), "Production"],
      ["Clients actifs", String(dashboard?.stats.clients_actifs ?? 0), "Clients"]
    ],
    [dashboard]
  );

  function exportSummaryCsv() {
    const csv = toCsv([["Indicateur", "Valeur", "Module"], ...reportRows]);
    downloadFile(`rapport-synthese-${todaySlug()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportFullJson() {
    const payload = {
      generated_at: new Date().toISOString(),
      dashboard,
      orders,
      payments,
      clients,
      tailors
    };
    downloadFile(`rapport-complet-${todaySlug()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">Rapports live</Badge>
              <Badge tone="gold">Exports operationnels</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <WalletCards size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Rapports</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Synthese atelier, exports financiers, production, clients et tailleurs.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadReports} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button variant="secondary" onClick={exportSummaryCsv} disabled={loading || !dashboard}>
              <Download size={17} />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={exportFullJson} disabled={loading || !dashboard}>
              <FileText size={17} />
              Export complet
            </Button>
            <Button onClick={() => window.print()} disabled={loading || !dashboard}>
              <Printer size={17} />
              Imprimer PDF
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Commandes" value={dashboard?.stats.commandes_en_cours ?? 0} tone="green" />
          <Metric label="Retards" value={dashboard?.stats.commandes_retard ?? 0} tone="red" />
          <Metric label="Revenus mois" value={formatMoney(dashboard?.stats.revenus_mois ?? 0)} tone="gold" />
          <Metric label="Clients" value={dashboard?.stats.clients_actifs ?? 0} tone="green" />
        </section>

        {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}

        <section className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
          <div className="border-b border-line pb-4">
            <h2 className="text-lg font-semibold">Synthese generale</h2>
            <p className="mt-1 text-sm text-stone-500">Derniere generation: {formatDate(new Date().toISOString())}</p>
          </div>

          {loading ? (
            <div className="py-14 text-center text-sm text-stone-500">Chargement des rapports...</div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportRows.map(([label, value, moduleName]) => (
                <article key={label} className="rounded-lg border border-line bg-ink/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-stone-500">{moduleName}</p>
                      <h3 className="mt-2 text-base font-semibold text-ivory">{label}</h3>
                    </div>
                    <Badge tone="gold">Live</Badge>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-gold">{value}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ReportList title="Paiements recents" rows={payments.slice(0, 6).map((payment) => [payment.client_name, formatMoney(payment.amount), payment.status])} />
          <ReportList title="Commandes a suivre" rows={orders.slice(0, 6).map((order) => [order.code, order.client_name, order.status])} />
          <ReportList title="Tailleurs" rows={tailors.slice(0, 6).map((tailor) => [tailor.full_name, tailor.specialty || "-", `${tailor.quality_score}/5`])} />
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "gold" | "green" | "red" }) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-2xl font-semibold">{value}</span>
        <Badge tone={tone}>Actif</Badge>
      </div>
    </div>
  );
}

function ReportList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.join("-")} className="rounded-lg border border-line bg-ink/45 px-3 py-3 text-sm text-stone-300">
              <span className="font-medium text-ivory">{row[0]}</span>
              <span className="mx-2 text-stone-600">|</span>
              <span>{row.slice(1).join(" | ")}</span>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-stone-500">Aucune donnee.</div>
        )}
      </div>
    </div>
  );
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function todaySlug() {
  return new Date().toISOString().slice(0, 10);
}
