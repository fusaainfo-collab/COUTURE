"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, Sparkles, Users } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = {
  id: number;
  user_username?: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  gender: "male" | "female" | "child" | "other";
  preferences: Record<string, unknown>;
  favorite_sizes: Record<string, unknown>;
  private_notes: string;
  photo: string | null;
  vip_level: number;
  is_active: boolean;
  commandes_actives: number;
  created_at: string;
  updated_at: string;
};

const initialForm = {
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  gender: "other",
  vipLevel: "0",
  notes: "",
  preferenceStyle: "",
  preferenceContact: "whatsapp",
  username: "",
  password: ""
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadClients() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<ApiList<Client>>("/clients/");
      startTransition(() => {
        setClients(payload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      fullNameInputRef.current?.focus();
    }, 180);
  }

  const filteredClients = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return clients;

    return clients.filter((client) =>
      [
        client.full_name,
        client.phone,
        client.whatsapp,
        client.email,
        client.address,
        client.private_notes
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [clients, deferredQuery]);

  const activeClients = clients.filter((client) => client.is_active).length;
  const vipClients = clients.filter((client) => client.vip_level >= 3).length;
  const regularClients = clients.filter((client) => client.commandes_actives > 0).length;
  const inactiveClients = clients.filter((client) => !client.is_active).length;

  async function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        gender: form.gender,
        vip_level: Number(form.vipLevel),
        private_notes: form.notes.trim(),
        preferences: {
          style: form.preferenceStyle.trim(),
          contact: form.preferenceContact
        },
        favorite_sizes: {},
        is_active: true,
        username: form.username.trim(),
        password: form.password
      };

      const created = await apiFetch<Client>("/clients/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => {
        setClients((current) => [created, ...current]);
      });
      setForm(initialForm);
      setSuccess(`Client ${created.full_name} ajoute avec succes.`);
      document.getElementById("liste-clients")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation du client impossible.");
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
              <Badge tone="green">Clients live</Badge>
              <Badge tone="gold">Creation active</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Users size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Clients</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Fiches clients riches avec contact, preferences, niveau VIP et historique de relation.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadClients()} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Ajouter client
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Clients actifs" value={activeClients} tone="green" />
          <Metric label="VIP" value={vipClients} tone="gold" />
          <Metric label="Reguliers" value={regularClients} tone="green" />
          <Metric label="Inactifs" value={inactiveClients} tone="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <form
            id="nouveau-client"
            ref={formRef}
            onSubmit={submitClient}
            className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un client</h2>
                <p className="mt-1 text-sm text-stone-500">Le formulaire cree une vraie fiche client dans Django.</p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Nom complet
                <input
                  ref={fullNameInputRef}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Nom complet"
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Telephone
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+227 ..."
                    required
                  />
                </label>

                <label className="text-sm text-stone-300">
                  WhatsApp
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.whatsapp}
                    onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
                    placeholder="+227 ..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Email
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="client@email.com"
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Genre
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.gender}
                    onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="child">Enfant</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Adresse
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Quartier, ville, repere..."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Niveau VIP
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="number"
                    min="0"
                    max="5"
                    value={form.vipLevel}
                    onChange={(event) => setForm((current) => ({ ...current, vipLevel: event.target.value }))}
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Preference contact
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.preferenceContact}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, preferenceContact: event.target.value }))
                    }
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telephone">Telephone</option>
                    <option value="email">Email</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Preference style
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.preferenceStyle}
                  onChange={(event) => setForm((current) => ({ ...current, preferenceStyle: event.target.value }))}
                  placeholder="Classique, luxe, coupe droite..."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Identifiant client
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="Identifiant client"
                  />
                </label>
                <label className="text-sm text-stone-300">
                  Mot de passe client
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Optionnel"
                  />
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes privees
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Habitudes, sensibilites, details utiles..."
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

              <Button className="w-full" disabled={submitting || !form.fullName || !form.phone}>
                {submitting ? "Ajout en cours..." : "Enregistrer le client"}
              </Button>
            </div>
          </form>

          <div id="liste-clients" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fichier clients</h2>
                <p className="mt-1 text-sm text-stone-500">Le nouveau client apparait ici juste apres creation.</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher nom, telephone, email..."
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun client trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredClients.map((client) => (
                  <article key={client.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{client.full_name}</h3>
                          <Badge tone={client.vip_level >= 3 ? "gold" : "neutral"}>VIP {client.vip_level}</Badge>
                          <Badge tone={client.is_active ? "green" : "red"}>
                            {client.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">
                          {client.phone}{client.user_username ? ` - ${client.user_username}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {client.whatsapp || "Sans WhatsApp"} • {client.email || "Sans email"}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                        <span>{client.commandes_actives} commande(s) active(s)</span>
                        <span>{labelGender(client.gender)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Info label="Adresse" value={client.address || "Non renseignee"} />
                      <Info
                        label="Preference"
                        value={String(client.preferences?.style ?? client.preferences?.contact ?? "Non renseignee")}
                      />
                      <Info label="Notes" value={client.private_notes || "Aucune note"} />
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

function labelGender(gender: Client["gender"]) {
  if (gender === "male") return "Homme";
  if (gender === "female") return "Femme";
  if (gender === "child") return "Enfant";
  return "Autre";
}
