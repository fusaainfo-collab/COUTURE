"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, RefreshCw, Search, Sparkles } from "lucide-react";

import { apiFetch, ApiList, getStoredUser, isClientUser } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = {
  id: number;
  full_name: string;
  phone: string;
};

type Tailor = {
  id: number;
  full_name: string;
  specialty: string;
};

type Appointment = {
  id: number;
  client: number;
  client_name: string;
  tailor: number | null;
  tailor_name: string;
  title: string;
  appointment_type: AppointmentType;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  start_at: string;
  end_at: string | null;
  notes: string;
  reminder_sent: boolean;
  has_conflict: boolean;
  created_at: string;
  updated_at: string;
};

type AppointmentType = "fitting" | "delivery" | "consultation" | "urgent";
type AppointmentPriority = "normal" | "high" | "urgent";
type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "missed";

const appointmentTypeLabels: Record<AppointmentType, string> = {
  fitting: "Essayage",
  delivery: "Livraison",
  consultation: "Consultation",
  urgent: "Urgence"
};

const appointmentPriorityLabels: Record<AppointmentPriority, string> = {
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente"
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Programme",
  confirmed: "Confirme",
  completed: "Termine",
  cancelled: "Annule",
  missed: "Manque"
};

const initialForm = {
  client: "",
  tailor: "",
  title: "",
  appointmentType: "consultation" as AppointmentType,
  priority: "normal" as AppointmentPriority,
  status: "scheduled" as AppointmentStatus,
  date: "",
  time: "09:00",
  durationMinutes: "60",
  notes: ""
};

export default function RendezVousPage() {
  const [isClient, setIsClient] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientSelectRef = useRef<HTMLSelectElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setIsClient(isClientUser(getStoredUser()));
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [clientsPayload, tailorsPayload, appointmentsPayload] = await Promise.all([
        apiFetch<ApiList<Client>>("/clients/"),
        apiFetch<ApiList<Tailor>>("/tailleurs/"),
        apiFetch<ApiList<Appointment>>("/rendez-vous/")
      ]);

      startTransition(() => {
        setClients(clientsPayload.results);
        setTailors(tailorsPayload.results);
        setAppointments(sortAppointments(appointmentsPayload.results));
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les rendez-vous.");
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
      scrollToForm();
    }
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      clientSelectRef.current?.focus();
    }, 180);
  }

  const filteredAppointments = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return appointments;

    return appointments.filter((appointment) =>
      [
        appointment.client_name,
        appointment.tailor_name,
        appointment.title,
        appointmentTypeLabels[appointment.appointment_type],
        appointmentPriorityLabels[appointment.priority],
        appointmentStatusLabels[appointment.status],
        appointment.notes
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [appointments, deferredQuery]);

  const todayKey = new Date().toDateString();
  const appointmentsToday = appointments.filter((appointment) => new Date(appointment.start_at).toDateString() === todayKey).length;
  const fittingCount = appointments.filter((appointment) => appointment.appointment_type === "fitting").length;
  const deliveryCount = appointments.filter((appointment) => appointment.appointment_type === "delivery").length;
  const conflictCount = appointments.filter((appointment) => appointment.has_conflict).length;

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const startAt = new Date(`${form.date}T${form.time}:00`);
      const endAt = new Date(startAt.getTime() + Number(form.durationMinutes || 60) * 60000);

      const payload = {
        client: Number(form.client),
        tailor: form.tailor ? Number(form.tailor) : null,
        title: form.title.trim(),
        appointment_type: form.appointmentType,
        priority: form.priority,
        status: form.status,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        notes: form.notes.trim(),
        reminder_sent: false
      };

      const created = await apiFetch<Appointment>("/rendez-vous/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => {
        setAppointments((current) => sortAppointments([created, ...current]));
      });
      setForm(initialForm);
      setSuccess(`Rendez-vous ${created.title || appointmentTypeLabels[created.appointment_type]} ajoute avec succes.`);
      document.getElementById("liste-rendez-vous")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation du rendez-vous impossible.");
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
              <Badge tone="green">Rendez-vous live</Badge>
              <Badge tone="gold">{isClient ? "Planning client" : "Creation active"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <CalendarClock size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Rendez-vous</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Vos essayages, livraisons et consultations planifies par l'atelier."
                    : "Essayages, livraisons, consultations et urgences avec priorites, statuts et conflits horaires."}
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
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Ajouter rendez-vous
            </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Aujourd'hui" value={appointmentsToday} tone="gold" badgeLabel="Jour" />
          <Metric label="Essayages" value={fittingCount} tone="green" badgeLabel="Cabine" />
          <Metric label="Livraisons" value={deliveryCount} tone="green" badgeLabel="Sortie" />
          <Metric label="Conflits" value={conflictCount} tone="red" badgeLabel="A suivre" />
        </section>

        <section className={isClient ? "grid gap-6" : "grid gap-6 xl:grid-cols-[0.82fr_1.18fr]"}>
          {!isClient ? (
          <form
            id="nouveau-rendez-vous"
            ref={formRef}
            onSubmit={submitAppointment}
            className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un rendez-vous</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Le formulaire enregistre un vrai rendez-vous dans Django et signale les conflits horaires.
                </p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Client
                <select
                  ref={clientSelectRef}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.client}
                  onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))}
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
                  Type
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.appointmentType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        appointmentType: event.target.value as AppointmentType
                      }))
                    }
                  >
                    <option value="consultation">Consultation</option>
                    <option value="fitting">Essayage</option>
                    <option value="delivery">Livraison</option>
                    <option value="urgent">Urgence</option>
                  </select>
                </label>

                <label className="text-sm text-stone-300">
                  Titre
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Optionnel, genere automatiquement sinon"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Tailleurs associe
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
                  Duree
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="number"
                    min="15"
                    step="15"
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Date
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Heure
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Priorite
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priority: event.target.value as AppointmentPriority }))
                    }
                  >
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
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))
                    }
                  >
                    <option value="scheduled">Programme</option>
                    <option value="confirmed">Confirme</option>
                    <option value="completed">Termine</option>
                    <option value="cancelled">Annule</option>
                    <option value="missed">Manque</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Essayage robe, livraison urgente, contraintes client..."
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

              <Button className="w-full" disabled={submitting || !form.client || !form.date || !form.time}>
                {submitting ? "Ajout en cours..." : "Enregistrer le rendez-vous"}
              </Button>
            </div>
          </form>
          ) : null}

          <div id="liste-rendez-vous" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{isClient ? "Mes rendez-vous" : "Agenda atelier"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isClient
                    ? "Les prochaines dates utiles pour votre travail: essayage, livraison ou consultation."
                    : "Les nouveaux rendez-vous apparaissent ici avec priorite, statut et signalement de conflit."}
                </p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher client, type, priorite..."
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des rendez-vous...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun rendez-vous trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredAppointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{appointment.title}</h3>
                          <Badge tone={badgeToneForStatus(appointment.status)}>
                            {appointmentStatusLabels[appointment.status]}
                          </Badge>
                          <Badge tone={badgeToneForPriority(appointment.priority)}>
                            {appointmentPriorityLabels[appointment.priority]}
                          </Badge>
                          {appointment.has_conflict ? <Badge tone="red">Conflit detecte</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{appointment.client_name}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {appointmentTypeLabels[appointment.appointment_type]} | {appointment.tailor_name || "Sans tailleur"}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                        <span>{formatDate(appointment.start_at)}</span>
                        <span>
                          {formatTime(appointment.start_at)}
                          {appointment.end_at ? ` - ${formatTime(appointment.end_at)}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Info label="Notes" value={appointment.notes || "Aucune note"} />
                      <Info label="Rappel" value={appointment.reminder_sent ? "Envoye" : "Non envoye"} />
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

function sortAppointments(items: Appointment[]) {
  return [...items].sort((left, right) => {
    return new Date(left.start_at).getTime() - new Date(right.start_at).getTime();
  });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function badgeToneForStatus(status: AppointmentStatus) {
  if (status === "completed") return "green";
  if (status === "cancelled" || status === "missed") return "red";
  if (status === "confirmed") return "gold";
  return "neutral";
}

function badgeToneForPriority(priority: AppointmentPriority) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "gold";
  return "green";
}

function Metric({
  label,
  value,
  tone,
  badgeLabel
}: {
  label: string;
  value: number;
  tone: "neutral" | "gold" | "green" | "red";
  badgeLabel: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-2xl font-semibold">{value}</span>
        <Badge tone={tone}>{badgeLabel}</Badge>
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
