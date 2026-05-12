# Anatomy 3D - Backend API

Application Laravel d'anatomie 3D avec système d'authentification et suivi pédagogique.

##  Démarrage rapide

### Prérequis
- PHP 8.2+
- MySQL/MariaDB
- Composer
- Node.js & npm (pour le frontend)

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd backend

# Installer les dépendances
composer install

# Configurer l'environnement
cp .env.example .env
php artisan key:generate

# Configurer la base de données
# Modifier .env avec vos informations DB

# Lancer les migrations
php artisan migrate

# Installer Scramble pour la documentation API
composer require dedoc/scramble

# Publier la configuration Scramble
php artisan vendor:publish --tag=scramble-config

# Démarrer le serveur
php artisan serve
```

### Configuration Scramble

Après l'installation, Scramble est automatiquement configuré avec :
- **Documentation accessible** : `http://localhost:8000/docs/api`
- **Export OpenAPI** : `http://localhost:8000/docs/api.json`
- **Détection automatique** des endpoints API
- **Validation** des Form Requests
- **Types de ressources** et relations

Les fichiers de configuration :
- `config/scramble.php` - Configuration principale
- `routes/api.php` - Routes de l'API
- `bootstrap/app.php` - Enregistrement des routes API

### Documentation API
Une documentation interactive est disponible grâce à Scramble :
- **URL** : `http://localhost:8000/docs/api`
- **Export** : `http://localhost:8000/docs/api.json`

##  Structure de l'API

### Authentification
- **POST** `/api/auth/login` - Connexion
- **POST** `/api/auth/register` - Inscription  
- **POST** `/api/auth/logout` - Déconnexion
- **GET** `/api/auth/me` - Profil utilisateur
- **POST** `/api/auth/refresh` - Rafraîchir le token

### Administration Utilisateurs
- **GET** `/api/users` - Lister les utilisateurs (paginé)
- **POST** `/api/users` - Créer un utilisateur
- **GET** `/api/users/{id}` - Voir un utilisateur
- **PUT** `/api/users/{id}` - Modifier un utilisateur
- **DELETE** `/api/users/{id}` - Supprimer un utilisateur

##  Architecture

### Modèles de données
- **User** - Utilisateurs avec rôles (admin, teacher, student)
- **AnatomicalObject** - Objets anatomiques hiérarchiques
- **Asset3d** - Modèles 3D associés aux administrateurs
- **ConsultationLog** - Suivi des consultations
- **UserMastery** - Suivi de maîtrise pédagogique
- **SharedView** - Vues partagées entre enseignants

### Form Requests (Validation)
```
app/Http/Requests/
├── Auth/
│   ├── LoginRequest.php
│   ├── RegisterRequest.php
│   └── LogoutRequest.php
├── User/
│   ├── StoreUserRequest.php
│   └── UpdateUserRequest.php
├── Asset3d/
│   ├── StoreAsset3dRequest.php
│   └── UpdateAsset3dRequest.php
├── AnatomicalObject/
│   ├── StoreAnatomicalObjectRequest.php
│   └── UpdateAnatomicalObjectRequest.php
└── SharedView/
    ├── StoreSharedViewRequest.php
    └── UpdateSharedViewRequest.php
```

### Resources (Transformation API)
```
app/Http/Resources/
├── AuthResource.php          # Authentification + tokens
├── UserResource.php          # Administration utilisateurs
├── UserCollection.php        # Pagination utilisateurs
├── Asset3dResource.php
├── Asset3dCollection.php
├── AnatomicalObjectResource.php
├── AnatomicalObjectCollection.php
├── ConsultationLogResource.php
├── UserMasteryResource.php
└── SharedViewResource.php
```

### Controllers
```
app/Http/Controllers/Api/
├── AuthController.php        # Login, register, logout
└── UserController.php        # CRUD admin utilisateurs
```

## Authentification

L'API utilise Laravel Sanctum pour l'authentification par tokens.

### Exemple de connexion
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

### Réponse
```json
{
  "data": {
    "id": "uuid",
    "firstname": "John",
    "lastname": "Doe",
    "email": "user@example.com",
    "role": "student",
    "created_at": "2024-01-01T00:00:00.000000Z"
  },
  "token": "sanctum_token_here"
}
```

### Utilisation du token
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer sanctum_token_here"
```

## Validation

Toutes les requêtes sont validées avec des Form Requests personnalisés :

- **Messages d'erreur en français**
- **Validation des types UUID**
- **Vérification des relations**
- **Rate limiting** pour la connexion

Exemple de validation échouée :
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["L'email est obligatoire."],
    "password": ["Le mot de passe doit contenir au moins 8 caractères."]
  }
}
```

##  Relations et Ressources

### UserResource (Administration)
- Inclut les counts de consultation_logs et masteries
- Relations chargées conditionnellement
- Pas de token d'authentification

### AuthResource (Authentification)  
- Mêmes données que UserResource
- + token d'authentification
- + abilities si présentes

### Collections paginées
Toutes les collections incluent :
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7
  },
  "links": {
    "first": "...",
    "last": "...",
    "prev": "...",
    "next": "..."
  }
}
```

##  Développement

### Créer un nouveau controller
```bash
php artisan make:controller Api/NomController --api
```

### Créer une nouvelle Form Request
```bash
php artisan make:request Nom/StoreNomRequest
```

### Créer une nouvelle Resource
```bash
php artisan make:resource NomResource
```

### Tester les migrations
```bash
php artisan migrate:fresh --seed
```

##  Notes importantes

- **UUID** : Les utilisateurs utilisent des UUID comme primary key
- **Hiérarchie** : Les objets anatomiques peuvent avoir des relations parent/enfant
- **Suivi pédagogique** : Système de maîtrise avec espacement répété
- **Partage** : Les enseignants peuvent partager des vues 3D personnalisées

##  Contribuer

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request


