#!/bin/bash
# ── ReplayKit Primary — init-replication.sh ───────────────────────────────────
# Runs once on first container start (via docker-entrypoint-initdb.d).
# Creates the replicator role used by the standby for pg_basebackup /
# streaming replication.

set -euo pipefail

echo "[ReplayKit] Creating replicator role..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOSQL

echo "[ReplayKit] Replicator role created."
