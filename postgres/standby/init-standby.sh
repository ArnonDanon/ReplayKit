#!/bin/bash
# ── ReplayKit Standby — init-standby.sh ──────────────────────────────────────
# Used as the container ENTRYPOINT.
#
# On first start (empty data dir): runs pg_basebackup to clone the primary,
# writes a standby.signal, then starts postgres.
# On subsequent starts: skips the clone and starts postgres directly.
#
# Required env vars:
#   PRIMARY_HOST        — hostname / IP of the primary node
#   REPLICATION_PASSWORD — password for the replicator role
#   POSTGRES_PASSWORD   — password for the replaykit application role
#   PGPASSWORD          — set to REPLICATION_PASSWORD in docker-compose

set -euo pipefail

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "[ReplayKit Standby] Data directory is empty — running pg_basebackup from ${PRIMARY_HOST}..."

  pg_basebackup \
    --host="${PRIMARY_HOST}" \
    --port=5432 \
    --username=replicator \
    --pgdata="$PGDATA" \
    --wal-method=stream \
    --checkpoint=fast \
    --no-password \
    -v

  echo "[ReplayKit Standby] Base backup complete."

  # Write connection info for streaming replication
  cat > "$PGDATA/postgresql.auto.conf" <<EOF
primary_conninfo = 'host=${PRIMARY_HOST} port=5432 user=replicator password=${REPLICATION_PASSWORD}'
EOF

  # Signal PostgreSQL to start as standby
  touch "$PGDATA/standby.signal"

  # Copy our custom config
  cp /etc/postgresql/postgresql.conf "$PGDATA/postgresql.conf"

  echo "[ReplayKit Standby] standby.signal written — starting in hot-standby mode."
else
  echo "[ReplayKit Standby] Data directory exists — skipping base backup."
fi

exec docker-entrypoint.sh postgres -c config_file="$PGDATA/postgresql.conf"
