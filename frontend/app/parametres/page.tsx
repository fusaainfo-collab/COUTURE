"use client";

import { FormEvent, startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, RefreshCw, Settings, UserPlus } from "lucide-react";

import { apiFetch, ApiList, getStoredUser, getWorkshopId, isAdminUser, setWorkshopId } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Workshop = {
  id: number;
  name: string;
  slug: string;
  phone: string;
  address: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ManagedUser = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  profile?: {
    role?: string;
    phone?: string;
  } | null;
  workshops: Array<{ id: number; name: string; role: string }>;
};

const initialForm = {
  name: "",
  phone: "",
  address: "",
  currency: "XOF",
  managerFullName: "",
  managerUsername: "",
  managerPassword: "",
  managerPhone: "",
  managerEmail: ""
};

function hasManagerDraft(form: typeof initialForm) {
  return Boolean(
    form.managerFullName.trim() ||
      form.managerUsername.trim() ||
      form.managerPassword ||
      form.managerPhone.trim() ||
      form.managerEmail.trim()
  );
}

function isManagerReady(form: typeof initialForm) {
  return Boolean(form.managerFullName.trim() && form.managerUsername.trim() && form.managerPassword.length >= 8);
}

export default function ParametresPage() {
  const router = useRouter();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activeWorkshopId, setActiveWorkshopId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeWorkshop = useMemo(
    () => workshops.find((workshop) => String(workshop.id) === activeWorkshopId),
    [activeWorkshopId, workshops]
  );

  async function loadWorkshops() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch<ApiList<Workshop>>("/workshops/");
      const storedId = getWorkshopId();
      const selected = payload.results.find((workshop) => String(workshop.id) === storedId) ?? payload.results[0];
      startTransition(() => {
        setWorkshops(payload.results);
        if (selected) {
          setActiveWorkshopId(String(selected.id));
          setWorkshopId(selected.id);
        }
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les ateliers.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const payload = await apiFetch<ApiList<ManagedUser>>("/auth/users/");
      setUsers(payload.results);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!isAdminUser(currentUser)) {
      router.replace("/dashboard");
      return;
    }

    setAccessChecked(true);
    loadWorkshops();
    loadUsers();
  }, [router]);

  function editWorkshop(workshop: Workshop) {
    setEditingId(workshop.id);
    setForm({
      name: workshop.name,
      phone: workshop.phone,
      address: workshop.address,
      currency: workshop.currency || "XOF",
      managerFullName: "",
      managerUsername: "",
      managerPassword: "",
      managerPhone: "",
      managerEmail: ""
    });
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  function activateWorkshop(workshop: Workshop) {
    setWorkshopId(workshop.id);
    setActiveWorkshopId(String(workshop.id));
    setSuccess(`Atelier actif: ${workshop.name}.`);
    window.setTimeout(() => window.location.reload(), 450);
  }

  async function submitWorkshop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload: {
        name: string;
        phone: string;
        address: string;
        currency: string;
        is_active: boolean;
        manager?: {
          full_name: string;
          username: string;
          password: string;
          phone: string;
          email: string;
        };
      } = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        currency: form.currency.trim() || "XOF",
        is_active: true
      };

      const managerDraftStarted = hasManagerDraft(form);
      if (!editingId && managerDraftStarted && !isManagerReady(form)) {
        throw new Error("Completez le nom, l'identifiant et un mot de passe de 8 caracteres pour creer le gerant.");
      }

      if (!editingId && managerDraftStarted) {
        payload.manager = {
          full_name: form.managerFullName.trim(),
          username: form.managerUsername.trim(),
          password: form.managerPassword,
          phone: form.managerPhone.trim(),
          email: form.managerEmail.trim()
        };
      }

      const saved = await apiFetch<Workshop>(editingId ? `/workshops/${editingId}/` : "/workshops/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });

      startTransition(() => {
        setWorkshops((current) => {
          if (editingId) return current.map((workshop) => (workshop.id === saved.id ? saved : workshop));
          return [saved, ...current];
        });
      });
      const message = editingId ? "Atelier modifie." : "Nouvel atelier ajoute et active.";
      setWorkshopId(saved.id);
      setActiveWorkshopId(String(saved.id));
      await loadUsers();
      resetForm();
      setSuccess(editingId ? message : payload.manager ? "Atelier et gerant principal crees." : "Atelier cree.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmitWorkshop = Boolean(form.name.trim());

  if (!accessChecked) {
    return (
      <AppShell>
        <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 text-sm text-stone-400">
          Verification des droits d'acces...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">Multi-ateliers actif</Badge>
              <Badge tone="gold">Donnees isolees</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Settings size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Parametres</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Nom de l'atelier, ateliers multiples, devise et isolation des donnees.
                </p>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={loadWorkshops} disabled={loading}>
            <RefreshCw size={17} />
            Actualiser
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Ateliers" value={workshops.length} tone="green" />
          <Metric label="Atelier actif" value={activeWorkshop?.name ?? "-"} tone="gold" />
          <Metric label="Devise" value={activeWorkshop?.currency ?? "XOF"} tone="neutral" />
          <Metric label="Isolation" value="Active" tone="green" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <form onSubmit={submitWorkshop} className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{editingId ? "Modifier l'atelier" : "Ajouter un atelier"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Chaque atelier garde ses propres clients, commandes, paiements et rapports.
                </p>
              </div>
              <Building2 size={20} className="text-gold" />
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-stone-300">
                Nom de l'atelier
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nom de l'atelier"
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
                  />
                </label>
                <label className="text-sm text-stone-300">
                  Devise
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                    value={form.currency}
                    onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                    placeholder="XOF"
                  />
                </label>
              </div>

              <label className="text-sm text-stone-300">
                Adresse
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-line bg-ink/55 px-3 py-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Quartier, ville, repere..."
                />
              </label>

              {!editingId ? (
                <div className="border-t border-line pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">Gerant principal</h3>
                      <p className="mt-1 text-sm text-stone-500">Optionnel. Si renseigne, le compte sera rattache automatiquement a cet atelier.</p>
                    </div>
                    <UserPlus size={19} className="text-gold" />
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="text-sm text-stone-300">
                      Nom complet
                      <input
                        className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                        value={form.managerFullName}
                        onChange={(event) => setForm((current) => ({ ...current, managerFullName: event.target.value }))}
                        placeholder="Nom complet"
                      />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-stone-300">
                        Identifiant
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                          value={form.managerUsername}
                          onChange={(event) => setForm((current) => ({ ...current, managerUsername: event.target.value }))}
                          placeholder="Identifiant utilisateur"
                        />
                      </label>
                      <label className="text-sm text-stone-300">
                        Mot de passe
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                          type="password"
                          value={form.managerPassword}
                          onChange={(event) => setForm((current) => ({ ...current, managerPassword: event.target.value }))}
                          placeholder="Minimum 8 caracteres"
                          minLength={8}
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-stone-300">
                        Telephone
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                          value={form.managerPhone}
                          onChange={(event) => setForm((current) => ({ ...current, managerPhone: event.target.value }))}
                          placeholder="+227 ..."
                        />
                      </label>
                      <label className="text-sm text-stone-300">
                        Email
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-line bg-ink/55 px-3 text-sm text-ivory outline-none focus:border-gold/45"
                          type="email"
                          value={form.managerEmail}
                          onChange={(event) => setForm((current) => ({ ...current, managerEmail: event.target.value }))}
                          placeholder="gerant@atelier.local"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">{success}</div> : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {editingId ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Annuler
                  </Button>
                ) : null}
                <Button className={editingId ? "w-full" : "w-full sm:col-span-2"} disabled={submitting || !canSubmitWorkshop}>
                  {submitting
                    ? "Enregistrement..."
                    : editingId
                      ? "Enregistrer les modifications"
                      : hasManagerDraft(form)
                        ? "Creer l'atelier et le gerant"
                        : "Creer l'atelier"}
                </Button>
              </div>
            </div>
          </form>

          <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="border-b border-line pb-4">
              <h2 className="text-lg font-semibold">Ateliers disponibles</h2>
              <p className="mt-1 text-sm text-stone-500">Changer d'atelier recharge les donnees de cet atelier uniquement.</p>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des ateliers...</div>
            ) : workshops.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun atelier trouve.</div>
            ) : (
              <div className="mt-5 grid gap-4">
                {workshops.map((workshop) => (
                  <article key={workshop.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ivory">{workshop.name}</h3>
                          {String(workshop.id) === activeWorkshopId ? <Badge tone="green">Actif</Badge> : null}
                          <Badge tone="neutral">{workshop.currency}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-stone-300">{workshop.phone || "Sans telephone"}</p>
                        <p className="mt-1 text-sm text-stone-500">{workshop.address || "Adresse non renseignee"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="secondary" onClick={() => editWorkshop(workshop)}>
                          Modifier
                        </Button>
                        <Button onClick={() => activateWorkshop(workshop)} disabled={String(workshop.id) === activeWorkshopId}>
                          <Check size={16} />
                          Activer
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="border-b border-line pb-4">
              <h2 className="text-lg font-semibold">Utilisateurs atelier</h2>
              <p className="mt-1 text-sm text-stone-500">Comptes lies aux ateliers accessibles.</p>
            </div>
            {usersLoading ? (
              <div className="py-14 text-center text-sm text-stone-500">Chargement des utilisateurs...</div>
            ) : users.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucun utilisateur trouve.</div>
            ) : (
              <div className="mt-5 grid gap-3">
                {users.map((user) => (
                  <article key={user.id} className="rounded-lg border border-line bg-ink/45 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-ivory">{user.full_name || user.username}</h3>
                        <p className="mt-1 text-xs text-stone-500">{user.username} - {user.email || "Sans email"}</p>
                      </div>
                      <Badge tone={user.profile?.role === "manager" ? "gold" : user.profile?.role === "tailor" ? "green" : "neutral"}>
                        {user.profile?.role ?? "role"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-stone-500">
                      {user.workshops.map((workshop) => workshop.name).join(", ") || "Aucun atelier lie"}
                    </p>
                  </article>
                ))}
              </div>
            )}
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
  value: number | string;
  tone: "neutral" | "gold" | "green" | "red";
}) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xl font-semibold">{value}</span>
        <Badge tone={tone}>Actif</Badge>
      </div>
    </div>
  );
}
