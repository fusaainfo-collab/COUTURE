# Applications mobiles futures

Ce dossier reserve la place des futures applications Android.

## App tailleurs

Objectif :

- Voir les commandes assignees.
- Mettre a jour la progression.
- Consulter les mesures.
- Recevoir les notifications.
- Envoyer des photos du travail.

## App clients

Objectif :

- Suivre les commandes.
- Voir l'historique.
- Prendre rendez-vous.
- Recevoir les notifications.
- Consulter paiements et galerie.

## Recommandation technique

React Native ou Kotlin natif peuvent consommer la meme API `/api/v1/`.
Pour la V1 mobile, garder l'authentification token puis migrer vers JWT/refresh tokens quand les apps seront publiees.

