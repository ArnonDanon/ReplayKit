# ReplayKit — Sample App

## Purpose
A minimal Next.js 14 application that demonstrates tracker integration. Gives developers a working reference and lets you verify the full recording/replay pipeline without needing a real target app.

---

## Stack
- Next.js 14 (App Router)
- TypeScript
- `replaykit-tracker` — referenced via relative path (`"replaykit-tracker": "file:../tracker"`)

---

## Pages

### `/` — Home
Interactive demo page with:
- Counter button (click events)
- Text input (input events, non-password)
- Fetch call example (network events)
- `console.log` button (console events)

### `/about`
Static informational page. Demonstrates navigation recording.

### `/products`
Table of dummy products with:
- Client-side filtering input
- Sort by column (generates DOM mutations)
- Simulated API call on mount (network event)

---

## Tracker wiring

```tsx
// src/app/layout.tsx
import { ReplayKitProvider } from 'replaykit-tracker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReplayKitProvider
          serverUrl={process.env.NEXT_PUBLIC_REPLAYKIT_URL ?? 'http://localhost:5000'}
          apiKey={process.env.NEXT_PUBLIC_REPLAYKIT_KEY ?? 'dev-api-key'}
          metadata={{ app: 'sample-app', version: '1.0.0' }}
        >
          {children}
        </ReplayKitProvider>
      </body>
    </html>
  );
}
```

---

## Environment variables

```bash
# sample-app/.env.local
NEXT_PUBLIC_REPLAYKIT_URL=http://localhost:5000
NEXT_PUBLIC_REPLAYKIT_KEY=dev-api-key
```

---

## Running locally

```bash
# 1. Build the tracker first
cd tracker && npm install && npm run build

# 2. Start the sample app
cd sample-app && npm install && npm run dev
```

The sample app will be at `http://localhost:3000`. Open it in a browser, interact with it, then open the ReplayKit player to see the recorded session.

---

## Package.json dependency

```json
{
  "dependencies": {
    "replaykit-tracker": "file:../tracker",
    "next": "14.x",
    "react": "^18",
    "react-dom": "^18"
  }
}
```

Using `file:` protocol means no npm publish needed. In a real deployment, publish the tracker package to an internal npm registry (Verdaccio, Azure Artifacts, etc.) and reference it by version.

---

## What to observe in the player after running the sample

1. **Snapshot** — full page DOM on load
2. **Navigation** — clicking between pages changes `startUrl` in metadata (note: in Next.js App Router, page navigations are soft navigations; DOM mutations capture the content changes)
3. **Click events** — counter button clicks visible as click events on timeline
4. **Input events** — typing in text input produces `input` events
5. **Console events** — clicking the log button produces a `console.log` entry in the console panel
6. **Network events** — product page load and filter actions produce `fetch` entries in the network panel
