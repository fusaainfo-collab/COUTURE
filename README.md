# Atelier Couture ERP

Plateforme ERP moderne pour atelier de couture haut de gamme.

## Structure

- `backend/` - API Django REST versionnee pour la web app et les futures apps Android.
- `frontend/` - Web App Next.js en francais pour le gerant et l'administration.
- `docs/` - Documentation d'architecture et feuille de route.

## Demarrage rapide backend

```powershell
cd backend
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_demo
.venv\Scripts\python manage.py runserver
```

Identifiants demo apres `seed_demo` :

- admin : `admin` / `admin123`
- gerant : `gerant` / `atelier12345`

API :

- `http://127.0.0.1:8000/api/v1/`
- Swagger : `http://127.0.0.1:8000/api/docs/`

## Demarrage rapide frontend

Node.js doit etre installe sur la machine.

```powershell
cd frontend
npm install
npm run dev
```

Web App :

- `http://localhost:3000`
