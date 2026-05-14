# API REST

Base locale :

```text
http://127.0.0.1:8000/api/v1/
```

Documentation Swagger :

```text
http://127.0.0.1:8000/api/docs/
```

## Authentification

Connexion :

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Requetes authentifiees :

```http
Authorization: Token <token>
```

## Endpoints principaux

- `GET /api/v1/dashboard/`
- `GET /api/v1/clients/`
- `GET /api/v1/mesures/`
- `GET /api/v1/modeles/`
- `GET /api/v1/commandes/`
- `GET /api/v1/evenements-commandes/`
- `GET /api/v1/paiements/`
- `GET /api/v1/depenses/`
- `GET /api/v1/tailleurs/`

Chaque ViewSet DRF supporte les operations REST standard :

- `list`
- `retrieve`
- `create`
- `update`
- `partial_update`
- `destroy` avec soft delete quand disponible.
