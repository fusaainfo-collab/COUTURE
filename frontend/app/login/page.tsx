"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { getApiBaseUrl, getToken, setStoredUser, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionReason = params.get("session");
    if (sessionReason === "expired") {
      setError("Votre session a expire. Reconnectez-vous.");
    } else if (sessionReason === "required") {
      setError("Connectez-vous pour acceder a l'application.");
    }
    setReady(true);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error("Identifiants invalides.");
      const data = await response.json();
      setToken(data.token);
      setStoredUser(data.user);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof TypeError) {
        setError(`Serveur API indisponible sur ${getApiBaseUrl()}. Verifiez l'URL API et les autorisations CORS.`);
      } else {
        setError(err instanceof Error ? err.message : "Connexion impossible.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink text-sm text-stone-400">
        Verification de la session...
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-ink text-ivory lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[42vh] flex-col justify-between border-b border-line bg-[radial-gradient(circle_at_top_left,rgba(214,178,94,0.15),transparent_32%),linear-gradient(140deg,rgba(13,27,42,0.72),rgba(8,9,11,1))] p-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
            <Sparkles size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold">Atelier Couture</p>
            <p className="text-xs text-stone-500">Administration premium</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl py-12"
        >
          <p className="text-sm font-medium uppercase text-gold">ERP couture haut de gamme</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-ivory sm:text-5xl">
            Pilotez l'atelier avec precision, vitesse et elegance.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-stone-400">
            Clients, mesures, commandes, paiements et production sont reunis dans une seule console fluide.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          {["Commandes", "Mesures", "Finances"].map((item) => (
            <div key={item} className="rounded-lg border border-line bg-ivory/[0.055] p-3 text-stone-300">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          onSubmit={submit}
          className="w-full max-w-md rounded-lg border border-line bg-ivory/[0.055] p-6 shadow-premium"
        >
          <div>
            <p className="text-sm text-stone-500">Connexion securisee</p>
            <h2 className="mt-2 text-2xl font-semibold">Espace admin</h2>
            <p className="mt-2 text-sm text-stone-500">Interface web locale sur http://localhost:3001.</p>
          </div>

          <label className="mt-8 block text-sm text-stone-300">
            Utilisateur
            <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-line bg-ink/55 px-3">
              <UserRound size={18} className="text-stone-500" />
              <input
                className="w-full bg-transparent text-sm text-ivory outline-none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </span>
          </label>

          <label className="mt-4 block text-sm text-stone-300">
            Mot de passe
            <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-line bg-ink/55 px-3">
              <LockKeyhole size={18} className="text-stone-500" />
              <input
                className="w-full bg-transparent text-sm text-ivory outline-none"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </span>
          </label>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={loading}>
            {loading ? "Connexion..." : "Entrer"}
            <ArrowRight size={17} />
          </Button>

          <div className="mt-4 rounded-lg border border-line bg-ink/45 px-3 py-3 text-sm text-stone-400">
            Identifiants admin: <span className="text-ivory">admin</span> / <span className="text-ivory">admin123</span>
          </div>
        </motion.form>
      </section>
    </main>
  );
}
