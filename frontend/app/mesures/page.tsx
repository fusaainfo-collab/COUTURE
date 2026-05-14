"use client";

import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Ruler, Search, Sparkles } from "lucide-react";

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

type MeasurementRevision = {
  id: number;
  changed_by_name: string;
  previous_measurements: Record<string, number | string>;
  new_measurements: Record<string, number | string>;
  note: string;
  created_at: string;
};

type MeasurementProfile = {
  id: number;
  client: number;
  client_name: string;
  label: string;
  category: Category;
  unit: string;
  measurements: Record<string, number | string>;
  reference_photos: string[];
  notes: string;
  is_default: boolean;
  revisions: MeasurementRevision[];
  created_at: string;
  updated_at: string;
};

type Category = "man" | "woman" | "child";

type MeasurementField = {
  key: string;
  label: string;
};

const categoryLabels: Record<Category, string> = {
  man: "Homme",
  woman: "Femme",
  child: "Enfant"
};

const measurementTemplates: Record<Category, MeasurementField[]> = {
  man: [
    { key: "poitrine", label: "Poitrine" },
    { key: "manche", label: "Manche" },
    { key: "epaule", label: "Epaule" },
    { key: "longueur", label: "Longueur" },
    { key: "col", label: "Col" },
    { key: "poignet", label: "Poignet" },
    { key: "pantalon", label: "Pantalon" }
  ],
  woman: [
    { key: "poitrine", label: "Poitrine" },
    { key: "taille", label: "Taille" },
    { key: "hanche", label: "Hanche" },
    { key: "longueur_robe", label: "Longueur robe" },
    { key: "bras", label: "Bras" },
    { key: "epaule", label: "Epaule" }
  ],
  child: [
    { key: "poitrine", label: "Poitrine" },
    { key: "taille", label: "Taille" },
    { key: "hanche", label: "Hanche" },
    { key: "longueur", label: "Longueur" },
    { key: "manche", label: "Manche" },
    { key: "epaule", label: "Epaule" }
  ]
};

const measurementLabels = Object.values(measurementTemplates).flat().reduce<Record<string, string>>((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {});

function createMeasurementValues(category: Category) {
  return measurementTemplates[category].reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
}

function createInitialForm() {
  return {
    client: "",
    label: "Profil principal",
    category: "man" as Category,
    unit: "cm",
    notes: "",
    referencePhotos: "",
    isDefault: true,
    values: createMeasurementValues("man")
  };
}

export default function MesuresPage() {
  const isClient = isClientUser(getStoredUser());
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientSelectRef = useRef<HTMLSelectElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [clientsPayload, profilesPayload] = await Promise.all([
        apiFetch<ApiList<Client>>("/clients/"),
        apiFetch<ApiList<MeasurementProfile>>("/mesures/")
      ]);

      startTransition(() => {
        setClients(clientsPayload.results);
        setProfiles(profilesPayload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les mesures.");
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

  function updateCategory(nextCategory: Category) {
    setForm((current) => {
      const nextValues = createMeasurementValues(nextCategory);

      Object.keys(nextValues).forEach((key) => {
        nextValues[key] = current.values[key] ?? "";
      });

      return {
        ...current,
        category: nextCategory,
        values: nextValues
      };
    });
  }

  function updateMeasurementValue(key: string, value: string) {
    setForm((current) => ({
      ...current,
      values: {
        ...current.values,
        [key]: value
      }
    }));
  }

  const activeTemplate = measurementTemplates[form.category];

  const filteredProfiles = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return profiles;

    return profiles.filter((profile) => {
      const measurements = Object.entries(profile.measurements ?? {})
        .map(([key, value]) => `${measurementLabels[key] ?? key} ${value}`)
        .join(" ");

      const haystack = [
        profile.client_name,
        profile.label,
        categoryLabels[profile.category],
        profile.notes,
        measurements
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [deferredQuery, profiles]);

  const defaultProfiles = profiles.filter((profile) => profile.is_default).length;
  const totalRevisions = profiles.reduce((sum, profile) => sum + profile.revisions.length, 0);
  const categoryCount = new Set(profiles.map((profile) => profile.category)).size;

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const measurements = Object.fromEntries(
        Object.entries(form.values)
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => {
            const numericValue = Number(value);
            return [key, Number.isFinite(numericValue) ? numericValue : value.trim()];
          })
      );

      const payload = {
        client: Number(form.client),
        label: form.label.trim(),
        category: form.category,
        unit: form.unit.trim() || "cm",
        measurements,
        reference_photos: form.referencePhotos
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
        notes: form.notes.trim(),
        is_default: form.isDefault
      };

      const created = await apiFetch<MeasurementProfile>("/mesures/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => {
        setProfiles((current) => [created, ...current]);
      });
      setForm(createInitialForm());
      setSuccess(`Profil ${created.label} ajoute pour ${created.client_name}.`);
      document.getElementById("liste-mesures")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Creation du profil impossible.");
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
              <Badge tone="green">Mesures live</Badge>
              <Badge tone="gold">{isClient ? "Consultation" : "Creation active"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Ruler size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Mesures</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Vos profils de mesures conserves par l'atelier, avec les notes utiles et l'historique de mise a jour."
                    : "Profils homme, femme et enfant avec historique, notes atelier et comparaison des revisions."}
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
              Ajouter mesure
            </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Profils" value={profiles.length} tone="green" badgeLabel="Actif" />
          <Metric label="Par defaut" value={defaultProfiles} tone="gold" badgeLabel="Principal" />
          <Metric label="Revisions" value={totalRevisions} tone="green" badgeLabel="Historique" />
          <Metric label="Categories" value={categoryCount} tone="gold" badgeLabel="Atelier" />
        </section>

        <section className={isClient ? "grid gap-6" : "grid gap-6 xl:grid-cols-[0.82fr_1.18fr]"}>
          {!isClient ? (
          <form
            id="nouvelle-mesure"
            ref={formRef}
            onSubmit={submitProfile}
            className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ajouter un profil de mesures</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Ce formulaire cree un vrai profil de mesures dans Django pour un client existant.
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
                  Profil
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.label}
                    onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Profil principal, mariage, retouche..."
                    required
                  />
                </label>

                <label className="text-sm text-stone-300">
                  Categorie
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.category}
                    onChange={(event) => updateCategory(event.target.value as Category)}
                  >
                    <option value="man">Homme</option>
                    <option value="woman">Femme</option>
                    <option value="child">Enfant</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Unite
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.unit}
                    onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                    placeholder="cm"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-line bg-ink/45 px-4 py-3 text-sm text-stone-300">
                  <input
                    className="h-4 w-4 rounded border-line bg-ink/55"
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
                  />
                  Definir comme profil principal
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {activeTemplate.map((field) => (
                  <label key={field.key} className="text-sm text-stone-300">
                    {field.label}
                    <input
                      className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.values[field.key] ?? ""}
                      onChange={(event) => updateMeasurementValue(field.key, event.target.value)}
                      placeholder={`Ex: 42 ${form.unit || "cm"}`}
                    />
                  </label>
                ))}
              </div>

              <label className="text-sm text-stone-300">
                Photos de reference
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.referencePhotos}
                  onChange={(event) => setForm((current) => ({ ...current, referencePhotos: event.target.value }))}
                  placeholder="Une URL par ligne ou separee par des virgules"
                />
              </label>

              <label className="text-sm text-stone-300">
                Notes atelier
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Details de coupe, posture, ajustements preferes..."
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

              <Button className="w-full" disabled={submitting || !form.client || !form.label || clients.length === 0}>
                {submitting ? "Ajout en cours..." : "Enregistrer le profil"}
              </Button>

              {clients.length === 0 && !loading ? (
                <div className="text-sm text-stone-500">
                  Cree d'abord au moins un client pour pouvoir enregistrer des mesures.
                </div>
              ) : null}
            </div>
          </form>
          ) : null}

          <div id="liste-mesures" className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{isClient ? "Mes mesures" : "Profils de mesures"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isClient
                    ? "L'atelier garde ces mesures pour vos commandes et ajustements."
                    : "Les nouveaux profils apparaissent ici avec leurs champs et l'historique des revisions."}
                </p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher client, profil, categorie..."
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des profils...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun profil de mesure trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredProfiles.map((profile) => {
                  const latestRevision = profile.revisions[0];
                  const measurementEntries = Object.entries(profile.measurements ?? {});

                  return (
                    <article key={profile.id} className="rounded-lg border border-line bg-ink/45 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-ivory">{profile.client_name}</h3>
                            <Badge tone="gold">{profile.label}</Badge>
                            <Badge tone="neutral">{categoryLabels[profile.category]}</Badge>
                            <Badge tone={profile.is_default ? "green" : "neutral"}>
                              {profile.is_default ? "Principal" : "Secondaire"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-stone-400">
                            Unite {profile.unit} | mis a jour le {formatDate(profile.updated_at)}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {profile.reference_photos.length} photo(s) reference | {profile.revisions.length} revision(s)
                          </p>
                        </div>
                        <div className="grid gap-1 text-sm text-stone-400 lg:text-right">
                          <span>{measurementEntries.length} mesure(s) renseignee(s)</span>
                          <span>{latestRevision ? `Derniere revision ${formatDate(latestRevision.created_at)}` : "Sans revision"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {measurementEntries.length > 0 ? (
                          measurementEntries.map(([key, value]) => (
                            <Badge key={`${profile.id}-${key}`} tone="neutral">
                              {measurementLabels[key] ?? key}: {String(value)} {profile.unit}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-stone-500">Aucune mesure detaillee encore renseignee.</span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Info label="Notes" value={profile.notes || "Aucune note"} />
                        <Info
                          label="Historique"
                          value={
                            latestRevision
                              ? `${latestRevision.changed_by_name || "Systeme"} - ${latestRevision.note || "Revision enregistree"}`
                              : "Aucune revision"
                          }
                        />
                      </div>
                    </article>
                  );
                })}
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
