# ReplayKit — Player SPA

## Stack
- **React 18** + TypeScript
- **Vite** (build tool)
- **react-router-dom** (client-side routing)
- **No UI library** — plain CSS, keep it minimal
- Build output → `../src/ReplayKit.API/wwwroot/` (served by the .NET server)

---

## Pages

### `/login`
Simple username + password form. POSTs to `POST /api/auth/login`. Stores JWT in `localStorage`. Redirects to `/` on success.

### `/` — Session List
- Paginated table of sessions (20 per page)
- Columns: Start URL, User Agent, Started At, Duration, Status
- Click a row → navigate to `/sessions/:id`
- Delete button per row (calls `DELETE /api/sessions/:id`)
- Auto-refresh every 30 seconds

### `/sessions/:id` — Session Detail
- Session metadata header (URL, UA, date, duration)
- **Player** component (main replay area)
- **Timeline** below player
- **ConsolePanel** tab
- **NetworkPanel** tab

---

## Components

### `Player.tsx`

The core replay component.

**Structure:**
```
<div class="player-container">
  <div class="player-viewport">        ← fixed size, overflow hidden
    <iframe class="player-frame" />    ← reconstructed DOM
    <MouseCursor />                    ← absolute overlay for virtual cursor
  </div>
</div>
```

**Initialization:**
1. Receive `events: SessionEvent[]` as prop (already sorted by timestamp)
2. Find the first `snapshot` event
3. Parse `snapshot.data.root` (SerializedNode tree) and reconstruct DOM
4. Write reconstructed HTML into iframe via `iframe.contentDocument`
5. Build `nodeMap: Map<number, Node>` from every node with a `data-rk-id`
6. Register `onSeek(timestampMs)` handler

**Event application:**

```typescript
function applyEvent(event: SessionEvent, iframe: HTMLIFrameElement, nodeMap: Map<number, Node>) {
  switch (event.type) {
    case 'mutation':   applyMutation(event.data, nodeMap); break;
    case 'mousemove':  updateCursor(event.data); break;
    case 'click':      flashCursor(event.data); break;
    case 'scroll':     applyScroll(event.data, iframe); break;
    case 'input':      applyInput(event.data, nodeMap); break;
  }
}
```

**Mutation application:**
```typescript
function applyMutation(data: MutationData, nodeMap) {
  for (const m of data.mutations) {
    const target = nodeMap.get(m.targetId);
    if (!target) continue;

    if (m.type === 'childList') {
      // remove nodes
      m.removedIds?.forEach(id => nodeMap.get(id)?.remove());
      // add nodes
      m.addedNodes?.forEach(n => {
        const newNode = reconstructNode(n, nodeMap);
        const refNode = m.nextSiblingId ? nodeMap.get(m.nextSiblingId) : null;
        target.insertBefore(newNode, refNode ?? null);
      });
    }
    if (m.type === 'attributes') {
      (target as Element).setAttribute(m.attrName!, m.attrValue ?? '');
    }
    if (m.type === 'characterData') {
      target.textContent = m.textContent ?? '';
    }
  }
}
```

### `Timeline.tsx`

```
[▶ Play]  [00:23 / 01:45]  [─────────●──────────────]  [1×  2×]
```

Props:
```typescript
interface TimelineProps {
  durationMs:   number;
  currentMs:    number;
  onSeek:       (ms: number) => void;
  onPlayPause:  (playing: boolean) => void;
  speed:        1 | 2 | 4;
  onSpeedChange:(speed: 1 | 2 | 4) => void;
}
```

Internally uses `requestAnimationFrame` loop while playing. Advances `currentMs` by wall-clock delta × speed, calls `onSeek` each frame.

### `ConsolePanel.tsx`

Receives all `console` events from the session. Renders a scrollable log:

```
[ERROR] 14:32:01  TypeError: Cannot read properties of undefined
[WARN]  14:32:05  [React] Each child in a list should have a unique key
[LOG]   14:32:10  User clicked checkout
```

Color coding: error=red, warn=amber, log=inherit, info=blue.

### `NetworkPanel.tsx`

Receives all `network` events. Renders a table:

```
Method  Status  Duration  URL
GET     200     45ms      /api/products
POST    201     120ms     /api/cart/items
GET     404     12ms      /api/user/preferences
```

Status color: 2xx=green, 3xx=blue, 4xx=amber, 5xx=red.

### `MouseCursor.tsx`

Absolutely positioned `<div>` styled as a mouse pointer SVG. Position updated via `mousemove` events. `click` events briefly show a ripple animation.

---

## API client (`api.ts`)

```typescript
// All calls include Authorization: Bearer {token} header
// Token loaded from localStorage

export async function login(username, password): Promise<string>  // returns JWT
export async function listSessions(page): Promise<SessionListResponse>
export async function getSession(id): Promise<Session>
export async function getEvents(sessionId): Promise<SessionEvent[]>
export async function deleteSession(id): Promise<void>
```

Handles 401 → redirect to `/login`.

---

## Types (`types.ts`)

Mirrors the server models:

```typescript
interface Session {
  id:         string;
  userAgent:  string | null;
  startUrl:   string;
  metadata:   Record<string, unknown>;
  startedAt:  string;   // ISO string
  endedAt:    string | null;
  durationMs: number | null;
  status:     'recording' | 'completed';
}

interface SessionEvent {
  id:        number;
  sessionId: string;
  timestamp: number;   // epoch ms
  type:      string;
  data:      unknown;
}
```

---

## Vite config

```typescript
export default defineConfig({
  build: {
    outDir: '../src/ReplayKit.API/wwwroot',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000'   // dev: proxy to local .NET server
    }
  }
});
```

---

## Seek / scrub performance

When the user scrubs the timeline backwards, the player must replay all events from the snapshot to the target timestamp. To keep this fast:
- Events are kept in memory for the life of the detail page
- Seeking backward: reset iframe to snapshot, re-apply events up to target timestamp
- Seeking forward: continue applying from current position

This is acceptable for sessions up to ~5 minutes. For longer sessions, a keyframe every 30 seconds could be added later.
