# ReplayKit

A lightweight, self-hosted session replay tool for internal Next.js applications. Records DOM changes, console logs, and network activity so developers can replay exactly what a user experienced.

## Components

| Component | Folder | Description |
|-----------|--------|-------------|
| Server | `server/` | ASP.NET Core 10 + Dapper + PostgreSQL — REST API + serves the Player UI |
| Tracker | `tracker/` | React library — records sessions inside your Next.js app |
| Player | `player/` | React SPA — browse and replay recorded sessions |
| Sample app | `sample-app/` | Demo Next.js app with the tracker already wired in |

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/)

---

## Running with Docker (recommended)

### 1 — Build the tracker

```bash
cd tracker
npm install
npm run build
cd ..
```

### 2 — Build the player

The player is a static SPA that gets served by the server. Its build output goes directly into `server/ReplayKit.API/wwwroot/`.

```bash
cd player
npm install
npm run build
cd ..
```

### 3 — Build the server Docker image

```bash
docker build -t replaykit-api:latest -f server/ReplayKit.API/Dockerfile .
```

### 4 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Any strong password |
| `JWT_SECRET` | Random string, at least 32 characters |
| `TRACKER_API_KEY` | Key your tracker will send — can be any string |
| `ADMIN_PASSWORD` | Initial password for the `admin` account (default: `admin123`) |
| `ALLOWED_ORIGIN_0` | URL of your Next.js app, e.g. `http://localhost:3000` |

### 5 — Start the stack

```bash
docker compose up -d
```

The Player UI is now at **http://localhost:5000**.
Log in with `admin` and the `ADMIN_PASSWORD` you set (default: `admin123`).

---

## Running the sample app

The sample app demonstrates the tracker recording real user sessions.

```bash
cd sample-app
cp .env.local.example .env.local
npm install
npm run dev
```

`.env.local` defaults:

```
NEXT_PUBLIC_REPLAYKIT_URL=http://localhost:5000
NEXT_PUBLIC_REPLAYKIT_KEY=<same value as TRACKER_API_KEY in .env>
```

Open **http://localhost:3000**, click around the pages, then go to **http://localhost:5000** to see the session appear and replay it.

---

## Development mode (no Docker)

Use this when actively changing the player or server code.

**Terminal 1 — database only**
```bash
docker compose up postgres -d
```

**Terminal 2 — server (Aspire)**
```bash
cd server
dotnet run --project ReplayKit.AppHost
```
API is at **http://localhost:5000**. Aspire dashboard at **http://localhost:15888**.

**Terminal 3 — player dev server**
```bash
cd player
npm run dev
```
Player UI at **http://localhost:5173** (proxies `/api` to the server at `:5000`).

**Terminal 4 — tracker (watch mode, if editing tracker)**
```bash
cd tracker
npm run dev
```

**Terminal 5 — sample app**
```bash
cd sample-app
npm run dev
```

---

## How the pieces connect

```
Browser (your app)
  └─ tracker  ──POST /api/sessions, /events──►  Server (:5000)
                                                    │
Browser (developer)                           PostgreSQL
  └─ player   ──GET /api/sessions────────────►  Server (:5000)
```

- The **tracker** runs inside your Next.js app and sends events to the server using `TRACKER_API_KEY`.
- The **player** is served by the same server at `/` and uses a JWT (obtained after login) to read sessions.
- **PostgreSQL** is internal — not exposed outside Docker.

---

## High-availability setup

See [`plan/09-ha-setup.md`](plan/09-ha-setup.md) and the companion compose files:
- `docker-compose.ha-primary.yml` — primary node with streaming replication
- `docker-compose.ha-standby.yml` — read-only replica (set `REPLAYKIT_READONLY=true`)

---

## Architecture & design docs

Detailed decisions for each component are in [`plan/`](plan/):

| File | Contents |
|------|----------|
| `00-overview.md` | Goals, non-goals, build order |
| `02-architecture.md` | Component diagram, auth flow, recording pipeline |
| `04-server.md` | API routes, DI setup, .NET stack |
| `05-tracker.md` | Public API, capture modules |
| `06-player.md` | Pages, Player/Timeline components |
| `08-docker.md` | Build steps, health checks, air-gap checklist |
