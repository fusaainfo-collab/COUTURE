"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, RefreshCw, Search, Send, Sparkles } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  notification_type: "order_late" | "appointment" | "payment" | "delivery" | "manual";
  channel: "web" | "android_tailor" | "android_client" | "whatsapp";
  priority: "low" | "normal" | "high" | "urgent";
  status: "unread" | "read" | "archived";
  target_url: string;
  read_at: string | null;
  created_at: string;
};

const typeLabels = {
  order_late: "Commande retardee",
  appointment: "Rendez-vous",
  payment: "Paiement",
  delivery: "Livraison",
  manual: "Manuelle"
};

const channelLabels = {
  web: "Web",
  android_tailor: "Android tailleur",
  android_client: "Android client",
  whatsapp: "WhatsApp futur"
};

const priorityLabels = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente"
};

const initialForm = {
  title: "",
  message: "",
  notificationType: "manual" as NotificationItem["notification_type"],
  channel: "web" as NotificationItem["channel"],
  priority: "normal" as NotificationItem["priority"],
  targetUrl: ""
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<ApiList<NotificationItem>>("/notifications/");
      startTransition(() => setNotifications(payload.results));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => titleRef.current?.focus(), 180);
  }

  const filteredNotifications = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return notifications;
    return notifications.filter((notification) =>
      [
        notification.title,
        notification.message,
        typeLabels[notification.notification_type],
        channelLabels[notification.channel],
        priorityLabels[notification.priority],
        notification.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, notifications]);

  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;
  const urgentCount = notifications.filter((notification) => notification.priority === "urgent").length;
  const webCount = notifications.filter((notification) => notification.channel === "web").length;
  const futureChannels = notifications.filter((notification) => notification.channel !== "web").length;

  async function submitNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        notification_type: form.notificationType,
        channel: form.channel,
        priority: form.priority,
        status: "unread",
        target_url: form.targetUrl.trim()
      };

      const created = await apiFetch<NotificationItem>("/notifications/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => setNotifications((current) => [created, ...current]));
      setForm(initialForm);
      setSuccess("Notification ajoutee.");
      document.getElementById("liste-notifications")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation de la notification impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function markRead(notification: NotificationItem) {
    if (notification.status === "read") return;
    const updated = await apiFetch<NotificationItem>(`/notifications/${notification.id}/marquer-lue/`, {
      method: "POST"
    });
    startTransition(() => {
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">Notifications live</Badge>
              <Badge tone="gold">Web actif</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Bell size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Notifications</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Alertes web, rappels, priorites atelier et canaux futurs Android / WhatsApp.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadNotifications} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Ajouter notification
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Non lues" value={unreadCount} tone="gold" />
          <Metric label="Urgentes" value={urgentCount} tone="red" />
          <Metric label="Web" value={webCount} tone="green" />
          <Metric label="Canaux futurs" value={futureChannels} tone="neutral" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form ref={formRef} onSubmit={submitNotification} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter une notification</h2>
                <p className="mt-1 text-sm text-stone-500">Cree une vraie notification dans Django.</p>
              </div>
              <Send size={20} className="text-gold" />
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Titre
                <input ref={titleRef} className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Livraison urgente" required />
              </label>

              <label className="text-sm text-stone-300">
                Message
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Message de notification..." required />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Type
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.notificationType} onChange={(event) => setForm((current) => ({ ...current, notificationType: event.target.value as NotificationItem["notification_type"] }))}>
                    <option value="manual">Manuelle</option>
                    <option value="order_late">Commande retardee</option>
                    <option value="appointment">Rendez-vous</option>
                    <option value="payment">Paiement</option>
                    <option value="delivery">Livraison</option>
                  </select>
                </label>

                <label className="text-sm text-stone-300">
                  Priorite
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as NotificationItem["priority"] }))}>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                    <option value="low">Basse</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Canal
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as NotificationItem["channel"] }))}>
                    <option value="web">Web</option>
                    <option value="android_tailor">Android tailleur</option>
                    <option value="android_client">Android client</option>
                    <option value="whatsapp">WhatsApp futur</option>
                  </select>
                </label>

                <label className="text-sm text-stone-300">
                  Lien cible
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} placeholder="/commandes" />
                </label>
              </div>

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <Button className="w-full" disabled={submitting || !form.title.trim() || !form.message.trim()}>
                {submitting ? "Ajout en cours..." : "Enregistrer la notification"}
              </Button>
            </div>
          </form>

          <div id="liste-notifications" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Centre d'alertes</h2>
                <p className="mt-1 text-sm text-stone-500">Les notifications peuvent etre marquees comme lues.</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher notification..." />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucune notification trouvee.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredNotifications.map((notification) => (
                  <article key={notification.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{notification.title}</h3>
                          <Badge tone={notification.status === "unread" ? "gold" : "green"}>
                            {notification.status === "unread" ? "Non lue" : "Lue"}
                          </Badge>
                          <Badge tone={notification.priority === "urgent" ? "red" : notification.priority === "high" ? "gold" : "neutral"}>
                            {priorityLabels[notification.priority]}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{notification.message}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {typeLabels[notification.notification_type]} | {channelLabels[notification.channel]} | {formatDate(notification.created_at)}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => markRead(notification)} disabled={notification.status === "read"}>
                        <Check size={16} />
                        Marquer lue
                      </Button>
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
