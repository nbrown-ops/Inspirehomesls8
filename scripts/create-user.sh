#!/usr/bin/env bash
# ============================================================
# Inspire Homes — Create User Script
# Usage: bash scripts/create-user.sh
# ============================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
RESET="\033[0m"


echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║      Inspire Homes — Create User             ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

ENV_FILE=".env.local"

# ── 1. Charger automatiquement les clés depuis .env.local ───────
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ Erreur: Le fichier ${ENV_FILE} est introuvable à la racine du projet.${RESET}"
  exit 1
fi

SUPA_URL=$(grep -v '^#' "$ENV_FILE" | grep 'NEXT_PUBLIC_SUPABASE_URL=' | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
SUPA_SERVICE_KEY=$(grep -v '^#' "$ENV_FILE" | grep 'SUPABASE_SERVICE_ROLE_KEY=' | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')

# Sécurité si les clés sont vides dans .env.local
if [[ -z "$SUPA_URL" || -z "$SUPA_SERVICE_KEY" ]]; then
  echo -e "${RED}✗ Erreur: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY est manquant dans ${ENV_FILE}.${RESET}"
  exit 1
fi

# Nettoyage du slash final sur l'URL si présent
SUPA_URL="${SUPA_URL%/}"

echo -e "${GREEN}✓ Clés Supabase chargées depuis ${ENV_FILE}${RESET}\n"

# ── 2. Collecter les infos du nouvel utilisateur ───────────────
echo -e "${BOLD}Entrez les détails du nouvel utilisateur :${RESET}"
read -p "  Email : " USER_EMAIL
read -s -p "  Mot de passe (min 8 chars) : " USER_PASSWORD
echo ""
read -p "  Nom complet : " USER_NAME

echo ""
echo -e "  Sélectionnez le rôle :"
echo -e "    1) super_admin"
echo -e "    2) admin"
echo -e "    3) user (par défaut)"
read -p "  Choix [1-3] : " ROLE_CHOICE

case $ROLE_CHOICE in
  1) USER_ROLE="super_admin" ;;
  2) USER_ROLE="admin" ;;
  *) USER_ROLE="user" ;;
esac

# Validation des champs
if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" ]]; then
  echo -e "\n${RED}✗ Erreur: L'email et le mot de passe sont obligatoires.${RESET}"
  exit 1
fi

if [[ ${#USER_PASSWORD} -lt 8 ]]; then
  echo -e "\n${RED}✗ Erreur: Le mot de passe doit faire au moins 8 caractères.${RESET}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Création de l'utilisateur ${USER_EMAIL} (${USER_ROLE})...${RESET}"

# ── 3. Création du compte dans Auth ─────────────────────────────
CREATE_USER_RESPONSE=$(curl -s -X POST \
  "${SUPA_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${USER_EMAIL}\",
    \"password\": \"${USER_PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {\"full_name\": \"${USER_NAME:-User}\"}
  }")

# Extraction de l'ID utilisateur
USER_ID=$(echo "$CREATE_USER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

if [[ -z "$USER_ID" ]]; then
  echo -e "  ${RED}✗ Échec de la création dans Supabase Auth.${RESET}"
  echo "  Détail de la réponse : $CREATE_USER_RESPONSE"
  exit 1
fi

echo -e "  ${GREEN}✓ Compte Auth créé avec succès (ID: ${USER_ID})${RESET}"

# ── 4. Mise à jour du rôle et nom dans profiles ─────────────────
PATCH_RESPONSE=$(curl -s -X PATCH \
  "${SUPA_URL}/rest/v1/profiles?id=eq.${USER_ID}" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"role\": \"${USER_ROLE}\",
    \"is_active\": true,
    \"full_name\": \"${USER_NAME:-User}\"
  }")

echo -e "  ${GREEN}✓ Profil 'profiles' configuré avec le rôle '${USER_ROLE}'${RESET}"

# ── Résumé ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   ✓ Utilisateur créé avec succès !          ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Email :${RESET}     ${USER_EMAIL}"
echo -e "  ${BOLD}Rôle :${RESET}      ${USER_ROLE}"
echo -e "  ${BOLD}User ID :${RESET}   ${USER_ID}"
echo ""
