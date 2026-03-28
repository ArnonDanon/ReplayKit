# ReplayKit — Tracker

React component library (`replaykit-tracker`) for Next.js apps. Records DOM changes, console logs, and network activity and ships them to the ReplayKit server.

## Files

| File | Purpose |
|------|---------|
| `src/ReplayKitProvider.tsx` | `'use client'` React component — SSR-safe, starts/stops recorder |
| `src/api.ts` | Fetch wrapper using saved original `fetch` (tracker calls never self-record) |
| `src/types.ts` | Shared event type definitions |
| `src/recorder/index.ts` | `Recorder` class — orchestrates all capture modules |
| `src/recorder/nodeIdManager.ts` | WeakMap-based integer ID assignment per DOM node |
| `src/recorder/domSerializer.ts` | DOM → `SerializedNode` tree; strips script content, masks passwords |
| `src/recorder/mutationCapture.ts` | `MutationObserver` → batched mutation events |
| `src/recorder/eventCapture.ts` | Throttled mouse (50 ms), click, scroll (100 ms), input capture |
| `src/recorder/consoleCapture.ts` | Wraps `console.log/warn/error/info` — always calls through to devtools |
| `src/recorder/networkCapture.ts` | Wraps `window.fetch` and `XMLHttpRequest` |

## Build

```bash
npm install
npm run build
# Output: dist/replaykit-tracker.es.js + .cjs.js + type declarations
```

## Usage in Next.js

### 1 — Install

Reference locally (monorepo / dev):
```json
"replaykit-tracker": "file:../tracker"
```

Or publish to your internal npm registry and install by name.

### 2 — Add the provider

```tsx
// src/app/layout.tsx
import { ReplayKitProvider } from 'replaykit-tracker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReplayKitProvider
          serverUrl={process.env.NEXT_PUBLIC_REPLAYKIT_URL!}
          apiKey={process.env.NEXT_PUBLIC_REPLAYKIT_KEY!}
          metadata={{ appVersion: '1.0.0' }}
        >
          {children}
        </ReplayKitProvider>
      </body>
    </html>
  );
}
```

### 3 — Environment variables

```bash
# .env.local
NEXT_PUBLIC_REPLAYKIT_URL=https://replay.internal
NEXT_PUBLIC_REPLAYKIT_KEY=your-tracker-api-key
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `serverUrl` | `string` | Yes | Base URL of ReplayKit server |
| `apiKey` | `string` | Yes | Tracker API key (`X-Api-Key` header) |
| `metadata` | `Record<string, unknown>` | No | Stored with session, visible in player |
| `disabled` | `boolean` | No | Skip recording (useful in local dev) |

## What is NOT recorded

- Password field values
- Request / response bodies
- Content inside `<iframe>` elements
- `localStorage`, `sessionStorage`, cookies
- WebSocket messages
