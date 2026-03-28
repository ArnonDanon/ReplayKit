# ReplayKit — High Availability Setup

## Overview

Two identical server nodes in separate locations. PostgreSQL streams WAL from primary to standby. F5 handles routing and failover detection.

```
                    ┌─────────────────────────────┐
                    │  F5 Virtual Server           │
                    │  - SSL termination           │
                    │  - Health monitor: GET /health│
                    │  - Active/Standby pool        │
                    └──────┬──────────┬────────────┘
                           │          │ (on failover)
                 ┌─────────▼──┐  ┌────▼──────────┐
                 │  Node A    │  │  Node B        │
                 │ (Primary)  │  │ (Standby)      │
                 │            │  │                │
                 │ API        │  │ API            │
                 │ (R/W)      │  │ (READ-ONLY)    │
                 │            │  │                │
                 │ PostgreSQL │  │ PostgreSQL     │
                 │ Primary    │──│ Standby        │
                 │            │  │ (streaming     │
                 │            │  │  replica)      │
                 └────────────┘  └────────────────┘
                       WAL ─────────────►
```

---

## Initial setup

### 1. PostgreSQL configuration on Node A (primary)

**`postgres/primary/postgresql.conf`** (key settings):
```
listen_addresses     = '*'
wal_level            = replica
max_wal_senders      = 5
wal_keep_size        = 256MB
hot_standby          = on
synchronous_commit   = off   # async replication — better perf, small data loss window on crash
```

**`postgres/primary/pg_hba.conf`** (add replication entry):
```
# TYPE  DATABASE    USER        ADDRESS             METHOD
host    replication replicator  <NODE_B_IP>/32      md5
host    all         replaykit   127.0.0.1/32        md5
host    all         replaykit   172.16.0.0/12       md5
```

### 2. Create replication user on primary

```sql
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'your_replication_password';
```

Run this once after first starting the primary:
```bash
docker exec -it replaykit-postgres-1 \
  psql -U replaykit -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'your_repl_pw';"
```

### 3. Start standby node (Node B)

On Node B, start `docker-compose.ha-standby.yml`. The entrypoint runs `pg_basebackup` on first boot to clone the primary, then starts PostgreSQL in standby mode.

The `-R` flag in `pg_basebackup` automatically creates:
- `standby.signal` — marks the instance as a standby
- `primary_conninfo` in `postgresql.auto.conf`

**`postgres/standby/postgresql.conf`** (key settings):
```
listen_addresses     = '*'
hot_standby          = on
hot_standby_feedback = on
```

### 4. Verify replication is running

On primary:
```bash
docker exec -it replaykit-postgres-1 \
  psql -U replaykit -c "SELECT * FROM pg_stat_replication;"
```

Expected output: one row showing the standby's connection and WAL position.

---

## F5 configuration (reference — handled externally)

- **Pool members:** Node A port 5000, Node B port 5000
- **Health monitor:** HTTP GET `/health`, expect `200`
- **Load balancing:** Active/Standby (priority groups) — Node A preferred
- **Session persistence:** Not required (stateless API; sessions stored in DB)

---

## Normal operation

| Node | PostgreSQL | API | Accepts writes |
|------|-----------|-----|----------------|
| A (primary) | Primary | R/W mode | Yes |
| B (standby) | Streaming replica | Read-only (`REPLAYKIT_READONLY=true`) | No |

F5 routes all traffic to Node A. Node B `/health` returns 200 but F5 keeps it in standby pool.

---

## Failover procedure (Node A goes down)

### Automatic (F5 detects health check failure):
F5 removes Node A from pool, routes traffic to Node B.

Node B API is read-only → tracker ingest returns HTTP 503. Player still works (reads are fine).

### Manual promotion (restore full write capability):

**Step 1: Promote standby PostgreSQL to primary**
```bash
docker exec -it replaykit-postgres-1 \  # on Node B
  psql -U replaykit -c "SELECT pg_promote();"
```
or touch the trigger file:
```bash
docker exec -it replaykit-postgres-1 touch /tmp/promote_trigger
```

**Step 2: Remove read-only mode from Node B API**

Edit `.env` on Node B: set `REPLAYKIT_READONLY=false` (or remove the variable), then:
```bash
docker compose -f docker-compose.ha-standby.yml up -d api
```

Node B is now the acting primary.

### After Node A recovers:

Node A should become the new standby. Steps:
1. Wipe Node A's PostgreSQL data volume
2. Re-run Node A as a standby pointing to Node B as new primary
3. Once synced, swap roles if desired

---

## Data loss window

With `synchronous_commit = off` (default in this config), there is a small window (typically < 1 second) of potential data loss if the primary crashes before WAL is shipped. This is acceptable for session replay data.

To eliminate data loss at the cost of write latency:
```
synchronous_standby_names = 'standby1'
synchronous_commit = on
```
Set `application_name=standby1` in the standby's `primary_conninfo`.

---

## Monitoring checklist

- [ ] F5 health monitor alerts when a pool member goes down
- [ ] Alert on replication lag > 10 seconds: `SELECT write_lag FROM pg_stat_replication`
- [ ] Alert on disk usage > 80% on primary (WAL accumulates if standby disconnects)
- [ ] Aspire dashboard (dev) / OTLP endpoint (prod) for API metrics
