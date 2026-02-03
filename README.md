# 🚨 API DevSecOps - Jour 1

> API volontairement vulnérable pour l'apprentissage DevSecOps

⚠️ **ATTENTION** : Cette application contient des vulnérabilités de sécurité **INTENTIONNELLES** à des fins pédagogiques.
**NE JAMAIS déployer en production !**

---

## ✅ Version sécurisée (rendu DevSecOps)

Cette branche/rendu corrige les vulnérabilités du J1, ajoute une authentification JWT sécurisée, des tests unitaires orientés sécurité, une pipeline DevSecOps via `Taskfile.yml`, et une stratégie d'observabilité.

### Observabilité

- Logs JSON structurés (Pino) avec `x-request-id`
- Metrics Prometheus sur `/metrics`
- **Bonus traces** : OpenTelemetry (HTTP/Express) + spans custom sur `login/register/download`

#### Traces OpenTelemetry (bonus)

Par défaut, les traces sont exportées en console.

Pour une UI :

```bash
task otel:up
```

Puis passe `OTEL_EXPORTER=otlp` dans `.env` et ouvre Jaeger : http://localhost:16686


## 🎯 Objectifs pédagogiques

1. Identifier les vulnérabilités courantes dans une API
2. Comprendre les attaques (SQL Injection, Path Traversal, etc.)
3. Apprendre à sécuriser le code
4. Configurer git-secrets pour prévenir les commits de secrets

## 📋 Prérequis

- Node.js >= 14
- npm ou yarn
- Docker & Docker Compose
- git

## 🚀 Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd demo-devsecops-api-j1

# 2. Lancer PostgreSQL avec Docker Compose
docker-compose up -d

# Attendre que la base de données soit prête (5-10 secondes)
# Vous pouvez vérifier avec :
docker-compose logs postgres

# 3. Installer les dépendances Node.js
npm install

# 4. Lancer le serveur en mode développement
npm run dev
```

Le serveur démarre sur : http://localhost:3000
La base de données PostgreSQL est accessible sur : localhost:5432

## 🧪 Tester l'API

### Méthode 1 : REST Client (VSCode - recommandé)

1. Installer l'extension **REST Client** dans VSCode (ID: `humao.rest-client`)
2. Ouvrir le fichier `api-tests.http`
3. Cliquer sur **"Send Request"** au-dessus de chaque requête

### Méthode 2 : Script curl (terminal)

```bash
# Rendre le script exécutable (une seule fois)
chmod +x curl-examples.sh

# Lancer le menu interactif
./curl-examples.sh

# Ou exécuter une fonction spécifique
./curl-examples.sh login_sqli
./curl-examples.sh file_traversal_package
./curl-examples.sh user_privilege_escalation
```

### Méthode 3 : curl manuel

Voir les exemples dans le fichier `curl-examples.sh` ou `api-tests.http`.

## 🛑 Arrêter les services

```bash
# Arrêter le serveur Node.js
Ctrl+C

# Arrêter et supprimer la base de données
docker-compose down -v
```

## 📚 Endpoints disponibles

### 1. Documentation
```
GET /
```
Retourne la liste des endpoints et des exercices.

### 2. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Exercice :** Analysez le code de `src/auth/login.js` et essayez de vous connecter en tant qu'admin sans connaître le mot de passe.

### 3. Files
```
GET /api/files?name=photo.jpg
```

**Exercice :** Analysez le code de `src/api/files.js` et essayez d'accéder à des fichiers en dehors du dossier `uploads/`.

### 4. Users (Challenge)
```
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "mypassword",
  "role": "user"
}
```

**Challenge :** Analysez le code de `src/api/users.js` et trouvez TOUTES les vulnérabilités.

## 🔍 Exercices pratiques

### Exercice 1 : Analyse de code

Lisez les fichiers suivants et identifiez les vulnérabilités :

1. `src/auth/login.js` - Endpoint de login
2. `src/config/database.js` - Configuration DB
3. `src/api/files.js` - Endpoint de téléchargement
4. `src/api/users.js` - Endpoint de création d'utilisateurs (CHALLENGE)

### Exercice 2 : Exploitation

Une fois les vulnérabilités identifiées, essayez de les exploiter avec curl ou Postman.

**Objectifs :**
- Contournez l'authentification sur `/api/auth/login`
- Accédez à des fichiers sensibles via `/api/files`
- Créez un utilisateur avec des privilèges élevés via `/api/users`

### Exercice 3 : Configuration de git-secrets

```bash
# 1. Installer git-secrets
brew install git-secrets  # macOS
# ou suivre les instructions : https://github.com/awslabs/git-secrets

# 2. Initialiser dans le repo
git secrets --install

# 3. Ajouter les patterns AWS
git secrets --register-aws

# 4. Ajouter des patterns personnalisés
git secrets --add 'sk_live_[a-zA-Z0-9]{24}'
git secrets --add 'ghp_[a-zA-Z0-9]{36}'
git secrets --add 'JWT_SECRET.*=.*(secret|password|123)'

# 5. Tester
echo "const API_KEY = 'AKIAIOSFODNN7EXAMPLE';" > test.js
git add test.js
git commit -m "test"  # Devrait être bloqué !
```

### Exercice 4 : Scanner l'historique
```bash
# Scanner tout l'historique pour détecter des secrets déjà commités
git secrets --scan-history
```

## 📖 Ressources

- [OWASP Top 10 - 2025](https://owasp.org/Top10/2025/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [git-secrets](https://github.com/awslabs/git-secrets)

## 🤝 Support

Pour toute question sur les exercices, contactez l'équipe pédagogique.

## ⚖️ Licence

MIT - À des fins éducatives uniquement
