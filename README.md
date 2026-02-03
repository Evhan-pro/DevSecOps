# DevSecOps API — Node.js & PostgreSQL

## 📌 Présentation du projet

Ce repository contient une **API Node.js sécurisée** avec PostgreSQL, pensée pour illustrer une **démarche DevSecOps complète**.

Le projet met en œuvre :

-   une authentification sécurisée (JWT, bcrypt),
-   des contrôles d’autorisation (RBAC),
-   des bonnes pratiques de sécurité applicative,
-   une orchestration des contrôles DevSecOps via `Taskfile`,
-   une couche d’observabilité (logs, métriques, traces),
-   et un **dashboard local** pour lancer et visualiser les tests.

L’objectif est de disposer d’un socle API **sécurisé, testable et automatisé**, utilisable en local comme en CI.

## 🗂️ Organisation du repository

-   `src/`
-   Code de l’API (routes, auth, accès base de données, sécurité, observabilité).
-   `tests/`
-   Tests unitaires et tests orientés sécurité.
-   `scripts/`
-   Scripts d’initialisation et helpers (SQL, setup).
-   `uploads/`
-   Dossier sandbox pour les fichiers téléchargeables.
-   `Taskfile.yml`
-   Point central DevSecOps : toutes les tâches (tests, scans, audits, phases).
-   `docker-compose.yml`
-   Stack locale (API + PostgreSQL).
-   `tools/test-dashboard/`
-   Dashboard web local pour lancer les tâches DevSecOps.

## ✅ Prérequis

-   Node.js **\>= 18**
-   Docker + Docker Compose
-   go-task (`task`) installé

Vérification rapide :

node -v
docker -v
docker compose version
task --version

## ⚙️ Mise en place du projet

### 1\. Configuration de l’environnement

cp .env.example .env

Adapter si besoin les variables (DB, JWT, observabilité).

### 2\. Lancer la stack Docker

docker compose up -d

Cela démarre :

-   PostgreSQL
-   l’API Node.js

### 3\. Installer les dépendances

npm install

### 4\. Lancer l’API en développement

npm run dev

Accès :

-   API : [http://localhost:3000](http://localhost:3000)
-   Base de données : localhost:5432

## 🧪 Dashboard de tests DevSecOps

### 🎯 À quoi sert le dashboard ?

Le dashboard est une **interface web locale** permettant de :

-   lancer les tâches définies dans le `Taskfile.yml`,
-   éviter de passer par la ligne de commande,
-   visualiser en temps réel les sorties des tests et scans,
-   avoir un aperçu rapide de l’état du projet (succès / erreurs).

Il agit comme une **surcouche UX** au pipeline DevSecOps local.

### 📁 Emplacement

tools/test-dashboard/

### ▶️ Lancer le dashboard

node tools/test-dashboard/server.js

### 🌐 Accès

Ouvrir dans le navigateur :

http://localhost:5050

### 🧠 Fonctionnement

Depuis l’interface, tu peux :

-   lancer les tests unitaires,
-   exécuter les scans de sécurité,
-   déclencher des phases complètes du pipeline,
-   consulter les logs et résultats en direct.

Le dashboard appelle directement les commandes `task` définies dans le projet.

## 🛡️ DAST (OWASP ZAP) — volontairement désactivé par défaut

Par défaut, la task `dast` **ne bloque pas** le pipeline local : elle affiche un message et sort en succès. C'est volontaire pour éviter de faire échouer tout le monde quand l'environnement (Docker, staging) n'est pas prêt.

✅ Pour l'activer :
```bash
export ENABLE_DAST=1
task dast


## 🛑 Arrêter le projet

docker compose down -v