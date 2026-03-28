# ReplayKit — Sample App

A minimal Next.js 14 (App Router) demo that shows how to wire `replaykit-tracker` into a real application. Each page is designed to generate a specific category of session events.

## Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — wraps the app with `<ReplayKitProvider>` |
| `src/app/page.tsx` | Home — counter (clicks), text input, network call, console logs |
| `src/app/about/page.tsx` | Static page — demonstrates navigation recording |
| `src/app/products/page.tsx` | Products table — filter + sort generates DOM mutation events |
| `src/app/api/todos/route.ts` | Mock API route (no external dependencies) |
| `src/app/api/products/route.ts` | Mock product catalogue API route |
| `src/app/globals.css` | Minimal stylesheet |

## Events generated per page

| Page | Event types |
|------|-------------|
| Home — counter | `click` |
| Home — text input | `input`, `mutation` |
| Home — fetch button | `network`, `mutation` |
| Home — log button | `console` (log + warn + error) |
| Products — on load | `network` (fetches `/api/products`) |
| Products — filter input | `input`, `mutation` (table rows change) |
| Products — column sort | `click`, `mutation` (rows reorder) |
| Any page | `mousemove`, `scroll`, `snapshot` |

## Run locally

### Prerequisites
- Node.js 20+
- ReplayKit server running (Aspire dev or Docker)
- Tracker package built

```bash
# 1. Build the tracker first
cd ../tracker
npm install && npm run build

# 2. Set up env
cd ../sample-app
cp .env.local.example .env.local
# Edit .env.local if your server is not on localhost:5000

# 3. Install and run
npm install
npm run dev
```

The app starts at **http://localhost:3000**.

Open it in a browser, interact with the pages, then open the ReplayKit player at **http://localhost:5000** to see the recorded session.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_REPLAYKIT_URL` | `http://localhost:5000` | ReplayKit server URL |
| `NEXT_PUBLIC_REPLAYKIT_KEY` | `dev-api-key` | Tracker API key |
