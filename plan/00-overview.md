# ReplayKit — Project Overview

## What is it
A lightweight, self-hosted session replay tool for internal Next.js applications. Records DOM changes, console logs, and network activity so developers can replay exactly what a user experienced.

## Goals
- Air-gapped deployment — no external CDNs, no internet dependencies
- All assets bundled and self-contained
- Simple to operate: docker-compose up and it runs
- High Availability via PostgreSQL streaming replication + a standby node
- Max ~1000 concurrent sessions; 7-day retention (configurable)

## Non-goals
- Multi-tenant SaaS
- Mobile / native app recording
- Video recording
- Real-time streaming of sessions

---

## Plan files

| File | Topic |
|------|-------|
| `01-folder-structure.md` | Full directory layout and what lives where |
| `02-architecture.md` | Component diagram, data flow, design decisions |
| `03-database.md` | PostgreSQL schema, indexes, retention |
| `04-server.md` | .NET 10 Aspire + Dapper + Minimal API |
| `05-tracker.md` | React/TypeScript npm package for Next.js |
| `06-player.md` | React SPA — session list and replay viewer |
| `07-sample-app.md` | Next.js demo app wired to the tracker |
| `08-docker.md` | docker-compose single-node and HA configs |
| `09-ha-setup.md` | PostgreSQL streaming replication, failover steps |

---

## Build order
1. Database schema
2. .NET server (API + auth + cleanup job)
3. Tracker npm package
4. Player SPA (built output copied into server `wwwroot`)
5. Sample Next.js app
6. Docker-compose files
7. HA PostgreSQL config
