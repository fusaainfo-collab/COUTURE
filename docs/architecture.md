# Architecture

## Vision

Atelier Couture ERP est pense comme une plateforme multi-applications :

- Web App gerant et administration.
- Application Android tailleurs.
- Application Android clients.
- API REST commune.
- Base de donnees partagee.

## Backend

Stack actuelle :

- Django 5.
- Django REST Framework.
- Authentification simple par token.
- Documentation OpenAPI avec drf-spectacular.
- PostgreSQL pret via variables d'environnement, SQLite par defaut en developpement.

Modules :

- `accounts` : login, profil utilisateur, roles de base.
- `clients` : fiches clients riches.
- `measurements` : profils de mesures et revisions.
- `orders` : commandes, modeles, timeline.
- `payments` : paiements, depenses, caisse.
- `tailors` : profils tailleurs et performance.
- `dashboard` : KPI, alertes, tendances.
- `core` : soft delete, audit logs, bases communes.

## Frontend

Stack prevue :

- Next.js.
- React.
- Tailwind CSS.
- Framer Motion.
- Lucide icons.

Pages creees :

- Login.
- Dashboard.
- Clients.
- Commandes.
- Mesures.
- Rendez-vous.
- Calendrier.
- Tailleurs.
- Paiements.
- Statistiques.
- Galerie.
- Notifications.
- Parametres.
- Rapports.
- Administration.

## API mobile future

Les futures apps Android doivent consommer `/api/v1/` avec le meme token d'authentification au depart.
La separation par role existe dans les modeles et pourra evoluer vers RBAC complet.

Routes futures recommandees :

- `/api/v1/mobile/tailor/orders/`
- `/api/v1/mobile/tailor/progress/`
- `/api/v1/mobile/client/orders/`
- `/api/v1/mobile/client/appointments/`
- `/api/v1/mobile/client/payments/`

## Evolution SaaS

La prochaine etape structurante sera d'ajouter un modele `Workshop` puis de rattacher chaque client, commande,
tailleur, paiement et utilisateur a un atelier. Cela rendra la plateforme compatible multi-ateliers et abonnements.

