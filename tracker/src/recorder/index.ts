import type { EventItem } from '../types';
import { resetIds } from './nodeIdManager';
import { serializeDocument } from './domSerializer';
import { startMutationCapture } from './mutationCapture';
import { startEventCapture } from './eventCapture';
import { startConsoleCapture } from './consoleCapture';
import { startNetworkCapture } from './networkCapture';
import { createSession, sendEvents, endSession } from '../api';

const FLUSH_INTERVAL_MS = 2_000;
const MAX_BATCH_SIZE    = 100;

export class Recorder {
  private readonly sessionId: string;
  private buffer:    EventItem[]  = [];
  private cleanups:  (() => void)[] = [];
  private timer:     ReturnType<typeof setInterval> | null = null;
  private startTime  = 0;
  private started    = false;

  constructor(
    private readonly serverUrl: string,
    private readonly apiKey:    string,
    private readonly metadata?: Record<string, unknown>
  ) {
    this.sessionId = crypto.randomUUID();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started   = true;
    this.startTime = Date.now();
    resetIds();

    try {
      await createSession(this.serverUrl, this.apiKey, {
        id:        this.sessionId,
        userAgent: navigator.userAgent,
        startUrl:  window.location.href,
        metadata:  JSON.stringify(this.metadata ?? {}),
      });
    } catch (e) {
      console.warn('[ReplayKit] Failed to create session:', e);
      this.started = false;
      return;
    }

    // Full DOM snapshot (first event in every session)
    this.push('snapshot', serializeDocument());

    // Wire up all capture modules
    this.cleanups.push(
      startMutationCapture(data  => this.push('mutation', data)),
      startEventCapture((type, data) => this.push(type, data)),
      startConsoleCapture(data   => this.push('console', data)),
      startNetworkCapture(data   => this.push('network', data)),
    );

    // Periodic flush
    this.timer = setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);

    // Flush + end on page close
    const onUnload = () => { void this.stop(); };
    window.addEventListener('beforeunload', onUnload);
    this.cleanups.push(() => window.removeEventListener('beforeunload', onUnload));
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];

    await this.flush();

    try {
      await endSession(
        this.serverUrl, this.apiKey,
        this.sessionId, Date.now() - this.startTime
      );
    } catch { /* best-effort */ }
  }

  private push(type: string, data: unknown): void {
    this.buffer.push({ timestamp: Date.now(), type, data });
    if (this.buffer.length >= MAX_BATCH_SIZE) void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const events = this.buffer.splice(0);
    try {
      await sendEvents(this.serverUrl, this.apiKey, this.sessionId, events);
    } catch (e) {
      console.warn('[ReplayKit] Failed to send events, will retry:', e);
      this.buffer.unshift(...events);   // put back for next flush
    }
  }
}
