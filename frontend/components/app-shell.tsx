"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LucideIcon,
  LogOut,
  Menu,
  MessageCircle,
  Ruler,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCog,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  apiFetch,
  ApiList,
  clearSession,
  getStoredUser,
  getToken,
  getUserRole,
  getWorkshopId,
  isAdminUser,
  setWorkshopId
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation: Array<{
  href: Route;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  clientLabel?: string;
  hideForClient?: boolean;
}> = [
  { href: "/dashboard", label: "Dashboard", clientLabel: "Mon suivi", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users, hideForClient: true },
  { href: "/commandes", label: "Commandes", clientLabel: "Mes commandes", icon: ClipboardList },
  { href: "/mesures", label: "Mesures", clientLabel: "Mes mesures", icon: Ruler },
  { href: "/rendez-vous", label: "Rendez-vous", clientLabel: "Mes rendez-vous", icon: CalendarDays },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays, hideForClient: true },
  { href: "/tailleurs", label: "Tailleurs", icon: UserRoundCog, hideForClient: true },
  { href: "/paiements", label: "Paiements", clientLabel: "Mes paiements", icon: CreditCard },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3, hideForClient: true },
  { href: "/galerie", label: "Galerie", clientLabel: "Modeles", icon: GalleryHorizontalEnd },
  { href: "/notifications", label: "Notifications", icon: Bell, hideForClient: true },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/rapports", label: "Rapports", icon: WalletCards, hideForClient: true },
  { href: "/administration", label: "Administration", icon: ShieldCheck, hideForClient: true },
  { href: "/parametres", label: "Parametres", icon: Settings, adminOnly: true }
];

const clientBlockedRoutes = new Set([
  "/clients",
  "/calendrier",
  "/tailleurs",
  "/statistiques",
  "/notifications",
  "/rapports",
  "/administration",
  "/parametres"
]);

type Workshop = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState("Gerant");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("manager");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [activeWorkshopId, setActiveWorkshopId] = useState("");
  const activeWorkshop = workshops.find((workshop) => String(workshop.id) === activeWorkshopId);
  const isClient = userRole === "client";
  const visibleNavigation = navigation.filter(
    (item) => (!item.adminOnly || isAdmin) && !(isClient && item.hideForClient)
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?session=required");
      return;
    }

    const currentUser = getStoredUser();
    if (currentUser) {
      const role = getUserRole(currentUser);
      setUser(currentUser.full_name ?? currentUser.username ?? "Gerant");
      setIsAdmin(isAdminUser(currentUser));
      setUserRole(role);

      if (role === "client" && clientBlockedRoutes.has(pathname)) {
        router.replace("/dashboard");
        return;
      }
    }

    apiFetch<ApiList<Workshop>>("/workshops/")
      .then((payload) => {
        setWorkshops(payload.results);
        const storedWorkshopId = getWorkshopId();
        const selectedWorkshop =
          payload.results.find((workshop) => String(workshop.id) === storedWorkshopId) ?? payload.results[0];

        if (selectedWorkshop) {
          setWorkshopId(selectedWorkshop.id);
          setActiveWorkshopId(String(selectedWorkshop.id));
        }
      })
      .catch(() => {
        setWorkshops([]);
      });
  }, [pathname, router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  function changeWorkshop(nextWorkshopId: string) {
    setWorkshopId(nextWorkshopId);
    setActiveWorkshopId(nextWorkshopId);
    window.location.reload();
  }

  return (
    <div className="min-h-screen text-ivory">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-ink/95 px-4 py-4 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
              <Sparkles size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ivory">{activeWorkshop?.name ?? "Atelier Couture"}</span>
              <span className="block text-xs text-stone-500">ERP premium</span>
            </span>
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-ivory/8 lg:hidden"
            onClick={() => setOpen(false)}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="premium-scrollbar mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition",
                  active
                    ? "bg-ivory/12 text-ivory"
                    : "text-stone-400 hover:bg-ivory/8 hover:text-ivory"
                )}
              >
                <Icon size={18} />
                <span>{isClient && item.clientLabel ? item.clientLabel : item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-lg border border-line bg-ivory/[0.055] p-3">
          <div className="text-sm font-medium text-ivory">{user}</div>
          <div className="mt-1 text-xs text-stone-500">{sessionLabel(userRole, isAdmin)}</div>
          <Button variant="ghost" className="mt-3 h-9 w-full justify-start px-2" onClick={logout}>
            <LogOut size={16} />
            Deconnexion
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-line bg-ink/72 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ivory/6 text-stone-300 lg:hidden"
              onClick={() => setOpen(true)}
              title="Menu"
            >
              <Menu size={18} />
            </button>
            <div className="relative hidden min-w-0 flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
              <input
                className="h-10 w-full max-w-xl rounded-lg border border-line bg-ivory/[0.055] pl-10 pr-3 text-sm text-ivory outline-none transition placeholder:text-stone-600 focus:border-gold/45"
                placeholder={isClient ? "Rechercher mes commandes, rendez-vous, messages..." : "Rechercher client, commande, mesure, paiement..."}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {workshops.length ? (
                <select
                  className="hidden h-10 max-w-52 rounded-lg border border-line bg-ivory/[0.055] px-3 text-sm text-ivory outline-none focus:border-gold/45 md:block"
                  value={activeWorkshopId}
                  onChange={(event) => changeWorkshop(event.target.value)}
                  title="Atelier actif"
                >
                  {workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {!isClient ? (
                <>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ivory/[0.055] text-stone-300 hover:text-gold"
                    title="Notifications"
                  >
                    <Bell size={18} />
                  </button>
                  <Button
                    className="hidden sm:inline-flex"
                    onClick={() => router.push("/commandes?new=1#nouvelle-commande")}
                  >
                    Nouvelle commande
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function sessionLabel(role: string, isAdmin: boolean) {
  if (isAdmin) return "Session admin";
  if (role === "client") return "Espace client";
  if (role === "tailor") return "Espace tailleur";
  return "Session atelier";
}
