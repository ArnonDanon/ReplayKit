# ReplayKit — Server (.NET 10 / ASP.NET Core)

## Stack
- **.NET 10** — target framework `net10.0`
- **ASP.NET Core Aspire** — local dev orchestration + dashboard
- **Minimal API** — no controllers, route groups only
- **Dapper** — SQL-first, no ORM magic
- **Npgsql** — PostgreSQL driver (`Aspire.Npgsql` for dev, env var for prod)
- **BCrypt.Net-Next** — password hashing
- **JWT Bearer** — player authentication

---

## Projects

### ReplayKit.AppHost
Aspire orchestrator. **Dev only — not deployed.**

```csharp
// Program.cs
var postgres = builder.AddPostgres("replaykit-db")
    .WithDataVolume("replaykit-pgdata")
    .WithPgAdmin();

builder.AddProject<Projects.ReplayKit_API>("replaykit-api")
    .WithReference(postgres)
    .WaitFor(postgres);
```

### ReplayKit.ServiceDefaults
Shared extension methods applied to every service:
- OpenTelemetry (metrics + traces + logs) with optional OTLP export
- Default health checks: `/health` and `/alive`
- HTTP client resilience + service discovery

### ReplayKit.API
The main server. Runs in both dev (via AppHost) and production (Docker).

---

## Dependency injection wiring (`Program.cs`)

```csharp
builder.AddServiceDefaults();
builder.AddNpgsqlDataSource("replaykit-db");   // resolves from Aspire or env var

builder.Services.AddSingleton<SessionRepository>();
builder.Services.AddSingleton<EventRepository>();
builder.Services.AddSingleton<UserRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddHostedService<SessionCleanupService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(/* validates issuer, audience, signing key */);

builder.Services.AddAuthorization();
builder.Services.AddCors(/* AllowedOrigins from config */);
```

---

## Route groups

```
POST   /api/auth/login                         → AuthRoutes
GET    /api/sessions                           → SessionRoutes  [JWT]
GET    /api/sessions/{id}                      → SessionRoutes  [JWT]
DELETE /api/sessions/{id}                      → SessionRoutes  [JWT]
POST   /api/sessions                           → SessionRoutes  [ApiKey]
POST   /api/sessions/{id}/end                  → SessionRoutes  [ApiKey]
POST   /api/sessions/{id}/events               → EventRoutes    [ApiKey]
GET    /api/sessions/{id}/events               → EventRoutes    [JWT]
```

- **ApiKey** endpoints use an `AddEndpointFilter` that checks `X-Api-Key` header
- **JWT** endpoints use `.RequireAuthorization()`
- Routes are registered in extension methods on `IEndpointRouteBuilder` to keep `Program.cs` clean

---

## Models

```csharp
// Session.cs
public class Session {
    public Guid     Id          { get; set; }
    public string?  UserAgent   { get; set; }
    public string   StartUrl    { get; set; } = "";
    public string   Metadata    { get; set; } = "{}";   // JSON string
    public DateTime StartedAt   { get; set; }
    public DateTime? EndedAt    { get; set; }
    public long?    DurationMs  { get; set; }
    public string   Status      { get; set; } = "recording";
}

// SessionEvent.cs
public class SessionEvent {
    public long   Id        { get; set; }
    public Guid   SessionId { get; set; }
    public long   Timestamp { get; set; }   // epoch ms
    public string Type      { get; set; } = "";
    public string Data      { get; set; } = "{}";   // JSON string
}

// User.cs
public class User {
    public Guid     Id           { get; set; }
    public string   Username     { get; set; } = "";
    public string   PasswordHash { get; set; } = "";
    public DateTime CreatedAt    { get; set; }
}
```

---

## Repositories (Dapper)

Each repository takes `NpgsqlDataSource` via constructor injection and opens a connection per operation.

```csharp
// SessionRepository — key methods
Task CreateAsync(Session session)
Task<Session?> GetByIdAsync(Guid id)
Task<IEnumerable<Session>> ListAsync(int page, int pageSize)
Task<int> CountAsync()
Task EndSessionAsync(Guid id, long durationMs)
Task DeleteAsync(Guid id)
Task DeleteExpiredAsync(int retentionDays)

// EventRepository — key methods
Task InsertBatchAsync(Guid sessionId, IEnumerable<EventBatchItem> events)
Task<IEnumerable<SessionEvent>> GetBySessionAsync(Guid sessionId)

// UserRepository — key methods
Task<User?> GetByUsernameAsync(string username)
Task<bool> AnyAsync()
Task CreateAsync(User user)
```

> JSONB columns (`metadata`, `data`) are read as `string` in C# and returned as-is to the client. No double-serialization.

---

## Services

### AuthService
```csharp
// Verifies password with BCrypt, returns signed JWT on success
Task<string?> LoginAsync(string username, string password)
```

JWT payload:
- `ClaimTypes.Name` = username
- `ClaimTypes.NameIdentifier` = user ID
- Expires: 8 hours
- Issuer + Audience: `"replaykit"`

### SessionCleanupService (IHostedService)
Runs on startup, then every 24 hours:
```csharp
await sessions.DeleteExpiredAsync(retentionDays);
```
`retentionDays` comes from `IConfiguration["REPLAYKIT_RETENTION_DAYS"]` (default `7`).

---

## Startup: DatabaseInitializer

Called once in `Program.cs` before `app.Run()`:

1. Reads `schema.sql` from the executable directory
2. Runs it against the database (idempotent — `IF NOT EXISTS` everywhere)
3. Checks if any users exist; if not, creates default `admin` user

---

## Read-only mode (HA standby)

Middleware registered when `REPLAYKIT_READONLY=true`:

```csharp
app.Use(async (ctx, next) => {
    if (ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS")) {
        ctx.Response.StatusCode = 503;
        await ctx.Response.WriteAsync("Server is in read-only mode");
        return;
    }
    await next();
});
```

Standby node can still serve the player UI and replay sessions, just not ingest new ones.

---

## Static files (Player SPA)

```csharp
app.UseDefaultFiles();
app.UseStaticFiles();           // serves wwwroot/
app.MapFallbackToFile("index.html");  // SPA routing fallback
```

Player is built by Vite with `outDir` pointing to `../server/ReplayKit.API/wwwroot`.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ConnectionStrings__replaykit-db` | Yes (prod) | — | PostgreSQL connection string |
| `Jwt__Secret` | Yes | — | Signing key (min 32 chars) |
| `TrackerApiKey` | Yes | — | Shared key for tracker ingest |
| `REPLAYKIT_RETENTION_DAYS` | No | `7` | Session retention in days |
| `REPLAYKIT_READONLY` | No | `false` | Set `true` on standby node |
| `REPLAYKIT_DEFAULT_ADMIN_PASSWORD` | No | `admin123` | Initial admin password |
| `AllowedOrigins__0` | No | `*` | CORS origins for tracker |

---

## Dockerfile (ReplayKit.API)

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app
COPY . .
RUN dotnet publish src/ReplayKit.API/ReplayKit.API.csproj \
    -c Release -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /publish .
ENTRYPOINT ["dotnet", "ReplayKit.API.dll"]
```

> Player SPA must be built before the Docker image. Vite build output lands in `server/ReplayKit.API/wwwroot/` which is included in the publish output.
