"use client";

import { ChangeEvent, FormEvent, startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  GalleryHorizontalEnd,
  ImagePlus,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X
} from "lucide-react";

import { apiFetch, ApiList, getStoredUser, isClientUser, toAbsoluteAssetUrl } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PatternItem = {
  id: number;
  name: string;
  category: string;
  image: string | null;
  tags: string[];
  description: string;
  is_favorite: boolean;
  trend_score: number;
  created_at: string;
  updated_at: string;
};

const categoryOptions = [
  "bazin",
  "costume",
  "robe",
  "kaftan",
  "boubou",
  "uniforme",
  "mariage",
  "luxe",
  "casual",
  "africain_moderne"
] as const;

const initialForm = {
  name: "",
  category: "bazin",
  description: "",
  tags: "",
  trendScore: "70",
  isFavorite: false
};

export default function Page() {
  const isClient = isClientUser(getStoredUser());
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);

  async function loadPatterns() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<ApiList<PatternItem>>("/modeles/");
      startTransition(() => {
        setPatterns(payload.results);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger la galerie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatterns();
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
  }

  function startEdit(pattern: PatternItem) {
    setEditingId(pattern.id);
    setSelectedFile(null);
    setError("");
    setSuccess("");
    setForm({
      name: pattern.name,
      category: pattern.category,
      description: pattern.description,
      tags: (pattern.tags ?? []).join(", "),
      trendScore: String(pattern.trend_score),
      isFavorite: pattern.is_favorite
    });
    document.getElementById("formulaire-modele")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedFile(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("category", form.category);
      body.append("description", form.description.trim());
      body.append(
        "tags",
        JSON.stringify(
          form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      );
      body.append("trend_score", form.trendScore);
      body.append("is_favorite", form.isFavorite ? "true" : "false");
      if (selectedFile) {
        body.append("image", selectedFile);
      }

      const saved = await apiFetch<PatternItem>(editingId ? `/modeles/${editingId}/` : "/modeles/", {
        method: editingId ? "PATCH" : "POST",
        body
      });

      startTransition(() => {
        setPatterns((current) => {
          if (editingId) {
            return current.map((pattern) => (pattern.id === editingId ? saved : pattern));
          }
          return [saved, ...current];
        });
      });
      setForm(initialForm);
      setSelectedFile(null);
      setEditingId(null);
      setSuccess(editingId ? "Modele modifie avec succes." : "Modele ajoute a la galerie.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPatterns = patterns.filter((pattern) => {
    if (!normalizedQuery) return true;
    const haystack = [
      pattern.name,
      pattern.category,
      pattern.description,
      ...(pattern.tags ?? [])
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const favoriteCount = patterns.filter((pattern) => pattern.is_favorite).length;
  const imageCount = patterns.filter((pattern) => Boolean(pattern.image)).length;
  const topTrend = patterns.reduce((best, pattern) => Math.max(best, pattern.trend_score), 0);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">Galerie active</Badge>
              <Badge tone="gold">{isClient ? "Modeles atelier" : "Upload photo actif"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <GalleryHorizontalEnd size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">{isClient ? "Modeles" : "Galerie photo"}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  {isClient
                    ? "Modeles importes par l'atelier actif: photos, categories, tags et inspirations disponibles pour vos commandes."
                    : "Bibliotheque visuelle des modeles couture avec photo, categorie, tags, tendance et favoris."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadPatterns()} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            {!isClient ? (
            <Button variant="secondary" disabled>
              <SlidersHorizontal size={17} />
              Filtres avances
            </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <p className="text-sm text-stone-500">Modeles</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl font-semibold">{patterns.length}</span>
              <Badge tone="green">Catalogue</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <p className="text-sm text-stone-500">Photos chargees</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl font-semibold">{imageCount}</span>
              <Badge tone="gold">Media</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <p className="text-sm text-stone-500">Favoris</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl font-semibold">{favoriteCount}</span>
              <Badge tone="gold">Selection</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
            <p className="text-sm text-stone-500">Tendance max</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl font-semibold">{topTrend}</span>
              <Badge tone="green">Pulse</Badge>
            </div>
          </div>
        </section>

        <section className={isClient ? "grid gap-6" : "grid gap-6 xl:grid-cols-[0.72fr_1.28fr]"}>
          {!isClient ? (
          <form id="formulaire-modele" onSubmit={onSubmit} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{editingId ? "Modifier le modele" : "Ajouter un modele"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {editingId ? "Les changements modifient le catalogue visuel dans Django." : "Le formulaire envoie une vraie image au backend Django."}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                {editingId ? <Pencil size={18} /> : <ImagePlus size={18} />}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Nom du modele
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex: Boubou royal brode"
                  required
                />
              </label>

              <label className="text-sm text-stone-300">
                Categorie
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-stone-300">
                Tags
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="luxe, mariage, bazin"
                />
              </label>

              <label className="text-sm text-stone-300">
                Description
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Details de coupe, tissu ou inspiration."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-stone-300">
                  Score tendance
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    type="number"
                    min="0"
                    max="100"
                    value={form.trendScore}
                    onChange={(event) => setForm((current) => ({ ...current, trendScore: event.target.value }))}
                  />
                </label>

                <label className="flex items-end gap-3 rounded-lg border border-line bg-ink/35 px-3 py-3 text-sm text-stone-300">
                  <input
                    type="checkbox"
                    checked={form.isFavorite}
                    onChange={(event) => setForm((current) => ({ ...current, isFavorite: event.target.checked }))}
                  />
                  Marquer comme favori
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Photo
                <input
                  className="mt-2 block w-full rounded-lg border border-dashed border-line bg-ink/35 px-3 py-3 text-sm text-stone-300 file:mr-4 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />
                {editingId ? <span className="mt-2 block text-xs text-stone-500">L'image actuelle reste conservee si aucune nouvelle photo n'est choisie.</span> : null}
              </label>

              <div className="overflow-hidden rounded-lg border border-line bg-ink/35">
                {previewUrl ? (
                  <img src={previewUrl} alt="Apercu du modele" className="h-72 w-full bg-ink object-contain" />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-[linear-gradient(135deg,rgba(214,178,94,0.16),rgba(13,27,42,0.36),rgba(8,9,11,0.92))] text-sm text-stone-400">
                    Apercu photo
                  </div>
                )}
              </div>

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

              <div className="grid gap-2 sm:grid-cols-2">
                {editingId ? (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    <X size={17} />
                    Annuler
                  </Button>
                ) : null}
                <Button className={editingId ? "w-full" : "w-full sm:col-span-2"} disabled={submitting || !form.name.trim()}>
                  {submitting ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Ajouter a la galerie"}
                </Button>
              </div>
            </div>
          </form>
          ) : null}

          <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{isClient ? "Catalogue atelier" : "Catalogue visuel"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isClient
                    ? "Vous voyez uniquement les modeles deja importes dans l'atelier actif."
                    : "Recherche locale, photos reelles et etat favori."}
                </p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher modele, tag ou categorie"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement de la galerie...</div>
            ) : filteredPatterns.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun modele ne correspond a la recherche.</div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredPatterns.map((pattern) => {
                  const imageUrl = toAbsoluteAssetUrl(pattern.image);
                  return (
                    <article key={pattern.id} className="overflow-hidden rounded-lg border border-line bg-ink/45">
                      <div className="relative flex aspect-[4/5] min-h-80 items-center justify-center overflow-hidden border-b border-line bg-ink">
                        {imageUrl ? (
                          <img src={imageUrl} alt={pattern.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(214,178,94,0.2),rgba(13,27,42,0.5),rgba(8,9,11,0.95))]">
                            <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                              <Sparkles size={22} />
                            </span>
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex gap-2">
                          <Badge tone="gold">{pattern.category.replaceAll("_", " ")}</Badge>
                          {pattern.is_favorite ? (
                            <Badge tone="green">
                              <Star size={13} />
                              Favori
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-ivory">{pattern.name}</h3>
                            <p className="mt-1 text-sm text-stone-400">{pattern.description || "Modele sans description."}</p>
                          </div>
                          <Badge tone={pattern.trend_score >= 85 ? "green" : "neutral"}>{pattern.trend_score}</Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(pattern.tags ?? []).length ? (
                            pattern.tags.map((tag) => (
                              <span key={`${pattern.id}-${tag}`} className="rounded-lg border border-line px-2.5 py-1 text-xs text-stone-300">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-stone-500">Aucun tag</span>
                          )}
                        </div>

                        {!isClient ? (
                        <Button className="mt-4 w-full" variant="secondary" onClick={() => startEdit(pattern)}>
                          <Pencil size={16} />
                          Modifier
                        </Button>
                        ) : null}
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
