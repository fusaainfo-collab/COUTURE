export const dashboardFallback = {
  stats: {
    commandes_en_cours: 18,
    commandes_urgentes: 5,
    commandes_retard: 2,
    revenus_jour: 185000,
    revenus_mois: 2450000,
    depenses_mois: 620000,
    benefice_mois: 1830000,
    clients_actifs: 124,
    paiements_incomplets: 9
  },
  alertes: {
    urgentes: [
      { id: 1, code: "CMD-20260512-A91C2F", client__full_name: "Zeinabou Salif", delivery_date: "2026-05-13", status: "couture" },
      { id: 2, code: "CMD-20260512-B77F4A", client__full_name: "Mariam Abdou", delivery_date: "2026-05-14", status: "finition" }
    ],
    retards: [
      { id: 3, code: "CMD-20260508-D102AA", client__full_name: "Oumarou Ali", delivery_date: "2026-05-10", status: "retard" }
    ],
    vip: [
      { id: 1, full_name: "Zeinabou Salif", phone: "+227 98 77 88 99", vip_level: 5 },
      { id: 2, full_name: "Mariam Abdou", phone: "+227 91 11 22 33", vip_level: 4 }
    ]
  },
  tailleurs: [
    { id: 1, full_name: "Fatou Ibrahim", specialty: "Robes et mariage", quality_score: 4.9, active_orders: 7, completed_orders: 42 },
    { id: 2, full_name: "Moussa Garba", specialty: "Bazin et boubou luxe", quality_score: 4.8, active_orders: 5, completed_orders: 39 },
    { id: 3, full_name: "Issoufou Sani", specialty: "Costumes et uniformes", quality_score: 4.6, active_orders: 4, completed_orders: 31 }
  ],
  tendances_modeles: [
    { id: 1, name: "Boubou royal brodé", category: "boubou", trend_score: 96, is_favorite: true },
    { id: 2, name: "Robe sirène dorée", category: "robe", trend_score: 91, is_favorite: true },
    { id: 3, name: "Kaftan ivoire réception", category: "kaftan", trend_score: 88, is_favorite: false }
  ],
  activite_recente: [
    { title: "Statut mis à jour", description: "Découpe vers couture", status: "couture", created_at: "2026-05-12T09:30:00Z", order__code: "CMD-20260512-A91C2F" },
    { title: "Paiement reçu", description: "Avance encaissée", status: "payé", created_at: "2026-05-12T08:10:00Z", order__code: "CMD-20260512-B77F4A" }
  ]
};

export const moduleRows = {
  clients: [
    ["Mariam Abdou", "+227 91 11 22 33", "VIP 4", "2 commandes"],
    ["Zeinabou Salif", "+227 98 77 88 99", "VIP 5", "1 commande urgente"],
    ["Oumarou Ali", "+227 96 44 55 66", "VIP 3", "Costume bleu nuit"]
  ],
  commandes: [
    ["CMD-20260512-A91C2F", "Mariam Abdou", "Couture", "14 mai 2026"],
    ["CMD-20260512-B77F4A", "Oumarou Ali", "Découpe", "19 mai 2026"],
    ["CMD-20260508-D102AA", "Zeinabou Salif", "Retard", "10 mai 2026"]
  ],
  mesures: [
    ["Mariam Abdou", "Femme", "Profil principal", "Mis à jour aujourd'hui"],
    ["Oumarou Ali", "Homme", "Costume bureau", "Stable"],
    ["Zeinabou Salif", "Femme", "Mariage", "Comparaison disponible"]
  ],
  tailleurs: [
    ["Fatou Ibrahim", "Robes et mariage", "4.9/5", "7 commandes"],
    ["Moussa Garba", "Bazin et boubou luxe", "4.8/5", "5 commandes"],
    ["Issoufou Sani", "Costumes et uniformes", "4.6/5", "4 commandes"]
  ],
  paiements: [
    ["REC-CMD-20260512-A91C2F", "Mariam Abdou", "50 000 XOF", "Payé"],
    ["REC-CMD-20260512-B77F4A", "Oumarou Ali", "100 000 XOF", "Payé"],
    ["Dette client", "Zeinabou Salif", "150 000 XOF", "Reste"]
  ],
  galerie: [
    ["Boubou royal brodé", "Boubou", "96 tendance", "Favori"],
    ["Robe sirène dorée", "Robe", "91 tendance", "Favori"],
    ["Costume bleu nuit", "Costume", "82 tendance", "Catalogue"]
  ]
};

