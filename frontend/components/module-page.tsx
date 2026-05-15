"use client";

import { motion } from "framer-motion";
import {
  Download,
  Filter,
  LucideIcon,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch, ApiList } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ModuleKind = "clients" | "commandes" | "mesures" | "tailleurs" | "paiements" | "galerie" | "users" | "standard";

type ModulePageProps = {
  title: string;
  subtitle: string;
  endpoint?: string;
  kind?: ModuleKind;
  icon: LucideIcon;
  columns: string[];
  highlights: { label: string; value: string; tone?: "neutral" | "gold" | "green" | "red" }[];
};

function readProfileRole(item: Record<string, unknown>) {
  const profile = item.profile;
  if (profile && typeof profile === "object" && "role" in profile) {
    return String((profile as { role?: unknown }).role ?? "-");
  }
  return "-";
}

function readWorkshopNames(item: Record<string, unknown>) {
  const workshops = item.workshops;
  if (!Array.isArray(workshops) || workshops.length === 0) return "-";
  return workshops
    .map((workshop) => {
      if (workshop && typeof workshop === "object" && "name" in workshop) {
        return String((workshop as { name?: unknown }).name ?? "");
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function mapApiRows(kind: ModuleKind, items: Record<string, unknown>[]) {
  if (kind === "clients") {
    return items.map((item) => [
      String(item.full_name ?? "-"),
      String(item.phone ?? "-"),
      `VIP ${String(item.vip_level ?? 0)}`,
      `${String(item.commandes_actives ?? 0)} commandes`
    ]);
  }

  if (kind === "commandes") {
    return items.map((item) => [
      String(item.code ?? "-"),
      String(item.client_name ?? "-"),
      String(item.status ?? "-"),
      formatDate(String(item.delivery_date ?? ""))
    ]);
  }

  if (kind === "mesures") {
    return items.map((item) => [
      String(item.client_name ?? "-"),
      String(item.category ?? "-"),
      String(item.label ?? "-"),
      formatDate(String(item.updated_at ?? ""))
    ]);
  }

  if (kind === "tailleurs") {
    return items.map((item) => [
      String(item.full_name ?? "-"),
      String(item.specialty ?? "-"),
      `${String(item.quality_score ?? "-")}/5`,
      `${String(item.commandes_actives ?? 0)} commandes`
    ]);
  }

  if (kind === "paiements") {
    return items.map((item) => [
      String(item.reference ?? "Paiement"),
      String(item.client_name ?? "-"),
      formatMoney(String(item.amount ?? 0)),
      String(item.status ?? "-")
    ]);
  }

  if (kind === "galerie") {
    return items.map((item) => [
      String(item.name ?? "-"),
      String(item.category ?? "-"),
      `${String(item.trend_score ?? 0)} tendance`,
      item.is_favorite ? "Favori" : "Catalogue"
    ]);
  }

  if (kind === "users") {
    return items.map((item) => [
      String(item.full_name || item.username || "-"),
      readProfileRole(item),
      readWorkshopNames(item),
      item.is_active === false ? "Inactif" : "Actif"
    ]);
  }

  return [];
}

export function ModulePage({
  title,
  subtitle,
  endpoint,
  kind = "standard",
  icon: Icon,
  columns,
  highlights
}: ModulePageProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    setError("");
    apiFetch<ApiList<Record<string, unknown>>>(endpoint)
      .then((payload) => {
        setRows(mapApiRows(kind, payload.results));
        setLive(true);
      })
      .catch((loadError) => {
        setLive(false);
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
      });
  }, [endpoint, kind]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(normalized)));
  }, [query, rows]);

  function exportCsv() {
    const csv = [columns, ...filteredRows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={live ? "green" : "gold"}>{live ? "API connectee" : "Structure prete"}</Badge>
              <Badge tone="neutral">Atelier</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Icon size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">{subtitle}</p>
              </div>
            </div>
            {error ? (
              <div className="mt-3 rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => searchInputRef.current?.focus()}>
              <Filter size={17} />
              Filtrer
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={filteredRows.length === 0}>
              <Download size={17} />
              Exporter
            </Button>
          </div>
        </section>

        {highlights.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-lg border border-line bg-ivory/[0.055] p-4">
              <p className="text-sm text-stone-500">{item.label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-2xl font-semibold">{item.value}</span>
                <Badge tone={item.tone ?? "neutral"}>Actif</Badge>
              </div>
            </div>
          ))}
        </section>
        ) : null}

        <section className="rounded-lg border border-line bg-ivory/[0.055] shadow-premium">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
              <input
                ref={searchInputRef}
                className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm outline-none transition placeholder:text-stone-600 focus:border-gold/45"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Recherche instantanee"
              />
            </div>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-ink/55 px-3 text-sm text-stone-300 hover:text-gold"
              title="Colonnes et vues"
            >
              <SlidersHorizontal size={17} />
              Vue
            </button>
          </div>

          <div className="premium-scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-xs uppercase text-stone-500">
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <motion.tr
                    key={`${row.join("-")}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.025 }}
                    className="border-b border-line last:border-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`} className="px-4 py-4 text-sm text-stone-300">
                        {cellIndex === 0 ? <span className="font-medium text-ivory">{cell}</span> : cell}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <div className="px-4 py-14 text-center text-sm text-stone-500">
                Aucune donnee disponible pour ce module.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
