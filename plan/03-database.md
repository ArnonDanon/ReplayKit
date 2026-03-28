# ReplayKit — Database

## Engine
PostgreSQL 16 (Docker image: `postgres:16-alpine`)

---

## Schema (`schema.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- Users (player login)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID         PRIMARY KEY,
    user_agent  TEXT,
    start_url   TEXT         NOT NULL,
    metadata    JSONB        NOT NULL DEFAULT '{}',
    started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    duration_ms BIGINT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'recording'
    -- status values: 'recording' | 'completed'
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions (status);

-- ─────────────────────────────────────────
-- Events (immutable append-only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_events (
    id         BIGSERIAL    PRIMARY KEY,
    session_id UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp  BIGINT       NOT NULL,   -- epoch ms from client
    type       VARCHAR(50)  NOT NULL,
    data       JSONB        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session_ts
    ON session_events (session_id, timestamp ASC);
```

> `schema.sql` is embedded in the API Docker image and applied idempotently via `CREATE TABLE IF NOT EXISTS` on every startup. No migration framework needed at this scale.

---

## Default admin user

Created at first startup by `DatabaseInitializer` in `Program.cs` if the `users` table is empty:

```
username: admin
password: value of REPLAYKIT_DEFAULT_ADMIN_PASSWORD env var (default: "admin123")
```

The password is BCrypt-hashed before storage. Change it after first login.

---

## Retention

The `SessionCleanupService` (background service) runs once every 24 hours:

```sql
DELETE FROM sessions
WHERE started_at < NOW() - (INTERVAL '1 day' * :retentionDays);
```

Cascading `ON DELETE CASCADE` on `session_events` means no orphan cleanup is needed.

| Config key | Default | Notes |
|------------|---------|-------|
| `REPLAYKIT_RETENTION_DAYS` | `7` | Days to keep sessions |

---

## Sizing estimate

Rough per-session storage for a 5-minute session on a moderately interactive page:

| Content | Estimate |
|---------|----------|
| Snapshot (JSONB) | ~50–200 KB |
| Mutations + events | ~20–100 KB |
| Console / network | ~5–20 KB |
| **Total per session** | **~75–320 KB** |

At 1000 sessions × 320 KB max = **~320 MB** of event data. Well within PostgreSQL's sweet spot.

---

## Connection

The API connects using a single `NpgsqlDataSource` (connection pool):

**Dev (Aspire):** connection string injected automatically via service discovery
**Prod (Docker):** set `ConnectionStrings__replaykit-db` environment variable:

```
Host=postgres;Database=replaykit;Username=postgres;Password=<secret>;Pooling=true;MinPoolSize=2;MaxPoolSize=20
```

---

## HA / Replication

See `09-ha-setup.md` for the full PostgreSQL streaming replication config.

Key settings on primary (`postgresql.conf`):
```
wal_level          = replica
max_wal_senders    = 5
wal_keep_size      = 256MB
hot_standby        = on
```
