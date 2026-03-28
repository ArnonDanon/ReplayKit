# ReplayKit — Docker & Deployment

## Images involved

| Image | Source | Role |
|-------|--------|------|
| `replaykit-api` | Built from `Dockerfile` | .NET 10 API + Player static files |
| `postgres:16-alpine` | Docker Hub | PostgreSQL database |

> All images must be available in the air-gapped environment. Pull and push to a local registry (Harbor, Nexus, etc.) before deployment.

---

## Build steps (before docker-compose)

```bash
# 1. Build the player SPA (output → server/ReplayKit.API/wwwroot/)
cd player && npm install && npm run build

# 2. Build the Docker image (includes wwwroot)
cd ..   # repo root
docker build -t replaykit-api:latest -f server/ReplayKit.API/Dockerfile .
```

---

## Single-node: `docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       replaykit
      POSTGRES_USER:     replaykit
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U replaykit"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - replaykit

  api:
    image: replaykit-api:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      ConnectionStrings__replaykit-db: >-
        Host=postgres;Database=replaykit;Username=replaykit;
        Password=${POSTGRES_PASSWORD};Pooling=true;MaxPoolSize=20
      Jwt__Secret:                        ${JWT_SECRET}
      TrackerApiKey:                      ${TRACKER_API_KEY}
      REPLAYKIT_RETENTION_DAYS:           ${RETENTION_DAYS:-7}
      REPLAYKIT_DEFAULT_ADMIN_PASSWORD:   ${ADMIN_PASSWORD:-admin123}
      AllowedOrigins__0:                  ${ALLOWED_ORIGIN_0:-*}
      ASPNETCORE_URLS:                    http://+:8080
    ports:
      - "5000:8080"    # F5 terminates SSL, forwards plain HTTP to port 5000
    networks:
      - replaykit

volumes:
  pgdata:

networks:
  replaykit:
    driver: bridge
```

---

## `.env.example`

```bash
# PostgreSQL
POSTGRES_PASSWORD=change_me_strong_password

# JWT signing secret (min 32 characters)
JWT_SECRET=change_me_to_a_long_random_string_at_least_32_chars

# Shared key between tracker (Next.js app) and server
TRACKER_API_KEY=change_me_tracker_key

# Session retention
RETENTION_DAYS=7

# Initial admin password (change after first login)
ADMIN_PASSWORD=admin123

# CORS — set to the URL of your Next.js app(s), comma-separated if multiple
ALLOWED_ORIGIN_0=https://myapp.internal
# ALLOWED_ORIGIN_1=https://otherapp.internal
```

---

## HA Primary: `docker-compose.ha-primary.yml`

Same as single-node, plus PostgreSQL is configured for streaming replication:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       replaykit
      POSTGRES_USER:     replaykit
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/primary/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./postgres/primary/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    networks:
      - replaykit

  api:
    image: replaykit-api:latest
    # ... same as single-node, no REPLAYKIT_READONLY
    networks:
      - replaykit
```

---

## HA Standby: `docker-compose.ha-standby.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      PGPASSWORD: ${REPLICATION_PASSWORD}   # used by pg_basebackup
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/standby/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    entrypoint: |
      bash -c "
        if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
          pg_basebackup -h ${PRIMARY_HOST} -p 5432 \
            -U replicator -D /var/lib/postgresql/data \
            -P -v -R -X stream
        fi
        exec postgres -c config_file=/etc/postgresql/postgresql.conf
      "
    networks:
      - replaykit

  api:
    image: replaykit-api:latest
    environment:
      # same as primary, plus:
      REPLAYKIT_READONLY: "true"
    networks:
      - replaykit
```

Additional standby env vars:
```bash
PRIMARY_HOST=192.168.1.10       # IP of primary server
REPLICATION_PASSWORD=repl_pass  # password for replicator user
```

---

## Ports summary

| Service | Internal port | Exposed port | Notes |
|---------|--------------|--------------|-------|
| API | 8080 | 5000 | F5 → port 5000 → container 8080 |
| PostgreSQL | 5432 | not exposed | Internal network only |

F5 handles SSL termination and health-check based failover. The app sees plain HTTP internally.

---

## Health check endpoint

```
GET /health   → 200 OK  {"status":"Healthy"}
GET /alive    → 200 OK  (liveness only)
```

Configure F5 monitor against `GET /health` on port 5000.

---

## Air-gap checklist

- [ ] `postgres:16-alpine` image saved and pushed to internal registry
- [ ] `mcr.microsoft.com/dotnet/aspnet:10.0` image saved and pushed
- [ ] `mcr.microsoft.com/dotnet/sdk:10.0` image saved and pushed (build only)
- [ ] Tracker npm package published to internal npm registry (Verdaccio / Azure Artifacts)
- [ ] No CDN references in player HTML (Vite bundles everything)
- [ ] `.env` file populated with production secrets (not `.env.example`)
