"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Crown,
  LucideIcon,
  Scissors,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { dashboardFallback } from "@/lib/mock-data";
import { formatDate, formatMoney } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";

type DashboardStats = {
  commandes_en_cours: number;
  commandes_urgentes: number;
  commandes_retard: number;
  revenus_jour: number;
  revenus_mois: number;
  depenses_mois: number;
  benefice_mois: number;
  clients_actifs: number;
  paiements_incomplets: number;
  reste_a_payer?: number;
  livraisons_7_jours?: number;
  commandes_terminees?: number;
};

type DashboardCard = {
  label: string;
  value: number | string;
  detail: string;
  detail_value?: number | string;
  detail_format?: "money" | "number";
  format: "money" | "number";
  icon: "alert" | "banknote" | "calendar" | "check" | "scissors" | "users";
  accent?: boolean;
};

type DashboardData = {
  scope?: {
    role: string;
    role_label: string;
    workshop: string;
    title: string;
    subtitle: string;
    finance_visible: boolean;
  };
  sections?: {
    alerts_title: string;
    performance_title: string;
    clients_title: string;
    patterns_title: string;
  };
  cartes?: DashboardCard[];
  timeline?: {
    title: string;
    subtitle: string;
    badge: string;
    format: "money" | "number";
    points: Array<{ label: string; value: number | string }>;
  };
  stats: DashboardStats;
  alertes: {
    urgentes: Array<{ id: number; code: string; client__full_name: string; delivery_date: string; status: string }>;
    retards: Array<{ id: number; code: string; client__full_name: string; delivery_date: string; status: string }>;
    vip: Array<{ id: number; full_name: string; phone: string; vip_level: number }>;
  };
  tailleurs: Array<{
    id: number;
    full_name: string;
    specialty: string;
    quality_score: number | string;
    active_orders: number;
    completed_orders: number;
  }>;
  tendances_modeles: Array<{ id: number; name: string; category: string; trend_score: number; is_favorite: boolean }>;
  activite_recente: Array<{
    title: string;
    description: string;
    status: string;
    created_at: string;
    order__code: string;
  }>;
};

const fallbackData = dashboardFallback as DashboardData;

const cardIcons: Record<DashboardCard["icon"], LucideIcon> = {
  alert: AlertTriangle,
  banknote: Banknote,
  calendar: CalendarClock,
  check: CheckCircle2,
  scissors: Scissors,
  users: Users
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>(fallbackData);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    apiFetch<DashboardData>("/dashboard/")
      .then((payload) => {
        setData(payload);
        setLive(true);
      })
      .catch((loadError) => {
        setLive(false);
        setError(loadError instanceof Error ? loadError.message : "Dashboard indisponible.");
      });
  }, []);

  const fallbackCards = useMemo<DashboardCard[]>(
    () => [
      {
        label: "Commandes en cours",
        value: data.stats.commandes_en_cours,
        detail: `${data.stats.commandes_urgentes} urgentes`,
        format: "number",
        icon: "scissors",
        accent: true
      },
      {
        label: "Revenus du jour",
        value: data.stats.revenus_jour,
        detail: "ce mois",
        detail_value: data.stats.revenus_mois,
        detail_format: "money",
        format: "money",
        icon: "banknote"
      },
      {
        label: "Clients actifs",
        value: data.stats.clients_actifs,
        detail: `${data.alertes.vip.length} clients VIP surveilles`,
        format: "number",
        icon: "users"
      },
      {
        label: "Retards",
        value: data.stats.commandes_retard,
        detail: `${data.stats.paiements_incomplets} paiements a suivre`,
        format: "number",
        icon: "alert"
      }
    ],
    [data]
  );

  const cards = data.cartes?.length ? data.cartes : fallbackCards;
  const timeline = data.timeline ?? {
    title: "Revenus 7 jours",
    subtitle: "Encaissements reels du perimetre",
    badge: "Finance",
    format: "money" as const,
    points: []
  };
  const timelineMax = Math.max(1, ...timeline.points.map((point) => Number(point.value || 0)));
  const alerts = data.alertes.urgentes.concat(data.alertes.retards).slice(0, 5);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={live ? "green" : "gold"}>{live ? "API connectee" : "Mode demo"}</Badge>
              <Badge tone="gold">{data.scope?.role_label ?? "Atelier"}</Badge>
              <Badge tone="neutral">{data.scope?.workshop ?? "Perimetre actif"}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-ivory">{data.scope?.title ?? "Dashboard intelligent"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
              {data.scope?.subtitle ??
                "Vue unifiee des commandes, paiements, clients VIP, alertes et performances de production."}
            </p>
            {error ? (
              <div className="mt-3 rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-line bg-ivory/[0.055] px-4 py-3 text-sm text-stone-300">
            Aujourd'hui: <span className="font-medium text-ivory">{formatDate(new Date().toISOString())}</span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={formatDashboardValue(card.value, card.format)}
              detail={formatCardDetail(card)}
              icon={cardIcons[card.icon] ?? Scissors}
              accent={card.accent}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-line bg-ivory/[0.055] p-4 shadow-premium"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{timeline.title}</h2>
                <p className="mt-1 text-sm text-stone-500">{timeline.subtitle}</p>
              </div>
              <Badge tone="green">
                <TrendingUp size={14} />
                {timeline.badge}
              </Badge>
            </div>
            <div className="mt-8 flex h-56 items-end gap-3">
              {timeline.points.map((item) => {
                const numericValue = Number(item.value || 0);
                const height = numericValue > 0 ? Math.max(8, Math.round((numericValue / timelineMax) * 100)) : 0;
                return (
                  <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="relative flex flex-1 items-end rounded-lg bg-ink/55">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.55 }}
                        className="w-full rounded-lg bg-gold/80"
                        title={formatDashboardValue(item.value, timeline.format)}
                      />
                    </div>
                    <span className="text-center text-xs text-stone-500">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="rounded-lg border border-gold/30 bg-gold/[0.075] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{data.sections?.alerts_title ?? "Alertes intelligentes"}</h2>
              <CalendarClock size={18} className="text-gold" />
            </div>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? <EmptyState label="Aucune alerte pour ce role." /> : null}
              {alerts.map((order) => (
                <div key={`${order.code}-${order.delivery_date}`} className="rounded-lg border border-line bg-ink/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{order.code}</span>
                    <Badge tone={order.status === "late" || order.status === "retard" ? "red" : "gold"}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-stone-400">{order.client__full_name}</p>
                  <p className="mt-1 text-xs text-stone-500">Livraison {formatDate(order.delivery_date)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{data.sections?.performance_title ?? "Tailleurs performants"}</h2>
              <ArrowUpRight size={18} className="text-gold" />
            </div>
            <div className="mt-4 space-y-3">
              {data.tailleurs.length === 0 ? <EmptyState label="Aucun tailleur dans ce perimetre." /> : null}
              {data.tailleurs.map((tailor) => (
                <div key={tailor.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{tailor.full_name}</p>
                    <p className="mt-1 text-xs text-stone-500">{tailor.specialty}</p>
                  </div>
                  <Badge tone="green">{tailor.quality_score}/5</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{data.sections?.clients_title ?? "Clients VIP"}</h2>
              <Crown size={18} className="text-gold" />
            </div>
            <div className="mt-4 space-y-3">
              {data.alertes.vip.length === 0 ? <EmptyState label="Aucun client a afficher." /> : null}
              {data.alertes.vip.map((client) => (
                <div key={client.id} className="rounded-lg border border-line bg-ink/45 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{client.full_name}</span>
                    <Badge tone="gold">VIP {client.vip_level}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{client.phone}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{data.sections?.patterns_title ?? "Tendances modeles"}</h2>
              <TrendingUp size={18} className="text-gold" />
            </div>
            <div className="mt-4 space-y-3">
              {data.tendances_modeles.length === 0 ? <EmptyState label="Aucun modele dans ce perimetre." /> : null}
              {data.tendances_modeles.map((pattern) => (
                <div key={pattern.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{pattern.name}</p>
                    <p className="mt-1 text-xs text-stone-500">{pattern.category}</p>
                  </div>
                  <Badge tone={pattern.is_favorite ? "gold" : "neutral"}>{pattern.trend_score}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function formatDashboardValue(value: number | string, format: "money" | "number") {
  if (format === "money") return formatMoney(value);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatCardDetail(card: DashboardCard) {
  if (card.detail_value !== undefined) {
    return `${formatDashboardValue(card.detail_value, card.detail_format ?? card.format)} ${card.detail}`;
  }
  return card.detail;
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-line bg-ink/35 px-3 py-6 text-center text-sm text-stone-500">{label}</div>;
}
