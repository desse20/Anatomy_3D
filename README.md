# Anatomy 3D - Plateforme d'Apprentissage Anatomique

Une plateforme complète d'apprentissage de l'anatomie humaine en 3D, combinant un frontend interactif et une backend API robuste pour une expérience pédagogique immersive.

##  Vue d'ensemble

Anatomy 3D est une application web moderne qui permet aux étudiants et professionnels de la santé d'explorer le corps humain en trois dimensions. La plateforme offre :

- **Visualisation 3D interactive** des structures anatomiques
- **Système d'authentification** et suivi pédagogique
- **Interface intuitive** pour l'apprentissage
- **Base de données** riche en informations anatomiques

##  Architecture du Projet

```
Anatomy_3D/
├── backend/          # API Laravel (PHP 8.3+)
├── front_3D/         # Frontend React (TypeScript + Three.js)
└── README.md         # Ce fichier
```

## 🛠️ Stack Technique

### Backend
- **Laravel 13** : Framework PHP moderne
- **PHP 8.3+** : Langage backend
- **MySQL/MariaDB** : Base de données
- **Scramble** : Documentation API automatique

### Frontend
- **React 19** : Framework frontend
- **TypeScript** : Typage statique
- **Three.js** : Moteur 3D
- **Vite** : Build tool

## Prérequis

- PHP 8.3+
- Node.js 18+
- MySQL/MariaDB
- Composer
- npm ou yarn

##  Installation Rapide

### 1. Cloner le projet

```bash
git clone <repository-url>
cd Anatomy_3D
```

### 2. Backend

```bash
cd backend

# Installer les dépendances PHP
composer install

# Configurer l'environnement
cp .env.example .env
php artisan key:generate

# Configurer la base de données
# Modifier .env avec vos informations DB

# Lancer les migrations
php artisan migrate

# Démarrer le serveur
php artisan serve
```

### 3. Frontend

```bash
cd front_3D

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

## Accès à l'Application

- **Frontend** : `http://localhost:5173`
- **Backend API** : `http://localhost:8000`
- **Documentation API** : `http://localhost:8000/docs`

##  Structure Détaillée

### Backend (`/backend`)
- `app/` : Logique métier (Controllers, Models, etc.)
- `database/` : Migrations et seeders
- `routes/` : Routes API
- `config/` : Configuration de l'application
- `resources/` : Vues et assets

### Frontend (`/front_3D`)
- `src/components/` : Composants React
- `src/types/` : Types TypeScript
- `src/styles/` : Feuilles de style
- `public/` : Assets statiques

##  Scripts Disponibles

### Backend
```bash
php artisan serve          # Démarrer le serveur
php artisan migrate        # Migrer la base de données
php artisan tinker         # Console Laravel
```

### Frontend
```bash
npm run dev               # Serveur de développement
npm run build             # Build de production
npm run preview           # Prévisualiser le build
npm run lint              # Analyser le code
```

##  Fonctionnalités Principales

###  Frontend 3D
- Exploration interactive de modèles anatomiques
- Sélection par clic des structures
- Affichage des descriptions détaillées
- Navigation hiérarchique
- Interface responsive

###  Backend API
- Gestion des utilisateurs et authentification
- Stockage des données anatomiques
- Suivi pédagogique
- API RESTful documentée

##  Formats de Données

### Modèles 3D
- **Format** : GLTF/GLB
- **Localisation** : `front_3D/public/`

### Données Anatomiques
- **Format** : JSON
- **Structure** : Hiérarchique avec descriptions
- **Stockage** : Base de données + fichiers JSON

##  Dépannage

### Backend
1. **Erreur de connexion DB** : Vérifiez `.env`
2. **Clé d'application manquante** : `php artisan key:generate`
3. **Permissions** : `chmod -R 775 storage bootstrap/cache`

### Frontend
1. **Modèle 3D ne charge pas** : Vérifiez les chemins dans `public/`
2. **Problèmes de build** : `npm install` pour réinstaller les dépendances
3. **Performance** : Optimisez les modèles 3D si nécessaire

##  Contribuer

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

##  Documentation

- [Documentation Backend](./backend/README.md)
- [Documentation Frontend](./front_3D/README.md)
- [API Documentation](http://localhost:8000/docs) (une fois le backend démarré)

##  Liens Utiles

- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)

