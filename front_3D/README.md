# Front 3D - Anatomy Viewer

Une application web interactive de visualisation anatomique 3D construite avec React, TypeScript et Three.js.

## 🌟 Fonctionnalités

- **Visualisation 3D interactive** : Exploration de modèles anatomiques avec contrôles orbitaux
- **Sélection par clic** : Cliquez sur les parties du corps pour afficher leurs informations
- **Hiérarchie anatomique** : Navigation arborescente des structures anatomiques
- **Descriptions détaillées** : Affichage des informations anatomiques pour chaque élément
- **Interface responsive** : Design adaptatif pour différents écrans

##  Stack Technique

- **React 19** : Framework frontend moderne
- **TypeScript** : Typage statique pour la robustesse du code
- **Three.js** : Moteur 3D pour la visualisation
- **@react-three/fiber** : Renderer React pour Three.js
- **@react-three/drei** : Utilitaires et composants pour React Three Fiber
- **Vite** : Build tool rapide et moderne

## Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn

##  Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd Anatomy_3D/front_3D

# Installer les dépendances
npm install
```

##  Utilisation

### Développement

```bash
# Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

### Production

```bash
# Construire pour la production
npm run build

# Prévisualiser la version de production
npm run preview
```

##  Structure du Projet

```
src/
├── components/
│   └── AnatomyViewer.tsx    # Composant principal de visualisation 3D
├── types/
│   └── anatomy.ts           # Définitions de types TypeScript
├── styles/
│   └── anatomy-viewer.css   # Styles spécifiques au viewer
├── assets/                  # Ressources statiques
├── App.tsx                  # Composant racine
└── main.tsx                 # Point d'entrée
```

##  Composants Principaux

### AnatomyViewer
Le composant central qui gère :
- Le chargement des modèles 3D (GLTF/GLB)
- L'interaction utilisateur (clic, hover)
- L'affichage des informations anatomiques
- La navigation hiérarchique

##  Formats de Données

### Modèles 3D
- **Format** : GLTF/GLB
- **Chemin par défaut** : `Squelette_complet.glb`

### Données Anatomiques
- **Format** : JSON
- **Structure** : Hiérarchie avec informations détaillées
- **Chemin par défaut** : `z_anatomy_hierarchy_Copie.json`

### Interface AnatomyItem
```typescript
interface AnatomyItem {
  id: number;
  parent_id: number | null;
  name: string;
  three_js_name: string;
  type: 'mesh' | 'group' | 'bone';
  description: string;
}
```

##  Personnalisation

### Changer le modèle 3D
```tsx
<AnatomyViewer 
  modelPath="/chemin/vers/votre/modele.glb"
  jsonDataPath="/chemin/vers/votre/donnees.json"
/>
```

### Styles
Les styles sont personnalisables via :
- `src/styles/anatomy-viewer.css` pour le viewer 3D
- `src/App.css` pour les styles généraux

## 🔧 Scripts Disponibles

- `npm run dev` : Serveur de développement avec hot reload
- `npm run build` : Build de production
- `npm run preview` : Prévisualisation du build
- `npm run lint` : Analyse du code avec ESLint

##  Dépannage

### Problèmes courants
1. **Modèle 3D ne charge pas** : Vérifiez le chemin et le format du fichier
2. **Interactions ne fonctionnent pas** : Assurez-vous que le modèle a une structure hiérarchique correcte
3. **Performance** : Pour les modèles complexes, envisagez l'optimisation ou le LOD

### Développement
- Utilisez les outils de développement du navigateur pour debugger
- La console affiche les erreurs de chargement et d'interaction

## Contribuer

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour les détails.

## 🔗 Liens Utiles

- [Documentation Three.js](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [React Three Drei](https://drei.pmnd.rs/)
- [Vite Documentation](https://vitejs.dev/)
