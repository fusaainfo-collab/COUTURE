"use client";

import { ShieldCheck } from "lucide-react";

import { ModulePage } from "@/components/module-page";

export default function Page() {
  return (
    <ModulePage
      title="Administration"
      subtitle="Utilisateurs, roles, permissions, sessions, audit logs, sauvegardes et configuration SaaS future."
      icon={ShieldCheck}
      columns={["Module", "Acces", "Securite", "Statut"]}
      fallbackRows={[
        ["Gerant", "Total", "Token + session", "Actif"],
        ["Tailleurs", "Limite", "Android futur", "Prepare"],
        ["Clients", "Limite", "Android futur", "Prepare"]
      ]}
      highlights={[
        { label: "Roles", value: "3", tone: "gold" },
        { label: "Audit logs", value: "Actif", tone: "green" },
        { label: "Sauvegardes", value: "A configurer" },
        { label: "SaaS futur", value: "Pret" }
      ]}
    />
  );
}
