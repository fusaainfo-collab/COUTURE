"use client";

import { FormEvent, startTransition, useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, Send } from "lucide-react";

import { apiFetch, ApiList, getStoredUser } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MessageItem = {
  id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
};

type MessageThread = {
  id: number;
  workshop_name: string;
  client: number | null;
  client_name: string;
  subject: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "closed" | "archived";
  messages: MessageItem[];
  created_at: string;
};

type Client = {
  id: number;
  user: number | null;
  full_name: string;
  phone: string;
  user_username?: string;
};

const initialForm = {
  subject: "",
  body: "",
  priority: "normal" as MessageThread["priority"],
  clientUserId: ""
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(initialForm);
  const [replyText, setReplyText] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState("manager");
  const isClient = role === "client";
  const canChooseClient = role === "admin" || role === "manager";
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads]
  );

  async function loadMessages() {
    setLoading(true);
    setError("");
    try {
      const [messagesPayload, clientsPayload] = await Promise.all([
        apiFetch<ApiList<MessageThread>>("/messages/"),
        canChooseClient
          ? apiFetch<ApiList<Client>>("/clients/")
          : Promise.resolve({ count: 0, next: null, previous: null, results: [] } satisfies ApiList<Client>)
      ]);
      startTransition(() => {
        setThreads(messagesPayload.results);
        setClients(clientsPayload.results.filter((client) => client.user));
        setActiveThreadId((current) => current ?? messagesPayload.results[0]?.id ?? null);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(getStoredUser()?.profile?.role ?? "manager");
    loadMessages();
  }, []);

  async function submitThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiFetch<MessageThread>("/messages/", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject.trim(),
          priority: form.priority,
          client: form.clientUserId ? Number(form.clientUserId) : undefined,
          initial_message: form.body.trim()
        })
      });
      setThreads((current) => [created, ...current]);
      setActiveThreadId(created.id);
      setForm(initialForm);
      setSuccess("Message envoye.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply() {
    if (!activeThread || !replyText.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const message = await apiFetch<MessageItem>(`/messages/${activeThread.id}/repondre/`, {
        method: "POST",
        body: JSON.stringify({ body: replyText.trim() })
      });
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThread.id ? { ...thread, messages: [...thread.messages, message] } : thread
        )
      );
      setReplyText("");
      setSuccess("Reponse envoyee.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Reponse impossible.");
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
              <Badge tone="green">Messagerie active</Badge>
              <Badge tone="gold">{isClient ? "Message atelier" : "Client - Atelier"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <MessageCircle size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Messages</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Ecrivez a l'atelier et suivez les reponses liees a vos commandes, paiements ou rendez-vous."
                    : "Messages entre l'atelier et les clients."}
                </p>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={loadMessages} disabled={loading}>
            <RefreshCw size={17} />
            Actualiser
          </Button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <form onSubmit={submitThread} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <h2 className="text-lg font-semibold">{isClient ? "Ecrire a l'atelier" : "Nouveau message"}</h2>
            <div className="mt-5 grid gap-4">
              {canChooseClient ? (
                <label className="text-sm text-stone-300">
                  Client
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.clientUserId}
                    onChange={(event) => setForm((current) => ({ ...current, clientUserId: event.target.value }))}
                  >
                    <option value="">Conversation atelier</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.user ?? ""}>
                        {client.full_name} - {client.phone}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-sm text-stone-300">
                Sujet
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Essayage, paiement, livraison..."
                  required
                />
              </label>
              <label className="text-sm text-stone-300">
                Priorite
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MessageThread["priority"] }))}
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
              <label className="text-sm text-stone-300">
                Message
                <textarea
                  className="mt-2 min-h-32 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Ecrivez le message..."
                  required
                />
              </label>
              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}
              <Button className="w-full" disabled={submitting || !form.subject.trim() || !form.body.trim()}>
                <Send size={16} />
                Envoyer
              </Button>
            </div>
          </form>

          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
              <h2 className="text-lg font-semibold">{isClient ? "Mes conversations" : "Conversations"}</h2>
              <div className="mt-4 grid gap-3">
                {loading ? <EmptyState label="Chargement..." /> : null}
                {!loading && threads.length === 0 ? <EmptyState label="Aucune conversation." /> : null}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    className={`rounded-lg border p-3 text-left transition ${
                      activeThread?.id === thread.id ? "border-gold/45 bg-gold/[0.08]" : "border-line bg-ink/45 hover:border-gold/25"
                    }`}
                    onClick={() => setActiveThreadId(thread.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ivory">{thread.subject}</span>
                      <Badge tone={thread.priority === "urgent" ? "red" : thread.priority === "high" ? "gold" : "neutral"}>
                        {thread.priority}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{thread.client_name} - {thread.workshop_name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
              {activeThread ? (
                <>
                  <div className="border-b border-line pb-4">
                    <h2 className="text-lg font-semibold">{activeThread.subject}</h2>
                    <p className="mt-1 text-sm text-stone-500">{activeThread.client_name} - {activeThread.workshop_name}</p>
                  </div>
                  <div className="premium-scrollbar mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {activeThread.messages.length === 0 ? <EmptyState label="Aucun message dans cette conversation." /> : null}
                    {activeThread.messages.map((message) => (
                      <article key={message.id} className="rounded-lg border border-line bg-ink/45 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ivory">{message.sender_name}</span>
                          <Badge tone={message.sender_role === "client" ? "neutral" : "gold"}>{message.sender_role}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-300">{message.body}</p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder="Repondre..."
                    />
                    <Button onClick={submitReply} disabled={submitting || !replyText.trim()}>
                      <Send size={16} />
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState label="Selectionnez une conversation." />
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-line bg-ink/35 px-3 py-8 text-center text-sm text-stone-500">{label}</div>;
}
