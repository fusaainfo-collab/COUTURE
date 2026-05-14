"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Search, Sparkles } from "lucide-react";

import { apiFetch, ApiList, getStoredUser, isClientUser } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = {
  id: number;
  full_name: string;
  phone: string;
};

type MeasurementProfile = {
  id: number;
  client: number;
  client_name: string;
  label: string;
  category: string;
};

type Tailor = {
  id: number;
  full_name: string;
  specialty: string;
  quality_score: string | number;
};

type Pattern = {
  id: number;
  name: string;
  category: string;
  trend_score: number;
};

type OrderEvent = {
  id: number;
  title: string;
  description: string;
  status: string;
  actor: string;
  created_at: string;
};

type Order = {
  id: number;
  code: string;
  client: number;
  client_name: string;
  measurement_profile: number | null;
  pattern: number | null;
  pattern_name: string;
  fabric: string;
  color: string;
  total_price: string;
  advance_paid: string;
  amount_paid: string;
  balance_due: string;
  deposit_date: string;
  delivery_date: string;
  assigned_tailor: number | null;
  tailor_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "cutting" | "sewing" | "finishing" | "ready" | "delivered" | "late" | "cancelled";
  progress: number;
  is_overdue: boolean;
  notes: string;
  events: OrderEvent[];
  created_at: string;
  updated_at: string;
};

const initialForm = {
  client: "",
  measurementProfile: "",
  pattern: "",
  fabric: "",
  color: "",
  totalPrice: "",
  advancePaid: "",
  deliveryDate: "",
  tailor: "",
  priority: "normal",
  status: "pending",
  notes: ""
};

export default function CommandesPage() {
  const [isClient, setIsClient] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [measurementProfiles, setMeasurementProfiles] = useState<MeasurementProfile[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setIsClient(isClientUser(getStoredUser()));
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [ordersPayload, clientsPayload, measurementsPayload, tailorsPayload, patternsPayload] =
        await Promise.all([
          apiFetch<ApiList<Order>>("/commandes/"),
          apiFetch<ApiList<Client>>("/clients/"),
          apiFetch<ApiList<MeasurementProfile>>("/mesures/"),
          apiFetch<ApiList<Tailor>>("/tailleurs/"),
          apiFetch<ApiList<Pattern>>("/modeles/")
        ]);

      startTransition(() => {
        setOrders(ordersPayload.results);
        setClients(clientsPayload.results);
        setMeasurementProfiles(measurementsPayload.results);
        setTailors(tailorsPayload.results);
        setPatterns(patternsPayload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      document.getElementById("nouvelle-commande")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!form.client) return measurementProfiles;
    return measurementProfiles.filter((profile) => String(profile.client) === form.client);
  }, [form.client, measurementProfiles]);

  const filteredOrders = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return orders;

    return orders.filter((order) =>
      [
        order.code,
        order.client_name,
        order.pattern_name,
        order.fabric,
        order.color,
        order.tailor_name,
        order.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, orders]);

  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const urgentOrders = orders.filter((order) => order.priority === "urgent").length;
  const overdueOrders = orders.filter((order) => order.is_overdue).length;
  const readyOrders = orders.filter((order) => order.status === "ready").length;

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        client: Number(form.client),
        measurement_profile: form.measurementProfile ? Number(form.measurementProfile) : null,
        pattern: form.pattern ? Number(form.pattern) : null,
        fabric: form.fabric.trim(),
        color: form.color.trim(),
        total_price: form.totalPrice,
        advance_paid: form.advancePaid || "0",
        delivery_date: form.deliveryDate,
        assigned_tailor: form.tailor ? Number(form.tailor) : null,
        priority: form.priority,
        status: form.status,
        notes: form.notes.trim()
      };

      const created = await apiFetch<Order>("/commandes/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => {
        setOrders((current) => [created, ...current]);
      });
      setForm(initialForm);
      setSuccess(`Commande ${created.code} creee avec succes.`);
      document.getElementById("liste-commandes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation impossible.");
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
              <Badge tone="green">Commandes live</Badge>
              <Badge tone="gold">{isClient ? "Suivi client" : "Creation active"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <ClipboardList size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Commandes</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Suivi de vos commandes, progression, modele, echeance, paiements et dernier evenement atelier."
                    : "Creation, suivi et priorisation des commandes avec client, tailleur, modele et echeance."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadData()} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            {!isClient ? (
            <a href="#nouvelle-commande">
              <Button>
                <Sparkles size={17} />
                Nouvelle commande
              </Button>
            </a>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="En cours" value={activeOrders} tone="green" />
          <Metric label="Urgentes" value={urgentOrders} tone="red" />
          <Metric label="Pretes" value={readyOrders} tone="gold" />
          <Metric label="Retards" value={overdueOrders} tone="red" />
        </section>

        <section className={isClient ? "grid gap-6" : "grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"}>
          {!isClient ? (
          <form
            id="nouvelle-commande"
            onSubmit={submitOrder}
            className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Creer une commande</h2>
                <p className="mt-1 text-sm text-stone-500">Ce formulaire enregistre une vraie commande dans Django.</p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Client
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.client}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      client: event.target.value,
                      measurementProfile: ""
                    }))
                  }
                  required
                >
                  <option value="">Choisir un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} - {client.phone}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Profil de mesure
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.measurementProfile}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, measurementProfile: event.target.value }))
                    }
                  >
                    <option value="">Aucun profil</option>
                    {filteredProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.client_name} - {profile.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-stone-300">
                  Modele
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.pattern}
                    onChange={(event) => setForm((current) => ({ ...current, pattern: event.target.value }))}
                  >
                    <option value="">Aucun modele</option>
                    {patterns.map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name} - {pattern.category.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Tissu
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.fabric}
                    onChange={(event) => setForm((current) => ({ ...current, fabric: event.target.value }))}
                    placeholder="Bazin riche, laine fine..."
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Couleur
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    placeholder="Noir, bleu nuit..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Prix total
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.totalPrice}
                    onChange={(event) => setForm((current) => ({ ...current, totalPrice: event.target.value }))}
                    required
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Avance
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.advancePaid}
                    onChange={(event) => setForm((current) => ({ ...current, advancePaid: event.target.value }))}
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm text-stone-300">
                  Livraison
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) => setForm((current) => ({ ...current, deliveryDate: event.target.value }))}
                    required
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Priorite
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>

                <label className="text-sm text-stone-300">
                  Statut
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="pending">En attente</option>
                    <option value="cutting">Decoupe</option>
                    <option value="sewing">Couture</option>
                    <option value="finishing">Finition</option>
                    <option value="ready">Pret</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Tailleur assigne
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.tailor}
                  onChange={(event) => setForm((current) => ({ ...current, tailor: event.target.value }))}
                >
                  <option value="">Aucun tailleur</option>
                  {tailors.map((tailor) => (
                    <option key={tailor.id} value={tailor.id}>
                      {tailor.full_name} - {tailor.specialty}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-stone-300">
                Notes
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Consignes speciales, style, finitions..."
                />
              </label>

              {error ? (
                <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">
                  {success}
                </div>
              ) : null}

              <Button className="w-full" disabled={submitting || !form.client || !form.totalPrice || !form.deliveryDate}>
                {submitting ? "Creation en cours..." : "Enregistrer la commande"}
              </Button>
            </div>
          </form>
          ) : null}

          <div id="liste-commandes" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{isClient ? "Mes commandes" : "Liste des commandes"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isClient
                    ? "Chaque ligne resume le travail en cours, la livraison, le modele, le solde et le dernier suivi."
                    : "Les nouvelles commandes apparaissent ici juste apres creation."}
                </p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher code, client, tissu..."
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des commandes...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucune commande trouvee.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredOrders.map((order) => (
                  <article key={order.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{order.code}</h3>
                          <Badge tone={priorityTone(order.priority)}>{priorityLabel(order.priority)}</Badge>
                          <Badge tone={statusTone(order.status, order.is_overdue)}>{statusLabel(order.status)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{order.client_name}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {order.pattern_name || "Modele libre"} • {order.fabric || "Tissu non precise"} •{" "}
                          {order.color || "Couleur libre"}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                        <span>Livraison {formatDate(order.delivery_date)}</span>
                        <span>{formatMoney(order.total_price)}</span>
                        <span>Reste {formatMoney(order.balance_due)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Info label="Tailleur" value={order.tailor_name || "Non assigne"} />
                      <Info label="Progression" value={`${order.progress}%`} />
                      <Info label="Dernier evenement" value={order.events[0]?.title || "Commande creee"} />
                    </div>
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

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "neutral" | "gold" | "green" | "red";
}) {
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.04] px-3 py-3">
      <p className="text-xs uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-sm text-stone-300">{value}</p>
    </div>
  );
}

function priorityTone(priority: Order["priority"]) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "gold";
  if (priority === "low") return "neutral";
  return "green";
}

function priorityLabel(priority: Order["priority"]) {
  if (priority === "urgent") return "Urgente";
  if (priority === "high") return "Haute";
  if (priority === "low") return "Basse";
  return "Normale";
}

function statusTone(status: Order["status"], overdue: boolean) {
  if (overdue || status === "late") return "red";
  if (status === "ready" || status === "delivered") return "green";
  if (status === "pending") return "neutral";
  return "gold";
}

function statusLabel(status: Order["status"]) {
  if (status === "pending") return "En attente";
  if (status === "cutting") return "Decoupe";
  if (status === "sewing") return "Couture";
  if (status === "finishing") return "Finition";
  if (status === "ready") return "Pret";
  if (status === "delivered") return "Livre";
  if (status === "late") return "Retard";
  return "Annule";
}
