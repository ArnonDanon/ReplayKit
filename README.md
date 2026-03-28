# ReplayKit

A lightweight, self-hosted session replay tool for internal Next.js applications. Records DOM changes, console logs, and network activity so developers can replay exactly what a user experienced.

## Components

| Component | Folder | Description |
|-----------|--------|-------------|
| Server | `server/` | ASP.NET Core 10 + Aspire + Dapper + Minimal API |
| Tracker | `tracker/` | React component library — records sessions in Next.js apps |
| Player | `player/` | React SPA — browse and replay recorded sessions |
| Sample app | `sample-app/` | Next.js demo app wired to the tracker |

## Quick start (single node)

### Prerequisites
- .NET 10 SDK
- Node.js 20+
- Docker + Docker Compose

### 1 — Build the player (output goes into the server's wwwroot)
```bash
cd player
npm install
npm run build
cd ..
```

### 2 — Build the tracker
```bash
cd tracker
npm install
npm run build
cd ..
```

### 3 — Copy .env and fill in secrets
```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_SECRET, TRACKER_API_KEY
```

### 4 — Start with Docker Compose
```bash
docker compose up -d
```

The player UI is available at `http://localhost:5000`.
Default login: `admin` / value of `ADMIN_PASSWORD` in `.env` (default: `admin123`).

### 5 — Run the sample app
```bash
cd sample-app
cp .env.local.example .env.local   # set NEXT_PUBLIC_REPLAYKIT_URL and KEY
npm install
npm run dev
```

Open `http://localhost:3000`, interact with the page, then check `http://localhost:5000` to see the recorded session.

## HA deployment

See `plan/09-ha-setup.md` and `docker-compose.ha-primary.yml` / `docker-compose.ha-standby.yml`.

## Plan docs

All architecture decisions, schemas, and component designs are documented in `plan/`.
