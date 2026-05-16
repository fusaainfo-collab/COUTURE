# COUTURE SIR Mobile

Application mobile Expo pour iOS et Android, connectee a l'API Django de COUTURE SIR.

## API

La configuration par defaut vient de l'export mobile :

```txt
https://couture-api.onrender.com/api/v1
```

Les requetes authentifiees utilisent :

```txt
Authorization: Token <token_utilisateur>
X-Workshop-ID: <id_atelier>
```

## Fonctionnalites couvertes

- Connexion token.
- Session sauvegardee de facon securisee.
- Selection de l'atelier actif.
- Tableau de bord.
- Clients.
- Commandes.
- Mesures.
- Rendez-vous.
- Paiements.
- Modeles avec import photo.
- Messages avec reponses.
- Notifications.
- Tailleurs.
- Statistiques.
- Rapports.
- Ateliers.
- Utilisateurs.
- Configuration API mobile.

Les menus sont filtres selon le role utilisateur : admin, gerant, tailleur ou client.

## Lancer en local

```bash
npm install
npm run start
```

Android :

```bash
npm run android
```

iOS :

```bash
npm run ios
```

Pour compiler des builds stores, utiliser EAS Build apres connexion Expo :

```bash
npx eas build -p android
npx eas build -p ios
```

## APK genere

Les APK Android generes localement sont ici :

```txt
mobile-future/builds/couture-sir-release.apk
mobile-future/builds/couture-sir-debug.apk
```

Le fichier recommande pour test interne Android est :

```txt
mobile-future/builds/couture-sir-release.apk
```

Ce release APK local est signe avec la cle debug Android generee par Expo/Gradle. Pour publication Play Store, utiliser EAS en profil `production` afin de generer un `.aab` signe proprement.

## Builds cloud iOS et Android

Android APK cloud :

```bash
npm run build:android:cloud
```

iOS cloud :

```bash
npm run build:ios:cloud
```

Le build iOS local ne peut pas etre produit sur Windows. Il faut EAS Build ou un Mac avec Xcode.
