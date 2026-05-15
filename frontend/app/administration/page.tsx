"use client";

import { ShieldCheck } from "lucide-react";

import { ModulePage } from "@/components/module-page";

export default function Page() {
  return (
    <ModulePage
      title="Administration"
      subtitle="Utilisateurs, roles, permissions, sessions, audit logs, sauvegardes et configuration SaaS future."
      icon={ShieldCheck}
      endpoint="/auth/users/"
      kind="users"
      columns={["Utilisateur", "Role", "Ateliers", "Statut"]}
      highlights={[]}
    />
  );
}
