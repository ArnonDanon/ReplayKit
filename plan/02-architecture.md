# ReplayKit — Architecture

## Component overview

```
┌─────────────────────────────────────────────┐
│  Next.js Application (target app)            │
│                                              │
│  <ReplayKitProvider                          │
│    serverUrl="https://replay.internal"       │
│    apiKey="..."  >                           │
│    {children}                                │
│  </ReplayKitProvider>                        │
│                                              │
│  tracker captures:                           │
│  • Full DOM snapshot (on mount)              │
│  • DOM mutations (MutationObserver)          │
│  • Mouse/click/scroll events                 │
│  • console.log/warn/error                    │
│  • fetch + XHR (url, method, status, ms)     │
│                                              │
│  → batched POST every 2s                     │
└──────────────────┬──────────────────────────┘
                   │  X-Api-Key header
                   ▼
┌─────────────────────────────────────────────┐
│  ReplayKit.API  (.NET 10 / ASP.NET Core)     │
│                                              │
│  Minimal API endpoints:                      │
│  POST /api/sessions          (tracker)       │
│  POST /api/sessions/:id/events (tracker)     │
│  POST /api/sessions/:id/end  (tracker)       │
│  GET  /api/sessions          (player, JWT)   │
│  GET  /api/sessions/:id      (player, JWT)   │
│  GET  /api/sessions/:id/events (player, JWT) │
│  DELETE /api/sessions/:id    (player, JWT)   │
│  POST /api/auth/login                        │
│                                              │
│  Background: SessionCleanupService           │
│  (deletes sessions older than RETENTION_DAYS)│
│                                              │
│  Static files → serves Player SPA (wwwroot) │
└──────────────┬──────────────────────────────┘
               │  Npgsql / Dapper
               ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL 16                               │
│                                              │
│  tables: users, sessions, session_events     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Player SPA  (React, served from /wwwroot)   │
│                                              │
│  Login → Session List → Session Detail       │
│                                              │
│  Player component:                           │
│  • iframe reconstructs recorded DOM          │
│  • timeline scrubber                         │
│  • console panel                             │
│  • network panel                             │
│  • virtual mouse cursor overlay              │
└─────────────────────────────────────────────┘
```

---

## Authentication model

| Caller | Method | Scope |
|--------|--------|-------|
| Tracker (Next.js app) | `X-Api-Key` header | Write-only: create session, post events |
| Player (browser) | JWT Bearer token | Read + delete sessions; no ingest |

- JWT tokens expire after 8 hours
- `TrackerApiKey` is a shared secret set via environment variable
- Designed to later swap JWT auth for LDAP/AD by replacing `AuthService` only

---

## Recording model

### Session lifecycle
```
RECORDING → (tracker calls /end) → COMPLETED
```
Sessions stuck in `RECORDING` beyond 1 hour are treated as abandoned by the cleanup job.

### Event types

| Type | Trigger | Data shape |
|------|---------|------------|
| `snapshot` | session start | `{ root: SerializedNode, width, height }` |
| `mutation` | MutationObserver callback | `{ mutations: MutationRecord[] }` |
| `mousemove` | pointermove (throttled 50ms) | `{ x, y }` |
| `click` | click | `{ x, y, targetId }` |
| `scroll` | scroll (throttled 100ms) | `{ x, y, targetId }` |
| `input` | input/change (value masked for password fields) | `{ targetId, value }` |
| `console` | console.log/warn/error/info intercept | `{ level, args: string[] }` |
| `network` | fetch + XHR intercept | `{ method, url, status, durationMs, startedAt }` |
| `session_end` | beforeunload / component unmount | `{ durationMs }` |

### Node ID system
- Every DOM node gets an integer ID stored in a `WeakMap<Node, number>`
- IDs are embedded as `data-rk-id` attributes when serializing elements
- Mutations reference nodes by their ID so the player can look them up via `querySelector('[data-rk-id="X"]')`
- Text nodes are identified by parent ID + child index

### Tracker batching
- Events are buffered in memory
- Flushed to server every **2 seconds** via `POST /api/sessions/:id/events`
- Also flushed immediately on `beforeunload`
- Batch size capped at 100 events to avoid large payloads

---

## Replay model

1. Player fetches all events for a session ordered by `timestamp ASC`
2. First event is always `snapshot` — reconstructed into an `<iframe srcdoc>`
3. Player builds a `Map<nodeId, DOMNode>` from the reconstructed iframe's DOM
4. Timeline advances: events are applied in timestamp order
   - `mutation` → apply DOM changes to iframe via the nodeId map
   - `mousemove` / `click` → move virtual cursor overlay
   - `scroll` → scroll iframe's window
   - `console` → append row to console panel
   - `network` → append row to network panel
5. User can pause, scrub, and seek — seeking replays all events from snapshot up to seek point

---

## Aspire role (dev only)

Aspire AppHost is **not used in production**. It exists only for local development:
- Auto-wires PostgreSQL connection string into the API
- Provides the Aspire dashboard (traces, logs, health)
- Runs `pg_admin` for DB inspection

Production uses `docker-compose.yml` with explicit `ConnectionStrings__replaykit-db` env var.

---

## HA design

- **Primary node**: accepts all reads and writes
- **Standby node**: PostgreSQL streaming replica, API runs with `REPLAYKIT_READONLY=true` (blocks write endpoints with HTTP 503)
- **Failover**: F5 detects primary health check failure, routes to standby; ops promotes standby PG to primary and removes `REPLAYKIT_READONLY`
- **No app-level clustering needed** — all complexity is in PostgreSQL replication (standard, well-understood)

See `09-ha-setup.md` for step-by-step.
