#!/usr/bin/env bash
# Dump Render Postgres and restore into Supabase.
# Usage:
#   RENDER_DATABASE_URL='postgresql://...' \
#   SUPABASE_HOST='aws-0-ap-south-1.pooler.supabase.com' \
#   SUPABASE_USER='postgres.<ref>' \
#   SUPABASE_PASSWORD='...' \
#   ./scripts/migrate-to-supabase.sh
set -euo pipefail

: "${RENDER_DATABASE_URL:?Set RENDER_DATABASE_URL to the Render Postgres URL}"
: "${SUPABASE_HOST:?Set SUPABASE_HOST to the Session pooler host}"
: "${SUPABASE_USER:?Set SUPABASE_USER to postgres.<project-ref>}"
: "${SUPABASE_PASSWORD:?Set SUPABASE_PASSWORD}"
if [[ "$SUPABASE_HOST" == *"<"* ]]; then
  echo "SUPABASE_HOST still has a placeholder. Copy the real Session pooler host from:" >&2
  echo "  https://supabase.com/dashboard/project/bfrekneojaimvghyolql?showConnect=true" >&2
  echo "It looks like aws-0-ap-south-1.pooler.supabase.com (not aws-0-<region>)." >&2
  exit 1
fi
SUPABASE_DB="${SUPABASE_DB:-postgres}"
DUMP_FILE="${DUMP_FILE:-clearixam-render-$(date +%Y%m%d).dump}"

echo "Dumping Render database..."
pg_dump --no-owner --no-acl -Fc "$RENDER_DATABASE_URL" -f "$DUMP_FILE"

echo "Restoring to Supabase Session pooler ${SUPABASE_HOST}..."
PGPASSWORD="$SUPABASE_PASSWORD" pg_restore \
  --no-owner --no-acl \
  -h "$SUPABASE_HOST" \
  -p 5432 \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  "$DUMP_FILE"

echo "Done. Keep ${DUMP_FILE} in encrypted personal storage, not git."
