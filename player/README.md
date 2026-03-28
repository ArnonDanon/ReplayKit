# ReplayKit — Player

React SPA for browsing and replaying recorded sessions. Built by Vite and served as static files from the .NET server's `wwwroot/`.

## Files

| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | JWT login form |
| `src/pages/SessionList.tsx` | Paginated session list, auto-refreshes every 30 s |
| `src/pages/SessionDetail.tsx` | Session detail — wires player, timeline, and panels together |
| `src/components/Player.tsx` | iframe-based DOM reconstructor; applies mutations, scroll, input; handles backward seek by resetting to snapshot |
| `src/components/Timeline.tsx` | rAF playback loop, scrubber, 1×/2×/4× speed |
| `src/components/ConsolePanel.tsx` | Console log viewer, filtered to `currentMs` |
| `src/components/NetworkPanel.tsx` | Network request viewer, filtered to `currentMs` |
| `src/components/MouseCursor.tsx` | Absolutely-positioned cursor overlay with click ripple |
| `src/api.ts` | Typed fetch wrapper — auto-redirects to `/login` on 401 |
| `src/index.css` | Dark-theme stylesheet, no external UI dependencies |

## Run locally (dev)

Requires the ReplayKit server to be running (Aspire or Docker).

```bash
npm install
npm run dev
# Opens at http://localhost:5173
# /api calls are proxied to http://localhost:5000
```

## Build for production

```bash
npm run build
# Output → ../server/ReplayKit.API/wwwroot/
# Run this before building the server Docker image
```

## Notes

- **Seeking backward** resets the iframe to the initial snapshot then replays all events up to the target timestamp. Acceptable for sessions up to ~5 minutes.
- **Authentication**: JWT stored in `localStorage`, expires after 8 hours.
- **No external UI library**: all styles are in `index.css` — safe for air-gapped environments.
