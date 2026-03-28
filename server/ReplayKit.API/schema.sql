-- ReplayKit database schema
-- Idempotent: safe to run on every startup (CREATE ... IF NOT EXISTS everywhere)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Users  (player login)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Sessions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID        PRIMARY KEY,
    user_agent  TEXT,
    start_url   TEXT        NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    duration_ms BIGINT,
    status      VARCHAR(20) NOT NULL DEFAULT 'recording'
    -- status: 'recording' | 'completed'
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions (status);

-- ─────────────────────────────────────────────────────────────
-- Session events  (append-only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_events (
    id         BIGSERIAL    PRIMARY KEY,
    session_id UUID         NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    timestamp  BIGINT       NOT NULL,  -- epoch ms from client clock
    type       VARCHAR(50)  NOT NULL,
    data       JSONB        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session_ts
    ON session_events (session_id, timestamp ASC);
