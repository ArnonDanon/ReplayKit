# ReplayKit — Folder Structure

```
ReplayKit/
│
├── plan/                          ← these planning files
│
├── src/                           ← .NET solution
│   ├── ReplayKit.sln
│   │
│   ├── ReplayKit.AppHost/         ← Aspire orchestrator (dev only)
│   │   ├── ReplayKit.AppHost.csproj
│   │   └── Program.cs
│   │
│   ├── ReplayKit.ServiceDefaults/ ← Shared: health checks, OTEL, resilience
│   │   ├── ReplayKit.ServiceDefaults.csproj
│   │   └── Extensions.cs
│   │
│   └── ReplayKit.API/             ← Main server
│       ├── ReplayKit.API.csproj
│       ├── Program.cs             ← builder + route wiring
│       ├── schema.sql             ← copied to output, run on startup
│       ├── Dockerfile
│       │
│       ├── Models/
│       │   ├── Session.cs
│       │   ├── SessionEvent.cs
│       │   └── User.cs
│       │
│       ├── Repositories/          ← Dapper query classes
│       │   ├── SessionRepository.cs
│       │   ├── EventRepository.cs
│       │   └── UserRepository.cs
│       │
│       ├── Services/
│       │   ├── AuthService.cs     ← JWT generation + BCrypt verify
│       │   └── SessionCleanupService.cs  ← IHostedService, daily purge
│       │
│       ├── Routes/                ← Minimal API route groups
│       │   ├── AuthRoutes.cs
│       │   ├── SessionRoutes.cs
│       │   └── EventRoutes.cs
│       │
│       └── wwwroot/               ← Player SPA static build output (git-ignored)
│
├── tracker/                       ← npm package: replaykit-tracker
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             ← builds to dist/ as ESM + CJS library
│   └── src/
│       ├── index.ts               ← public exports
│       ├── types.ts               ← shared event types
│       ├── api.ts                 ← HTTP client (fetch, no axios)
│       ├── ReplayKitProvider.tsx  ← React component ('use client')
│       └── recorder/
│           ├── index.ts           ← Recorder class (orchestrator)
│           ├── nodeIdManager.ts   ← WeakMap-based node ID assignment
│           ├── domSerializer.ts   ← DOM → SerializedNode JSON
│           ├── mutationCapture.ts ← MutationObserver → mutation events
│           ├── eventCapture.ts    ← mouse, click, scroll, input
│           ├── consoleCapture.ts  ← console.log/warn/error intercept
│           └── networkCapture.ts  ← fetch + XHR intercept
│
├── player/                        ← Vite React SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             ← builds to ../src/ReplayKit.API/wwwroot
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                ← router (react-router-dom)
│       ├── api.ts                 ← typed API client
│       ├── types.ts
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── SessionList.tsx
│       │   └── SessionDetail.tsx  ← hosts the Player component
│       └── components/
│           ├── Player.tsx         ← iframe-based DOM reconstructor
│           ├── Timeline.tsx       ← scrub bar + play/pause
│           ├── ConsolePanel.tsx   ← log entries with level colors
│           ├── NetworkPanel.tsx   ← request rows: method, url, status, ms
│           └── MouseCursor.tsx    ← virtual cursor overlay on iframe
│
├── sample-app/                    ← Next.js demo wired to tracker
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── src/app/
│       ├── layout.tsx             ← wraps with <ReplayKitProvider>
│       ├── page.tsx               ← home page with interactive elements
│       ├── about/page.tsx
│       └── products/page.tsx      ← table + filtering (generates rich events)
│
├── postgres/
│   ├── primary/
│   │   ├── postgresql.conf        ← wal_level=replica, wal senders etc.
│   │   └── pg_hba.conf            ← allows replicator user from standby
│   └── standby/
│       └── postgresql.conf        ← hot_standby=on
│
├── docker-compose.yml             ← single-node (server + postgres)
├── docker-compose.ha-primary.yml  ← HA primary node
├── docker-compose.ha-standby.yml  ← HA standby node
└── .env.example                   ← all required env vars documented
```

---

## Key conventions

- **No `wwwroot` in source control** — player build output is generated at CI/deploy time
- **`schema.sql` ships with the server image** — applied idempotently on startup (CREATE TABLE IF NOT EXISTS)
- **Tracker has zero runtime dependencies** — bundled as single self-contained JS library
- **Player has no backend of its own** — all API calls go to the same Aspire/server origin
- **All env vars documented in `.env.example`** — nothing hardcoded except safe defaults
