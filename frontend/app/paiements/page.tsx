"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, RefreshCw, Search, Sparkles } from "lucide-react";

import { apiFetch, ApiList, getStoredUser, isClientUser } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = { id: number; full_name: string; phone: string };
type Order = { id: number; code: string; client: number; client_name: string; balance_due: string; total_price: string };

type Payment = {
  id: number;
  client: number;
  client_name: string;
  order: number | null;
  order_code: string;
  amount: string;
  method: "cash" | "mobile_money" | "card" | "transfer" | "other";
  status: "pending" | "paid" | "cancelled" | "refunded";
  reference: string;
  paid_at: string;
  notes: string;
};

const methodLabels = {
  cash: "Especes",
  mobile_money: "Mobile money",
  card: "Carte",
  transfer: "Virement",
  other: "Autre"
};

const statusLabels = {
  pending: "En attente",
  paid: "Paye",
  cancelled: "Annule",
  refunded: "Rembourse"
};

const initialForm = {
  client: "",
  order: "",
  amount: "",
  method: "cash" as Payment["method"],
  status: "paid" as Payment["status"],
  reference: "",
  paidAt: new Date().toISOString().slice(0, 16),
  notes: ""
};

export default function PaiementsPage() {
  const isClient = isClientUser(getStoredUser());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientRef = useRef<HTMLSelectElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [paymentsPayload, clientsPayload, ordersPayload] = await Promise.all([
        apiFetch<ApiList<Payment>>("/paiements/"),
        apiFetch<ApiList<Client>>("/clients/"),
        apiFetch<ApiList<Order>>("/commandes/")
      ]);
      startTransition(() => {
        setPayments(paymentsPayload.results);
        setClients(clientsPayload.results);
        setOrders(ordersPayload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => clientRef.current?.focus(), 180);
  }

  const filteredOrders = useMemo(() => {
    if (!form.client) return orders;
    return orders.filter((order) => String(order.client) === form.client);
  }, [form.client, orders]);

  const filteredPayments = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return payments;
    return payments.filter((payment) =>
      [payment.reference, payment.client_name, payment.order_code, methodLabels[payment.method], statusLabels[payment.status], payment.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, payments]);

  const paidTotal = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;
  const todayKey = new Date().toDateString();
  const todayTotal = payments
    .filter((payment) => payment.status === "paid" && new Date(payment.paid_at).toDateString() === todayKey)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        client: Number(form.client),
        order: form.order ? Number(form.order) : null,
        amount: form.amount,
        method: form.method,
        status: form.status,
        reference: form.reference.trim(),
        paid_at: new Date(form.paidAt).toISOString(),
        notes: form.notes.trim()
      };

      const created = await apiFetch<Payment>("/paiements/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => setPayments((current) => [created, ...current]));
      setForm(initialForm);
      setSuccess(`Paiement ${formatMoney(created.amount)} enregistre.`);
      document.getElementById("liste-paiements")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation du paiement impossible.");
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
              <Badge tone="green">Paiements live</Badge>
              <Badge tone="gold">{isClient ? "Suivi paiement" : "Caisse active"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <CreditCard size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Paiements</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Vos avances, soldes, references et paiements lies aux commandes de l'atelier."
                    : "Encaissements, avances, restes clients, references et suivi financier."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            {!isClient ? (
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Ajouter paiement
            </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Caisse jour" value={formatMoney(todayTotal)} tone="green" />
          <Metric label="Total paye" value={formatMoney(paidTotal)} tone="gold" />
          <Metric label="En attente" value={pendingCount} tone="red" />
          <Metric label="Operations" value={payments.length} tone="green" />
        </section>

        <section className={isClient ? "grid gap-6" : "grid gap-6 xl:grid-cols-[0.78fr_1.22fr]"}>
          {!isClient ? (
          <form ref={formRef} onSubmit={submitPayment} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un paiement</h2>
                <p className="mt-1 text-sm text-stone-500">Enregistre une vraie ligne de caisse dans Django.</p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Client
                <select ref={clientRef} className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.client} onChange={(event) => setForm((current) => ({ ...current, client: event.target.value, order: "" }))} required>
                  <option value="">Choisir un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.full_name} - {client.phone}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-stone-300">
                Commande liee
                <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}>
                  <option value="">Aucune commande</option>
                  {filteredOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.code} - reste {formatMoney(order.balance_due)}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Montant
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
                </label>
                <label className="text-sm text-stone-300">
                  Reference
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} placeholder="REC-..." />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm text-stone-300">
                  Methode
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as Payment["method"] }))}>
                    <option value="cash">Especes</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="card">Carte</option>
                    <option value="transfer">Virement</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Statut
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Payment["status"] }))}>
                    <option value="paid">Paye</option>
                    <option value="pending">En attente</option>
                    <option value="cancelled">Annule</option>
                    <option value="refunded">Rembourse</option>
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Date
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="datetime-local" value={form.paidAt} onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))} required />
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes
                <textarea className="mt-2 min-h-24 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Avance, solde, remarque caisse..." />
              </label>

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <Button className="w-full" disabled={submitting || !form.client || !form.amount}>
                {submitting ? "Ajout en cours..." : "Enregistrer le paiement"}
              </Button>
            </div>
          </form>
          ) : null}

          <div id="liste-paiements" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{isClient ? "Mes paiements" : "Historique caisse"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isClient
                    ? "Historique des paiements et avances que l'atelier a rattaches a votre dossier."
                    : "Les paiements enregistres apparaissent ici immediatement."}
                </p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher paiement..." />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des paiements...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun paiement trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredPayments.map((payment) => (
                  <article key={payment.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{formatMoney(payment.amount)}</h3>
                          <Badge tone={payment.status === "paid" ? "green" : payment.status === "pending" ? "gold" : "red"}>{statusLabels[payment.status]}</Badge>
                          <Badge tone="neutral">{methodLabels[payment.method]}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{payment.client_name}</p>
                        <p className="mt-1 text-sm text-stone-500">{payment.order_code || "Sans commande"} | {payment.reference || "Sans reference"}</p>
                      </div>
                      <div className="text-sm text-stone-400 lg:text-right">{formatDate(payment.paid_at)}</div>
                    </div>
                    <p className="mt-4 text-sm text-stone-400">{payment.notes || "Aucune note."}</p>
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

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "neutral" | "gold" | "green" | "red" }) {
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
