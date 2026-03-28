#!/bin/bash
# ── ReplayKit Standby — init-standby.sh ──────────────────────────────────────
# Used as the container ENTRYPOINT.
#
# On first start (empty data dir): runs pg_basebackup to clone the primary.
# The -R flag automatically writes primary_conninfo and standby.signal.
# On subsequent starts: skips the clone and starts postgres directly.
#
# Required env vars (set in docker-compose / .env):
#   PRIMARY_HOST         — hostname or IP of the primary node
#   PGPASSWORD           — set to REPLICATION_PASSWORD (used by pg_basebackup)

set -euo pipefail

PGDATA="${PGDATA:-/var/lib/postgresql/data}"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[ReplayKit Standby] Data directory is empty — cloning primary at ${PRIMARY_HOST}..."

  pg_basebackup \
    --host="${PRIMARY_HOST}" \
    --port=5432 \
    --username=replicator \
    --pgdata="$PGDATA" \
    --wal-method=stream \
    --checkpoint=fast \
    --write-recovery-conf \
    -v

  # Overlay our custom postgresql.conf (hot_standby, hot_standby_feedback, etc.)
  cp /etc/postgresql/postgresql.conf "$PGDATA/postgresql.conf"

  echo "[ReplayKit Standby] Clone complete — starting in hot-standby mode."
else
  echo "[ReplayKit Standby] Data directory exists — skipping clone."
fi

exec docker-entrypoint.sh postgres -c "config_file=$PGDATA/postgresql.conf"
