"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, Sparkles, UserRoundCog } from "lucide-react";

import { apiFetch, ApiList } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tailor = {
  id: number;
  user_username?: string;
  full_name: string;
  phone: string;
  specialty: string;
  skills: string[];
  status: "available" | "busy" | "offline";
  quality_score: string | number;
  average_delay_days: string | number;
  notes: string;
  commandes_actives: number;
  commandes_terminees: number;
};

const statusLabels = {
  available: "Disponible",
  busy: "Charge",
  offline: "Absent"
};

const initialForm = {
  fullName: "",
  phone: "",
  specialty: "",
  skills: "",
  status: "available" as Tailor["status"],
  qualityScore: "4.5",
  averageDelayDays: "0",
  notes: "",
  username: "",
  password: ""
};

export default function TailleursPage() {
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadTailors() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<ApiList<Tailor>>("/tailleurs/");
      startTransition(() => setTailors(payload.results));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les tailleurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTailors();
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => nameRef.current?.focus(), 180);
  }

  const filteredTailors = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return tailors;
    return tailors.filter((tailor) =>
      [tailor.full_name, tailor.phone, tailor.specialty, tailor.notes, ...(tailor.skills ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, tailors]);

  const availableCount = tailors.filter((tailor) => tailor.status === "available").length;
  const busyCount = tailors.filter((tailor) => tailor.status === "busy").length;
  const activeOrders = tailors.reduce((sum, tailor) => sum + Number(tailor.commandes_actives || 0), 0);
  const averageQuality = tailors.length
    ? (tailors.reduce((sum, tailor) => sum + Number(tailor.quality_score || 0), 0) / tailors.length).toFixed(1)
    : "0";

  async function submitTailor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        specialty: form.specialty.trim(),
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        status: form.status,
        quality_score: form.qualityScore,
        average_delay_days: form.averageDelayDays,
        notes: form.notes.trim(),
        username: form.username.trim(),
        password: form.password
      };

      const created = await apiFetch<Tailor>("/tailleurs/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => setTailors((current) => [created, ...current]));
      setForm(initialForm);
      setSuccess(`Tailleur ${created.full_name} ajoute avec succes.`);
      document.getElementById("liste-tailleurs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation du tailleur impossible.");
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
              <Badge tone="green">Tailleurs live</Badge>
              <Badge tone="gold">Creation active</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <UserRoundCog size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Tailleurs</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Profils tailleurs avec specialites, disponibilite, charge et score qualite.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadTailors} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button onClick={scrollToForm}>
              <Sparkles size={17} />
              Ajouter tailleur
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Disponibles" value={availableCount} tone="green" />
          <Metric label="Charges" value={busyCount} tone="gold" />
          <Metric label="Commandes" value={activeOrders} tone="green" />
          <Metric label="Qualite" value={averageQuality} tone="gold" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form ref={formRef} onSubmit={submitTailor} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un tailleur</h2>
                <p className="mt-1 text-sm text-stone-500">Cree un vrai profil tailleur dans Django.</p>
              </div>
              <Badge tone="gold">API</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Nom complet
                <input ref={nameRef} className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Ex: Fatou Ibrahim" required />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Telephone
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+227 ..." />
                </label>
                <label className="text-sm text-stone-300">
                  Specialite
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.specialty} onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))} placeholder="Broderie, costume, robe..." />
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Competences
                <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="bazin, finition, mariage" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Identifiant app
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="tailleur-fatou" />
                </label>
                <label className="text-sm text-stone-300">
                  Mot de passe app
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Optionnel" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm text-stone-300">
                  Statut
                  <select className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Tailor["status"] }))}>
                    <option value="available">Disponible</option>
                    <option value="busy">Charge</option>
                    <option value="offline">Absent</option>
                  </select>
                </label>
                <label className="text-sm text-stone-300">
                  Qualite
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="number" min="0" max="5" step="0.1" value={form.qualityScore} onChange={(event) => setForm((current) => ({ ...current, qualityScore: event.target.value }))} />
                </label>
                <label className="text-sm text-stone-300">
                  Retard moyen
                  <input className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45" type="number" min="0" step="0.1" value={form.averageDelayDays} onChange={(event) => setForm((current) => ({ ...current, averageDelayDays: event.target.value }))} />
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Notes
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Disponibilites, forces, remarques..." />
              </label>

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <Button className="w-full" disabled={submitting || !form.fullName.trim()}>
                {submitting ? "Ajout en cours..." : "Enregistrer le tailleur"}
              </Button>
            </div>
          </form>

          <div id="liste-tailleurs" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Equipe atelier</h2>
                <p className="mt-1 text-sm text-stone-500">Le nouveau profil apparait ici apres creation.</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher tailleur..." />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des tailleurs...</div>
            ) : filteredTailors.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun tailleur trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredTailors.map((tailor) => (
                  <article key={tailor.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{tailor.full_name}</h3>
                          <Badge tone={tailor.status === "available" ? "green" : tailor.status === "busy" ? "gold" : "red"}>{statusLabels[tailor.status]}</Badge>
                          <Badge tone="gold">{tailor.quality_score}/5</Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{tailor.specialty || "Specialite non renseignee"}</p>
                        <p className="mt-1 text-sm text-stone-500">{tailor.phone || "Sans telephone"}{tailor.user_username ? ` - ${tailor.user_username}` : ""}</p>
                      </div>
                      <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                        <span>{tailor.commandes_actives} commande(s) active(s)</span>
                        <span>{tailor.commandes_terminees} terminee(s)</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(tailor.skills ?? []).length ? tailor.skills.map((skill) => <Badge key={`${tailor.id}-${skill}`} tone="neutral">{skill}</Badge>) : <span className="text-sm text-stone-500">Aucune competence detaillee.</span>}
                    </div>
                    <p className="mt-4 text-sm text-stone-400">{tailor.notes || "Aucune note."}</p>
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
