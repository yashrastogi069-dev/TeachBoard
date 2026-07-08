#!/usr/bin/env bash
#
# One-shot Vercel deploy for Praxis.
# Pushes every var from .env.local to the Vercel project (production) and
# deploys. Run this from the repo root AFTER `vercel login`.
#
#   bash scripts/deploy-vercel.sh
#
# Secrets are read straight from .env.local and piped to Vercel; nothing is
# printed. Safe to re-run: existing env vars are replaced, not duplicated.

set -euo pipefail

ENV_FILE=".env.local"
TARGET="production"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Installing globally..."
  npm install -g vercel
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "You are not logged in to Vercel. Run 'vercel login' first, then re-run this script."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found in $(pwd). Run this from the repo root (the folder with package.json)."
  exit 1
fi

# Link the local folder to a Vercel project (creates it on first run).
echo "Linking project to Vercel..."
vercel link --yes

# Push each KEY=VALUE from .env.local into the project's production env.
echo "Syncing environment variables to Vercel ($TARGET)..."
while IFS= read -r line || [ -n "$line" ]; do
  # skip blanks and comments
  case "$line" in
    ""|\#*) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  # trim surrounding whitespace on the key
  key="$(printf '%s' "$key" | tr -d '[:space:]')"
  [ -z "$key" ] && continue
  # strip one layer of surrounding quotes from the value if present
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  # replace if it already exists, then add
  vercel env rm "$key" "$TARGET" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" "$TARGET" >/dev/null 2>&1 \
    && echo "  set $key" \
    || echo "  WARN could not set $key"
done < "$ENV_FILE"

# Deploy to production (builds on Vercel using the synced env).
echo "Deploying to production..."
vercel --prod --yes

echo ""
echo "Done. Two follow-ups in the Supabase dashboard (Authentication -> URL Configuration):"
echo "  1. Set Site URL to your new https://<project>.vercel.app domain."
echo "  2. Add that domain to Redirect URLs."
echo "Then sign in on the live site with your existing account."
