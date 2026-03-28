# ReplayKit — Tracker Package

## Package identity
- **Name:** `replaykit-tracker`
- **Type:** React component library (npm package)
- **Target:** Next.js apps only
- **Output:** ESM + CJS + TypeScript declarations via Vite library mode
- **Runtime deps:** React 18+ (peer), zero other dependencies

---

## Usage in a Next.js app

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
          metadata={{ appVersion: '1.0.0' }}   // optional
        >
          {children}
        </ReplayKitProvider>
      </body>
    </html>
  );
}
```

The component is `'use client'` — Next.js will server-render children normally; recording only starts in the browser.

---

## Public API

```typescript
// index.ts exports
export { ReplayKitProvider } from './ReplayKitProvider';
export type { ReplayKitProviderProps } from './ReplayKitProvider';
```

### `<ReplayKitProvider>` props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `serverUrl` | `string` | Yes | Base URL of ReplayKit server |
| `apiKey` | `string` | Yes | Tracker API key (`X-Api-Key`) |
| `metadata` | `Record<string, unknown>` | No | Stored with session, shown in player |
| `disabled` | `boolean` | No | Skip recording (e.g. dev mode) |
| `children` | `ReactNode` | Yes | |

---

## Internal modules

### `recorder/index.ts` — `Recorder` class

Orchestrates all capture modules:

```typescript
class Recorder {
  constructor(serverUrl, apiKey, metadata?)
  start(): Promise<void>   // create session, take snapshot, wire up all capture
  stop(): Promise<void>    // flush buffer, call /end, remove all listeners
}
```

Lifecycle:
1. Generate session UUID client-side
2. `POST /api/sessions` with `{ id, userAgent, startUrl, metadata }`
3. Take full DOM snapshot → push to buffer
4. Start all capture modules
5. `setInterval` flush every 2 seconds
6. On `beforeunload`: flush + call `/end`

### `recorder/nodeIdManager.ts`

```typescript
// Assigns stable integer IDs to DOM nodes
const nodeIdMap = new WeakMap<Node, number>();
let counter = 1;

export function getNodeId(node: Node): number
export function setNodeId(node: Node, id: number): void
export function resetIds(): void   // called on session start
```

### `recorder/domSerializer.ts`

Recursively serializes the live DOM to a `SerializedNode` tree:

```typescript
interface SerializedNode {
  id:          number;
  nodeType:    1 | 3 | 8;          // Element, Text, Comment
  tagName?:    string;             // lowercase
  attributes?: Record<string, string>;
  textContent?: string;            // text/comment nodes only
  children?:   SerializedNode[];
  isSVG?:      boolean;
}

export function serializeNode(node: Node): SerializedNode | null
export function serializeDocument(): SerializedNode   // starts from <html>
```

Rules:
- `<script>` tags: serialize tag but empty the content (prevent re-execution in player)
- `<input type="password">`: capture tag but set `value=""` (never record passwords)
- Assigns `data-rk-id` attribute to each element during serialization
- Skips nodes injected by the tracker itself (guarded by a sentinel attribute)

### `recorder/mutationCapture.ts`

```typescript
export function startMutationCapture(
  onMutation: (data: MutationData) => void
): () => void   // returns cleanup fn

interface MutationData {
  mutations: MutationRecord[];
}

interface MutationRecord {
  type:           'childList' | 'attributes' | 'characterData';
  targetId:       number;
  // childList:
  addedNodes?:    SerializedNode[];
  removedIds?:    number[];
  nextSiblingId?: number | null;
  // attributes:
  attrName?:      string;
  attrValue?:     string | null;
  // characterData:
  textContent?:   string;
}
```

Uses `MutationObserver` with `{ subtree: true, childList: true, attributes: true, characterData: true }`.

Batches the raw `MutationObserver` records into a single `MutationData` event per callback tick.

### `recorder/eventCapture.ts`

```typescript
export function startEventCapture(
  onEvent: (type: string, data: unknown) => void
): () => void
```

Captured events:

| DOM event | Throttle | Emitted as |
|-----------|---------|------------|
| `pointermove` | 50ms | `mousemove { x, y }` |
| `click` | — | `click { x, y, targetId }` |
| `scroll` | 100ms | `scroll { x, y, targetId }` |
| `input` / `change` | — | `input { targetId, value }` (password fields: value = `""`) |

### `recorder/consoleCapture.ts`

```typescript
export function startConsoleCapture(
  onLog: (data: ConsoleData) => void
): () => void

interface ConsoleData {
  level: 'log' | 'warn' | 'error' | 'info';
  args:  string[];   // args converted via String()
}
```

Wraps `console.log/warn/error/info`. Calls the original method so browser devtools still work.

### `recorder/networkCapture.ts`

```typescript
export function startNetworkCapture(
  onRequest: (data: NetworkData) => void
): () => void

interface NetworkData {
  method:     string;
  url:        string;
  status:     number;
  durationMs: number;
  startedAt:  number;   // epoch ms
}
```

Intercepts:
- `window.fetch` — wraps with timing logic
- `XMLHttpRequest.prototype.open` + `.send` — wraps with timing logic

Does **not** capture request/response bodies (privacy + size).

### `api.ts`

Thin `fetch` wrapper — no axios:

```typescript
export async function createSession(serverUrl, apiKey, req): Promise<{ id: string }>
export async function sendEvents(serverUrl, apiKey, sessionId, events): Promise<void>
export async function endSession(serverUrl, apiKey, sessionId, durationMs): Promise<void>
```

All calls include `X-Api-Key: {apiKey}` header.
Failures are swallowed with `console.warn` — tracker errors must never crash the host app.

---

## Build config (`vite.config.ts`)

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ReplayKitTracker',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: { globals: { react: 'React' } },
    },
  },
});
```

Output: `dist/replaykit-tracker.es.js` + `dist/replaykit-tracker.cjs.js` + type declarations.

---

## What is NOT recorded

- Input values on `type="password"` fields
- Request/response bodies
- Anything inside `<iframe>` elements
- File input values
- `localStorage` / `sessionStorage` / cookies
- WebSocket messages
