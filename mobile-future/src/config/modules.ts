import { ResourceConfig, ScreenKey } from "../types";
import { formatDate, formatDateTime, formatMoney } from "../utils";

const priorityOptions = [
  { label: "Basse", value: "low" },
  { label: "Normale", value: "normal" },
  { label: "Haute", value: "high" },
  { label: "Urgente", value: "urgent" }
];

const orderStatusOptions = [
  { label: "En attente", value: "pending" },
  { label: "Decoupe", value: "cutting" },
  { label: "Couture", value: "sewing" },
  { label: "Finition", value: "finishing" },
  { label: "Pret", value: "ready" },
  { label: "Livre", value: "delivered" },
  { label: "Retard", value: "late" },
  { label: "Annule", value: "cancelled" }
];

const clientRelation = { endpoint: "/clients/", labelKey: "full_name", fallbackLabelKey: "phone" };
const tailorRelation = { endpoint: "/tailleurs/", labelKey: "full_name", fallbackLabelKey: "specialty" };
const orderRelation = { endpoint: "/commandes/", labelKey: "code", fallbackLabelKey: "client_name" };
const patternRelation = { endpoint: "/modeles/", labelKey: "name", fallbackLabelKey: "category" };
const measurementRelation = { endpoint: "/mesures/", labelKey: "label", fallbackLabelKey: "client_name" };

function text(item: Record<string, unknown>, key: string) {
  return String(item[key] || "-");
}

export const resourceConfigs: Record<Exclude<ScreenKey, "dashboard" | "reports" | "messages" | "api">, ResourceConfig> = {
  clients: {
    key: "clients",
    title: "Clients",
    subtitle: "Fiches clients, contacts et suivi atelier.",
    endpoint: "/clients/",
    roles: ["admin", "manager"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["full_name", "phone", "whatsapp", "email", "address"],
    titleField: "full_name",
    detailFields: [
      (item) => `Telephone: ${text(item, "phone")}`,
      (item) => `WhatsApp: ${text(item, "whatsapp")}`,
      (item) => `Commandes actives: ${text(item, "commandes_actives")}`
    ],
    badge: (item) => ({ label: `VIP ${item.vip_level || 0}`, tone: Number(item.vip_level || 0) >= 3 ? "gold" : "neutral" }),
    fields: [
      { key: "full_name", label: "Nom complet", type: "text", required: true },
      { key: "phone", label: "Telephone", type: "text", keyboard: "phone-pad", required: true },
      { key: "whatsapp", label: "WhatsApp", type: "text", keyboard: "phone-pad" },
      { key: "email", label: "Email", type: "text", keyboard: "email-address" },
      { key: "address", label: "Adresse", type: "textarea" },
      {
        key: "gender",
        label: "Genre",
        type: "select",
        defaultValue: "other",
        options: [
          { label: "Homme", value: "male" },
          { label: "Femme", value: "female" },
          { label: "Enfant", value: "child" },
          { label: "Autre", value: "other" }
        ]
      },
      { key: "vip_level", label: "Niveau VIP", type: "number", defaultValue: "0" },
      { key: "private_notes", label: "Notes", type: "textarea" },
      { key: "username", label: "Identifiant client", type: "text" },
      { key: "password", label: "Mot de passe client", type: "text", createOnly: true }
    ]
  },
  commandes: {
    key: "commandes",
    title: "Commandes",
    subtitle: "Creation et suivi des commandes, livraisons et soldes.",
    endpoint: "/commandes/",
    roles: ["admin", "manager", "tailor", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["code", "client_name", "pattern_name", "fabric", "color", "tailor_name", "status"],
    titleField: "code",
    detailFields: [
      (item) => `Client: ${text(item, "client_name")}`,
      (item) => `Livraison: ${formatDate(item.delivery_date)}`,
      (item) => `Total: ${formatMoney(item.total_price)} | Reste: ${formatMoney(item.balance_due)}`,
      (item) => `Tailleur: ${text(item, "tailor_name")}`
    ],
    badge: (item) => ({ label: text(item, "status"), tone: item.is_overdue ? "red" : item.status === "ready" ? "green" : "gold" }),
    fields: [
      { key: "client", label: "Client", type: "select", relation: clientRelation, required: true },
      { key: "measurement_profile", label: "Profil mesures", type: "select", relation: measurementRelation },
      { key: "pattern", label: "Modele", type: "select", relation: patternRelation },
      { key: "fabric", label: "Tissu", type: "text" },
      { key: "color", label: "Couleur", type: "text" },
      { key: "total_price", label: "Prix total", type: "number", required: true },
      { key: "advance_paid", label: "Avance", type: "number", defaultValue: "0" },
      { key: "delivery_date", label: "Date livraison", type: "date", placeholder: "2026-06-20", required: true },
      { key: "assigned_tailor", label: "Tailleur", type: "select", relation: tailorRelation },
      { key: "priority", label: "Priorite", type: "select", defaultValue: "normal", options: priorityOptions },
      { key: "status", label: "Statut", type: "select", defaultValue: "pending", options: orderStatusOptions },
      { key: "progress", label: "Progression", type: "number", defaultValue: "0" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  mesures: {
    key: "mesures",
    title: "Mesures",
    subtitle: "Profils de mesures clients et revisions.",
    endpoint: "/mesures/",
    roles: ["admin", "manager", "tailor", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["client_name", "label", "category", "notes"],
    titleField: (item) => `${text(item, "client_name")} - ${text(item, "label")}`,
    detailFields: [
      (item) => `Categorie: ${text(item, "category")}`,
      (item) => `Unite: ${text(item, "unit")}`,
      (item) => `Mis a jour: ${formatDateTime(item.updated_at)}`
    ],
    badge: (item) => ({ label: item.is_default ? "Defaut" : "Profil", tone: item.is_default ? "green" : "neutral" }),
    fields: [
      { key: "client", label: "Client", type: "select", relation: clientRelation, required: true },
      { key: "label", label: "Libelle", type: "text", defaultValue: "Profil principal" },
      {
        key: "category",
        label: "Categorie",
        type: "select",
        defaultValue: "man",
        options: [
          { label: "Homme", value: "man" },
          { label: "Femme", value: "woman" },
          { label: "Enfant", value: "child" }
        ]
      },
      { key: "unit", label: "Unite", type: "text", defaultValue: "cm" },
      { key: "measurements", label: "Mesures JSON ou lignes cle: valeur", type: "json", required: true },
      { key: "reference_photos", label: "Liens photos separes par virgules", type: "tags" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "is_default", label: "Profil par defaut", type: "boolean", defaultValue: true }
    ]
  },
  "rendez-vous": {
    key: "rendez-vous",
    title: "Rendez-vous",
    subtitle: "Planning, essayages, livraisons et consultations.",
    endpoint: "/rendez-vous/",
    roles: ["admin", "manager", "tailor", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["title", "client_name", "tailor_name", "appointment_type", "status", "notes"],
    titleField: (item) => text(item, "title") || text(item, "client_name"),
    detailFields: [
      (item) => `Client: ${text(item, "client_name")}`,
      (item) => `Debut: ${formatDateTime(item.start_at)}`,
      (item) => `Tailleur: ${text(item, "tailor_name")}`
    ],
    badge: (item) => ({ label: text(item, "status"), tone: item.has_conflict ? "red" : "blue" }),
    fields: [
      { key: "client", label: "Client", type: "select", relation: clientRelation, required: true },
      { key: "tailor", label: "Tailleur", type: "select", relation: tailorRelation },
      { key: "title", label: "Titre", type: "text" },
      {
        key: "appointment_type",
        label: "Type",
        type: "select",
        defaultValue: "consultation",
        options: [
          { label: "Essayage", value: "fitting" },
          { label: "Livraison", value: "delivery" },
          { label: "Consultation", value: "consultation" },
          { label: "Urgence", value: "urgent" }
        ]
      },
      { key: "priority", label: "Priorite", type: "select", defaultValue: "normal", options: priorityOptions.filter((item) => item.value !== "low") },
      {
        key: "status",
        label: "Statut",
        type: "select",
        defaultValue: "scheduled",
        options: [
          { label: "Programme", value: "scheduled" },
          { label: "Confirme", value: "confirmed" },
          { label: "Termine", value: "completed" },
          { label: "Annule", value: "cancelled" },
          { label: "Manque", value: "missed" }
        ]
      },
      { key: "start_at", label: "Debut ISO", type: "datetime", placeholder: "2026-06-20T10:00:00Z", required: true },
      { key: "end_at", label: "Fin ISO", type: "datetime", placeholder: "2026-06-20T11:00:00Z" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  paiements: {
    key: "paiements",
    title: "Paiements",
    subtitle: "Encaissements, soldes et references de paiement.",
    endpoint: "/paiements/",
    roles: ["admin", "manager", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["reference", "client_name", "order_code", "method", "status", "notes"],
    titleField: (item) => text(item, "reference") || "Paiement",
    detailFields: [
      (item) => `Client: ${text(item, "client_name")}`,
      (item) => `Commande: ${text(item, "order_code")}`,
      (item) => `Montant: ${formatMoney(item.amount)}`,
      (item) => `Date: ${formatDateTime(item.paid_at)}`
    ],
    badge: (item) => ({ label: text(item, "status"), tone: item.status === "paid" ? "green" : item.status === "pending" ? "gold" : "red" }),
    fields: [
      { key: "client", label: "Client", type: "select", relation: clientRelation, required: true },
      { key: "order", label: "Commande", type: "select", relation: orderRelation },
      { key: "amount", label: "Montant", type: "number", required: true },
      {
        key: "method",
        label: "Methode",
        type: "select",
        defaultValue: "cash",
        options: [
          { label: "Especes", value: "cash" },
          { label: "Mobile money", value: "mobile_money" },
          { label: "Carte", value: "card" },
          { label: "Virement", value: "transfer" },
          { label: "Autre", value: "other" }
        ]
      },
      {
        key: "status",
        label: "Statut",
        type: "select",
        defaultValue: "paid",
        options: [
          { label: "En attente", value: "pending" },
          { label: "Paye", value: "paid" },
          { label: "Annule", value: "cancelled" },
          { label: "Rembourse", value: "refunded" }
        ]
      },
      { key: "reference", label: "Reference", type: "text" },
      { key: "paid_at", label: "Date paiement ISO", type: "datetime" },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  modeles: {
    key: "modeles",
    title: "Modeles",
    subtitle: "Catalogue de modeles importes par l'atelier.",
    endpoint: "/modeles/",
    roles: ["admin", "manager", "tailor", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    multipart: true,
    searchable: ["name", "category", "description"],
    titleField: "name",
    detailFields: [
      (item) => `Categorie: ${text(item, "category")}`,
      (item) => `Tendance: ${text(item, "trend_score")}`,
      (item) => text(item, "description")
    ],
    badge: (item) => ({ label: item.is_favorite ? "Favori" : "Modele", tone: item.is_favorite ? "gold" : "neutral" }),
    fields: [
      { key: "name", label: "Nom du modele", type: "text", required: true },
      {
        key: "category",
        label: "Categorie",
        type: "select",
        defaultValue: "bazin",
        options: [
          { label: "Bazin", value: "bazin" },
          { label: "Costume", value: "costume" },
          { label: "Robe", value: "robe" },
          { label: "Kaftan", value: "kaftan" },
          { label: "Boubou", value: "boubou" },
          { label: "Uniforme", value: "uniforme" },
          { label: "Mariage", value: "mariage" },
          { label: "Luxe", value: "luxe" },
          { label: "Casual", value: "casual" },
          { label: "Africain moderne", value: "africain_moderne" }
        ]
      },
      { key: "image", label: "Photo", type: "image" },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "trend_score", label: "Score tendance", type: "number", defaultValue: "0" },
      { key: "is_favorite", label: "Favori", type: "boolean", defaultValue: false }
    ]
  },
  notifications: {
    key: "notifications",
    title: "Notifications",
    subtitle: "Alertes internes, paiements, rendez-vous et livraisons.",
    endpoint: "/notifications/",
    roles: ["admin", "manager", "tailor", "client"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["title", "message", "notification_type", "priority", "status"],
    titleField: "title",
    detailFields: [
      (item) => text(item, "message"),
      (item) => `Type: ${text(item, "notification_type")} | Canal: ${text(item, "channel")}`,
      (item) => `Date: ${formatDateTime(item.created_at)}`
    ],
    badge: (item) => ({ label: text(item, "status"), tone: item.status === "unread" ? "gold" : "green" }),
    actions: [
      {
        label: "Marquer lue",
        tone: "green",
        run: (api, item) => api.post<Record<string, unknown>>(`/notifications/${item.id}/marquer-lue/`, {})
      }
    ],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
      {
        key: "notification_type",
        label: "Type",
        type: "select",
        defaultValue: "manual",
        options: [
          { label: "Manuelle", value: "manual" },
          { label: "Rendez-vous", value: "appointment" },
          { label: "Paiement", value: "payment" },
          { label: "Livraison", value: "delivery" },
          { label: "Commande retard", value: "order_late" }
        ]
      },
      {
        key: "channel",
        label: "Canal",
        type: "select",
        defaultValue: "web",
        options: [
          { label: "Web", value: "web" },
          { label: "Android client", value: "android_client" },
          { label: "Android tailleur", value: "android_tailor" }
        ]
      },
      { key: "priority", label: "Priorite", type: "select", defaultValue: "normal", options: priorityOptions },
      {
        key: "status",
        label: "Statut",
        type: "select",
        defaultValue: "unread",
        options: [
          { label: "Non lue", value: "unread" },
          { label: "Lue", value: "read" },
          { label: "Archivee", value: "archived" }
        ]
      },
      { key: "target_url", label: "Lien cible", type: "text" }
    ]
  },
  tailleurs: {
    key: "tailleurs",
    title: "Tailleurs",
    subtitle: "Suivi des tailleurs, disponibilites et charge de travail.",
    endpoint: "/tailleurs/",
    roles: ["admin", "manager", "tailor"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["full_name", "phone", "specialty", "notes"],
    titleField: "full_name",
    detailFields: [
      (item) => `Specialite: ${text(item, "specialty")}`,
      (item) => `Commandes actives: ${text(item, "commandes_actives")}`,
      (item) => `Score: ${text(item, "quality_score")}/5`
    ],
    badge: (item) => ({ label: text(item, "status"), tone: item.status === "available" ? "green" : item.status === "busy" ? "gold" : "red" }),
    fields: [
      { key: "full_name", label: "Nom complet", type: "text", required: true },
      { key: "phone", label: "Telephone", type: "text", keyboard: "phone-pad" },
      { key: "specialty", label: "Specialite", type: "text" },
      { key: "skills", label: "Competences", type: "tags" },
      {
        key: "status",
        label: "Statut",
        type: "select",
        defaultValue: "available",
        options: [
          { label: "Disponible", value: "available" },
          { label: "Charge", value: "busy" },
          { label: "Absent", value: "offline" }
        ]
      },
      { key: "quality_score", label: "Score qualite", type: "number", defaultValue: "4.5" },
      { key: "average_delay_days", label: "Retard moyen jours", type: "number", defaultValue: "0" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "username", label: "Identifiant tailleur", type: "text" },
      { key: "password", label: "Mot de passe tailleur", type: "text", createOnly: true }
    ]
  },
  statistiques: {
    key: "statistiques",
    title: "Statistiques",
    subtitle: "Indicateurs internes de suivi atelier.",
    endpoint: "/statistiques/",
    roles: ["admin", "manager"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    searchable: ["label", "value", "evolution", "impact", "notes"],
    titleField: "label",
    detailFields: [(item) => `Valeur: ${text(item, "value")}`, (item) => `Evolution: ${text(item, "evolution")}`, (item) => text(item, "notes")],
    badge: (item) => ({ label: text(item, "impact"), tone: item.tone === "red" ? "red" : item.tone === "green" ? "green" : item.tone === "gold" ? "gold" : "neutral" }),
    fields: [
      { key: "label", label: "Libelle", type: "text", required: true },
      { key: "value", label: "Valeur", type: "text", required: true },
      { key: "evolution", label: "Evolution", type: "text" },
      {
        key: "impact",
        label: "Impact",
        type: "select",
        defaultValue: "medium",
        options: [
          { label: "Faible", value: "low" },
          { label: "Moyen", value: "medium" },
          { label: "Fort", value: "high" },
          { label: "Critique", value: "critical" }
        ]
      },
      {
        key: "tone",
        label: "Couleur",
        type: "select",
        defaultValue: "neutral",
        options: [
          { label: "Neutre", value: "neutral" },
          { label: "Important", value: "gold" },
          { label: "Positif", value: "green" },
          { label: "A surveiller", value: "red" }
        ]
      },
      { key: "notes", label: "Notes", type: "textarea" }
    ]
  },
  workshops: {
    key: "workshops",
    title: "Ateliers",
    subtitle: "Ateliers accessibles et contexte actif.",
    endpoint: "/workshops/",
    roles: ["admin", "manager"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    searchable: ["name", "phone", "address", "currency"],
    titleField: "name",
    detailFields: [(item) => `Telephone: ${text(item, "phone")}`, (item) => `Devise: ${text(item, "currency")}`, (item) => text(item, "address")],
    badge: (item) => ({ label: item.is_active === false ? "Inactif" : "Actif", tone: item.is_active === false ? "red" : "green" }),
    fields: [
      { key: "name", label: "Nom atelier", type: "text", required: true },
      { key: "phone", label: "Telephone", type: "text", keyboard: "phone-pad" },
      { key: "address", label: "Adresse", type: "textarea" },
      { key: "currency", label: "Devise", type: "text", defaultValue: "XOF" },
      { key: "is_active", label: "Actif", type: "boolean", defaultValue: true }
    ]
  },
  users: {
    key: "users",
    title: "Utilisateurs",
    subtitle: "Comptes, roles et acces ateliers.",
    endpoint: "/auth/users/",
    roles: ["admin", "manager"],
    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    searchable: ["username", "email", "first_name", "last_name", "full_name"],
    titleField: (item) => text(item, "full_name") || text(item, "username"),
    detailFields: [(item) => `Identifiant: ${text(item, "username")}`, (item) => `Email: ${text(item, "email")}`, (item) => `Role: ${text((item.profile as Record<string, unknown>) || {}, "role")}`],
    badge: (item) => ({ label: item.is_active === false ? "Inactif" : "Actif", tone: item.is_active === false ? "red" : "green" }),
    fields: [
      { key: "username", label: "Identifiant", type: "text", required: true },
      { key: "password", label: "Mot de passe", type: "text", createOnly: true },
      { key: "first_name", label: "Prenom", type: "text" },
      { key: "last_name", label: "Nom", type: "text" },
      { key: "email", label: "Email", type: "text", keyboard: "email-address" },
      {
        key: "role",
        label: "Role",
        type: "select",
        defaultValue: "manager",
        options: [
          { label: "Admin", value: "admin" },
          { label: "Gerant", value: "manager" },
          { label: "Tailleur", value: "tailor" },
          { label: "Client", value: "client" }
        ]
      },
      { key: "phone", label: "Telephone", type: "text", keyboard: "phone-pad" }
    ]
  }
};

export const menuItems: Array<{ key: ScreenKey; label: string; clientLabel?: string; roles: string[] }> = [
  { key: "dashboard", label: "Dashboard", clientLabel: "Mon suivi", roles: ["admin", "manager", "tailor", "client"] },
  { key: "commandes", label: "Commandes", clientLabel: "Mes commandes", roles: ["admin", "manager", "tailor", "client"] },
  { key: "clients", label: "Clients", roles: ["admin", "manager"] },
  { key: "mesures", label: "Mesures", clientLabel: "Mes mesures", roles: ["admin", "manager", "tailor", "client"] },
  { key: "rendez-vous", label: "Rendez-vous", clientLabel: "Mes rendez-vous", roles: ["admin", "manager", "tailor", "client"] },
  { key: "paiements", label: "Paiements", clientLabel: "Mes paiements", roles: ["admin", "manager", "client"] },
  { key: "modeles", label: "Galerie", clientLabel: "Modeles", roles: ["admin", "manager", "tailor", "client"] },
  { key: "messages", label: "Messages", roles: ["admin", "manager", "client"] },
  { key: "notifications", label: "Notifications", roles: ["admin", "manager", "tailor"] },
  { key: "tailleurs", label: "Tailleurs", roles: ["admin", "manager", "tailor"] },
  { key: "statistiques", label: "Statistiques", roles: ["admin", "manager"] },
  { key: "reports", label: "Rapports", roles: ["admin", "manager"] },
  { key: "workshops", label: "Ateliers", roles: ["admin", "manager"] },
  { key: "users", label: "Utilisateurs", roles: ["admin", "manager"] },
  { key: "api", label: "API", roles: ["admin"] }
];
