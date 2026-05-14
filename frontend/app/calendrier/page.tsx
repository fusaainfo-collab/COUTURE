"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, RefreshCw, Search, Sparkles } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = { id: number; full_name: string; phone: string };
type Tailor = { id: number; full_name: string; specialty: string };

type CalendarEvent = {
  id: number;
  client: number;
  client_name: string;
  tailor: number | null;
  tailor_name: string;
  title: string;
  appointment_type: "fitting" | "delivery" | "consultation" | "urgent";
  priority: "normal" | "high" | "urgent";
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "missed";
  start_at: string;
  end_at: string | null;
  notes: string;
  has_conflict: boolean;
};

const typeLabels = {
  fitting: "Essayage",
  delivery: "Livraison",
  consultation: "Consultation",
  urgent: "Urgence"
};

const initialForm = {
  client: "",
  tailor: "",
  title: "",
  type: "consultation" as CalendarEvent["appointment_type"],
  priority: "normal" as CalendarEvent["priority"],
  status: "scheduled" as CalendarEvent["status"],
  date: "",
  time: "09:00",
  duration: "60",
  notes: ""
};

export default function CalendrierPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
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
      const [eventsPayload, clientsPayload, tailorsPayload] = await Promise.all([
        apiFetch<ApiList<CalendarEvent>>("/rendez-vous/"),
        apiFetch<ApiList<Client>>("/clients/"),
        apiFetch<ApiList<Tailor>>("/tailleurs/")
      ]);
      startTransition(() => {
        setEvents(sortEvents(eventsPayload.results));
        setClients(clientsPayload.results);
        setTailors(tailorsPayload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le calendrier.");
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

  const filteredEvents = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return events;
    return events.filter((event) =>
      [event.title, event.client_name, event.tailor_name, typeLabels[event.appointment_type], event.status, event.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, events]);

  const todayKey = new Date().toDateString();
  const todayCount = events.filter((event) => new Date(event.start_at).toDateString() === todayKey).length;
  const weekCount = events.filter((event) => isThisWeek(new Date(event.start_at))).length;
  const conflictCount = events.filter((event) => event.has_conflict).length;
  const urgentCount = events.filter((event) => event.priority === "urgent").length;

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const startAt = new Date(`${form.date}T${form.time}:00`);
      const endAt = new Date(startAt.getTime() + Number(form.duration || 60) * 60000);
      const payload = {
        client: Number(form.client),
        tailor: form.tailor ? Number(form.tailor) : null,
        title: form.title.trim(),
        appointment_type: form.type,
        priority: form.priority,
        status: form.status,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        notes: form.notes.trim(),
        reminder_sent: false
      };

      const created = await apiFetch<CalendarEvent>("/rendez-vous/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => setEvents((current) => sortEvents([created, ...current])));
      setForm(initialForm);
      setSuccess("Evenement ajoute au calendrier.");
      document.getElementById("liste-calendrier")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation de l'evenement impossible.");
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
              <Badge tone="green">Calendrier live</Badge>
              <Badge tone="gold">Planification active</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <CalendarDays size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Calendrier</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Planning atelier pour essayages, livraisons, consultations et urgences.
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
              Ajouter calendrier
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Semaine" value={weekCount} tone="green" />
          <Metric label="Aujourd'hui" value={todayCount} tone="gold" />
          <Metric label="Urgences" value={urgentCount} tone="red" />
          <Metric label="Conflits" value={conflictCount} tone="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <form ref={formRef} onSubmit={submitEvent} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un evenement</h2>
                <p className="mt-1 text-sm text-stone-500">Ajoute un vrai evenement dans l'agenda Django.</p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Client
                <select ref={clientRef} className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.client} onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))} required>
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
                  Type
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CalendarEvent["appointment_type"] }))}>
                    <option value="consultation">Consultation</option>
                    <option value="fitting">Essayage</option>
                    <option value="delivery">Livraison</option>
                    <option value="urgent">Urgence</option>
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Titre
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Optionnel" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm text-stone-300">
                  Date
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
                </label>
                <label className="text-sm text-stone-300">
                  Heure
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} required />
                </label>
                <label className="text-sm text-stone-300">
                  Duree
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="number" min="15" step="15" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} required />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Tailleur
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.tailor} onChange={(event) => setForm((current) => ({ ...current, tailor: event.target.value }))}>
                    <option value="">Aucun tailleur</option>
                    {tailors.map((tailor) => (
                      <option key={tailor.id} value={tailor.id}>
                        {tailor.full_name} - {tailor.specialty}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Priorite
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as CalendarEvent["priority"] }))}>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes
                <textarea className="mt-2 min-h-24 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Details utiles..." />
              </label>

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <Button className="w-full" disabled={submitting || !form.client || !form.date || !form.time}>
                {submitting ? "Ajout en cours..." : "Enregistrer l'evenement"}
              </Button>
            </div>
          </form>

          <div id="liste-calendrier" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Planning atelier</h2>
                <p className="mt-1 text-sm text-stone-500">Vue chronologique des evenements planifies.</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher evenement..." />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement du calendrier...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun evenement trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredEvents.map((event) => (
                  <article key={event.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{event.title}</h3>
                          <Badge tone="gold">{typeLabels[event.appointment_type]}</Badge>
                          {event.has_conflict ? <Badge tone="red">Conflit</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{event.client_name}</p>
                        <p className="mt-1 text-sm text-stone-500">{event.tailor_name || "Sans tailleur"}</p>
                      </div>
                      <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                        <span>{formatDate(event.start_at)}</span>
                        <span>{formatTime(event.start_at)}{event.end_at ? ` - ${formatTime(event.end_at)}` : ""}</span>
                      </div>
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

function sortEvents(items: CalendarEvent[]) {
  return [...items].sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime());
}

function isThisWeek(value: Date) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return value >= start && value < end;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "neutral" | "gold" | "green" | "red" }) {
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
