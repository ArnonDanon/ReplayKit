# ReplayKit — Server

ASP.NET Core 10 with .NET Aspire, Dapper, and Minimal API.

## Files

| File | Purpose |
|------|---------|
| `ReplayKit.AppHost/Program.cs` | Aspire orchestrator — wires PostgreSQL → API (dev only, not deployed) |
| `ReplayKit.ServiceDefaults/Extensions.cs` | Shared: OpenTelemetry, health checks, HTTP resilience |
| `ReplayKit.API/Program.cs` | Builder, middleware pipeline, route wiring, DB initializer |
| `ReplayKit.API/Models/` | `Session`, `SessionEvent`, `User` |
| `ReplayKit.API/Repositories/` | Dapper query classes for all three entities |
| `ReplayKit.API/Services/AuthService.cs` | BCrypt verify + JWT generation |
| `ReplayKit.API/Services/SessionCleanupService.cs` | `IHostedService` — purges expired sessions every 24 h |
| `ReplayKit.API/Routes/AuthRoutes.cs` | `POST /api/auth/login` |
| `ReplayKit.API/Routes/SessionRoutes.cs` | Session CRUD (API key for writes, JWT for reads) |
| `ReplayKit.API/Routes/EventRoutes.cs` | Event ingest (API key) + retrieval (JWT) |
| `ReplayKit.API/schema.sql` | DB schema — applied idempotently on startup |
| `ReplayKit.API/Dockerfile` | Two-stage build: sdk → aspnet runtime |

## Run locally (dev)

Requires: .NET 10 SDK, Docker (for PostgreSQL via Aspire).

```bash
cd server
dotnet run --project ReplayKit.AppHost
```

The Aspire dashboard opens at **http://localhost:18888** and shows the API URL, logs, traces, and health checks.

## Run in production

Build the player first (so `wwwroot/` is populated), then build the Docker image from the repo root:

```bash
# From repo root
cd player && npm run build && cd ..
docker build -t replaykit-api:latest -f server/ReplayKit.API/Dockerfile .
```

Then use `docker-compose.yml` in the repo root.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ConnectionStrings__replaykit-db` | Yes (prod) | — | PostgreSQL connection string |
| `Jwt__Secret` | Yes | — | Signing key (min 32 chars) |
| `TrackerApiKey` | Yes | — | Shared key for tracker ingest (`X-Api-Key` header) |
| `REPLAYKIT_RETENTION_DAYS` | No | `7` | Session retention in days |
| `REPLAYKIT_READONLY` | No | `false` | Set `true` on HA standby node |
| `REPLAYKIT_DEFAULT_ADMIN_PASSWORD` | No | `admin123` | Initial admin password |
| `AllowedOrigins__0` | No | `*` | CORS origin for the tracker |

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Returns JWT token |
| POST | `/api/sessions` | API key | Tracker: create session |
| POST | `/api/sessions/:id/end` | API key | Tracker: mark session complete |
| POST | `/api/sessions/:id/events` | API key | Tracker: ingest event batch |
| GET | `/api/sessions` | JWT | Player: list sessions (paginated) |
| GET | `/api/sessions/:id` | JWT | Player: session detail |
| GET | `/api/sessions/:id/events` | JWT | Player: all events for replay |
| DELETE | `/api/sessions/:id` | JWT | Player: delete session |
| GET | `/health` | — | Health check (used by F5 monitor) |
