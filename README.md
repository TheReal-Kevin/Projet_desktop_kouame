# Application de Gestion des presences des etudiants

Une application desktop moderne pour la gestion de la présence des etudiants, développée avec Electron.js.

## 🚀 Technologies Utilisées

### Front-end
- **Electron.js** : Framework pour applications desktop
- **HTML/CSS/JavaScript** natif
- **Architecture MPA** (Multi-Page Application)

### Back-end
- **Node.js** : Runtime JavaScript
- **SQLite** : Base de données
- **Bcrypt** : Gestion du chiffrement

```

## 🔒 Sécurité

### Authentification
- Système de login avec sessions
- Séparation des rôles (admin/prof/élève/parent)
- Hachage des mots de passe avec Bcrypt

### Architecture Public/Privé
- Pages de login publiques
- Routes protégées par rôle
- Validation des permissions côté main process

### Sécurité des Mots de Passe
- Hachage avec Bcrypt


### Sécurité Base de Données
- SQLite avec permissions restreintes


## 🚀 Installation et Déploiement

### Prérequis
- Node.js (v16+)
- npm ou yarn

### Installation
```bash
# Cloner le repository
git clone [URL_DU_REPO]

# Installer les dépendances
npm install

# Lancer en mode développement
npm start

# Créer un build
npm run build
```

## 👥 Méthode de Travail
- Méthodologie Agile/SCRUM


## 🛠️ Outils Utilisés
- **IDE** : VS Code
- **Versionning** : Git
- **Base de données** : SQLite
- **Build** : electron-builder
- **Sécurité** : bcrypt

## ⏱️ Temps de Développement

| Tâche | Jours |
|-------|--------|
| Setup initial | 2 |
| Base de données | 3 |
| Auth system | 4 |
| Interface admin | 5 |
| Interface prof | 5 |
| Interface élève | 4 |
| Interface parent | 4 |
| Tests et debug | 3 |
| **Total** | **30** |

## 📋 Fonctionnalités
- Authentification multi-rôles
- Gestion des emplois du temps
- Gestion des notes
- Gestion des absences
- Statistiques
- Profils utilisateurs
- Justifications d'absences
- Dashboard administratif

## 📊 Structure de la Base de Données
- Users (id, role, password_hash, ...)
- Classes (id, name, ...)
- Grades (id, student_id, subject_id, ...)
- Absences (id, student_id, date, ...)
- Timetables (id, class_id, ...)
- etc.

## 🗺️ Plan des Écrans
```
├── Login
├── Admin
│   ├── Dashboard
│   ├── Statistics
│   └── Users
├── Teacher
│   ├── Timetable
│   ├── Grades
│   └── Absences
├── Student
│   ├── Grades
│   ├── Absences
│   └── Timetable
└── Parent
    ├── Grades
    ├── Absences
    └── Profile
```

## 🎨 Charte Graphique

### Couleurs Principales
- Bleu principal : `#3498db`
- Bleu foncé : `#2980b9`
- Bleu très foncé : `#34495e`
- Blanc : `#ffffff`
- Gris clair : `#f4f6f9`

### Accents et États
- Vert (succès) : `#34a853`
- Rouge (erreur) : `#ea4335`
- Orange (avertissement) : `#fbbc05`

### Texte
- Principal : `#2c3e50`
- Secondaire : `#666666`

## 📝 License
ISC

## 👤 Auteur
Kevin 