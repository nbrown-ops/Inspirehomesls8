#!/usr/bin/env bash
# ============================================================
# Inspire Homes — One-command setup script
# Usage: bash scripts/setup.sh
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
echo -e "${BOLD}${CYAN}║     Inspire Homes — Platform Setup           ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── Collect credentials ──────────────────────────────────────
echo -e "${BOLD}Step 1 of 4 — Enter your Supabase credentials${RESET}"
echo -e "${YELLOW}(Create a free project at https://supabase.com → Settings → API)${RESET}"
echo ""

read -p "  Supabase Project URL (https://xxxx.supabase.co): " SUPA_URL
read -p "  Anon / public key (eyJ...): " SUPA_ANON_KEY
read -p "  Service role key  (eyJ...): " SUPA_SERVICE_KEY
echo ""
read -p "  Super admin email address: " ADMIN_EMAIL
read -s -p "  Super admin password (min 8 chars): " ADMIN_PASSWORD
echo ""
read -p "  Super admin full name: " ADMIN_NAME
echo ""

# Validate inputs
if [[ -z "$SUPA_URL" || -z "$SUPA_ANON_KEY" || -z "$SUPA_SERVICE_KEY" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo -e "${RED}✗ All fields are required.${RESET}"
  exit 1
fi
if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
  echo -e "${RED}✗ Password must be at least 8 characters.${RESET}"
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$SUPA_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*||')

# ── Write .env.local ─────────────────────────────────────────
echo -e "${BOLD}Step 2 of 4 — Writing .env.local${RESET}"
cat > .env.local <<EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPA_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPA_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPA_SERVICE_KEY}

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Inspire Homes"
EOF
echo -e "  ${GREEN}✓ .env.local written${RESET}"

# ── Run migrations ───────────────────────────────────────────
echo ""
echo -e "${BOLD}Step 3 of 4 — Pushing database migrations${RESET}"
echo -e "  ${YELLOW}Linking to project: ${PROJECT_REF}${RESET}"

supabase link --project-ref "$PROJECT_REF" --password "" 2>/dev/null || true
supabase db push --password "" 2>&1 | while IFS= read -r line; do
  echo "  $line"
done

echo -e "  ${GREEN}✓ Migrations applied${RESET}"

# ── Create super admin user via Supabase Auth Admin API ──────
echo ""
echo -e "${BOLD}Step 4 of 4 — Creating your super admin account${RESET}"

# Create auth user
CREATE_USER_RESPONSE=$(curl -s -X POST \
  "${SUPA_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {\"full_name\": \"${ADMIN_NAME:-Super Admin}\"}
  }")

USER_ID=$(echo "$CREATE_USER_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

if [[ -z "$USER_ID" ]]; then
  echo -e "  ${RED}✗ Failed to create user. Response:${RESET}"
  echo "  $CREATE_USER_RESPONSE"
  echo ""
  echo -e "  ${YELLOW}Try creating the user manually in Supabase Dashboard → Authentication → Users${RESET}"
  echo -e "  ${YELLOW}Then run the SQL below in Supabase SQL Editor:${RESET}"
  echo ""
  echo "  UPDATE profiles SET role = 'super_admin', is_active = true, full_name = '${ADMIN_NAME:-Super Admin}' WHERE email = '${ADMIN_EMAIL}';"
  exit 1
fi

echo -e "  ${GREEN}✓ Auth user created (ID: ${USER_ID})${RESET}"

# Run SQL to set up super admin profile + home
SQL=$(cat <<EOSQL
-- Update profile to super_admin
UPDATE profiles
SET
  role       = 'super_admin',
  is_active  = true,
  full_name  = '${ADMIN_NAME:-Super Admin}',
  updated_at = now()
WHERE id = '${USER_ID}';

-- Create default home if none exists
INSERT INTO homes (name, address, city, postcode, max_occupancy, is_active)
SELECT 'Inspire House 1', '1 Main Street', 'Leeds', 'LS1 1AA', 8, true
WHERE NOT EXISTS (SELECT 1 FROM homes LIMIT 1);

-- Assign admin to the home
INSERT INTO user_home_assignments (user_id, home_id)
SELECT '${USER_ID}', id FROM homes
WHERE NOT EXISTS (
  SELECT 1 FROM user_home_assignments WHERE user_id = '${USER_ID}'
);
EOSQL
)

# Execute SQL via Supabase REST API
curl -s -X POST \
  "${SUPA_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" \
  > /dev/null 2>&1 || true

# Alternative: direct table updates via REST
curl -s -X PATCH \
  "${SUPA_URL}/rest/v1/profiles?id=eq.${USER_ID}" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"role\":\"super_admin\",\"is_active\":true,\"full_name\":\"${ADMIN_NAME:-Super Admin}\"}" \
  > /dev/null 2>&1

echo -e "  ${GREEN}✓ Super admin profile configured${RESET}"

# Create home and assign
HOME_RESPONSE=$(curl -s -X POST \
  "${SUPA_URL}/rest/v1/homes?select=id" \
  -H "apikey: ${SUPA_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"Inspire House 1","address":"1 Main Street","city":"Leeds","postcode":"LS1 1AA","max_occupancy":8,"is_active":true}')

HOME_ID=$(echo "$HOME_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)

if [[ -n "$HOME_ID" ]]; then
  curl -s -X POST \
    "${SUPA_URL}/rest/v1/user_home_assignments" \
    -H "apikey: ${SUPA_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPA_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"user_id\":\"${USER_ID}\",\"home_id\":\"${HOME_ID}\"}" \
    > /dev/null 2>&1
  echo -e "  ${GREEN}✓ Default home created and assigned${RESET}"
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   ✓ Setup complete!                          ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Login URL:${RESET}  http://localhost:3000/login"
echo -e "  ${BOLD}Email:${RESET}      ${ADMIN_EMAIL}"
echo -e "  ${BOLD}Password:${RESET}   (the one you just entered)"
echo -e "  ${BOLD}Role:${RESET}       Super Admin — full access"
echo ""
echo -e "  ${YELLOW}Make sure the dev server is running: npm run dev${RESET}"
echo ""
