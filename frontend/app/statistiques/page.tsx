"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RefreshCw, Search, Sparkles, TrendingUp } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tone = "neutral" | "gold" | "green" | "red";
type Impact = "low" | "medium" | "high" | "critical";

type StatisticItem = {
  id: number;
  label: string;
  value: string;
  evolution: string;
  impact: Impact;
  tone: Tone;
  notes: string;
  created_at: string;
  updated_at: string;
};

type DashboardData = {
  stats: {
    commandes_en_cours: number;
    commandes_urgentes: number;
    commandes_retard: number;
    revenus_jour: number;
    revenus_mois: number;
    benefice_mois: number;
    clients_actifs: number;
  };
};

const impactLabels: Record<Impact, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Fort",
  critical: "Critique"
};

const initialForm = {
  label: "",
  value: "",
  evolution: "",
  impact: "medium" as Impact,
  tone: "green" as Tone,
  notes: ""
};

export default function StatistiquesPage() {
  const [items, setItems] = useState<StatisticItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const labelRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [itemsPayload, dashboardPayload] = await Promise.all([
        apiFetch<ApiList<StatisticItem>>("/statistiques/"),
        apiFetch<DashboardData>("/dashboard/")
      ]);
      startTransition(() => {
        setItems(itemsPayload.results);
        setDashboard(dashboardPayload);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => labelRef.current?.focus(), 180);
  }

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.label, item.value, item.evolution, impactLabels[item.impact], item.notes].join(" ").toLowerCase().includes(normalized)
    );
  }, [deferredQuery, items]);

  const positiveCount = items.filter((item) => item.tone === "green").length;
  const criticalCount = items.filter((item) => item.impact === "critical" || item.tone === "red").length;
  const strongCount = items.filter((item) => item.impact === "high").length;

  async function submitStatistic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        label: form.label.trim(),
        value: form.value.trim(),
        evolution: form.evolution.trim(),
        impact: form.impact,
        tone: form.tone,
        notes: form.notes.trim()
      };

      const created = await apiFetch<StatisticItem>("/statistiques/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => setItems((current) => [created, ...current]));
      setForm(initialForm);
      setSuccess(`Statistique ${created.label} ajoutee.`);
      document.getElementById("liste-statistiques")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation de la statistique impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">Statistiques live</Badge>
              <Badge tone="gold">Indicateurs editables</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <BarChart3 size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Statistiques</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Analytics de production, revenus, tendances modeles, performance tailleurs et fidelite clients.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Nouvel indicateur
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Commandes" value={dashboard?.stats.commandes_en_cours ?? 0} tone="green" />
          <Metric label="Urgences" value={dashboard?.stats.commandes_urgentes ?? 0} tone="red" />
          <Metric label="Indicateurs" value={items.length} tone="gold" />
          <Metric label="A surveiller" value={criticalCount} tone="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <form ref={formRef} onSubmit={submitStatistic} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un indicateur</h2>
                <p className="mt-1 text-sm text-stone-500">Cree une statistique personnalisee persistante dans Django.</p>
              </div>
              <TrendingUp size={20} className="text-gold" />
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Indicateur
                <input ref={labelRef} className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Libelle" required />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Valeur
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="Valeur" required />
                </label>
                <label className="text-sm text-stone-300">
                  Evolution
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.evolution} onChange={(event) => setForm((current) => ({ ...current, evolution: event.target.value }))} placeholder="Evolution" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Impact
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value as Impact }))}>
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Fort</option>
                    <option value="critical">Critique</option>
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Couleur
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.tone} onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value as Tone }))}>
                    <option value="green">Vert</option>
                    <option value="gold">Dore</option>
                    <option value="red">Rouge</option>
                    <option value="neutral">Neutre</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Interpretation, action recommandee, periode..." />
              </label>

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <Button className="w-full" disabled={submitting || !form.label.trim() || !form.value.trim()}>
                {submitting ? "Ajout en cours..." : "Enregistrer la statistique"}
              </Button>
            </div>
          </form>

          <div id="liste-statistiques" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Indicateurs atelier</h2>
                <p className="mt-1 text-sm text-stone-500">{positiveCount} positif(s), {strongCount} a impact fort.</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher indicateur..." />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des statistiques...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucune statistique trouvee.</div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {filteredItems.map((item) => (
                  <article key={item.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-ivory">{item.label}</h3>
                        <p className="mt-2 text-2xl font-semibold text-gold">{item.value}</p>
                      </div>
                      <Badge tone={item.tone}>{item.evolution || impactLabels[item.impact]}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="neutral">Impact {impactLabels[item.impact]}</Badge>
                      <Badge tone={item.tone}>{item.tone}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-stone-400">{item.notes || "Aucune note."}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
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
