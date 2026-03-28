import type { ClickData, InputData, MouseMoveData, ScrollData } from '../types';
import { getNodeId } from './nodeIdManager';

type EventCallback = (type: string, data: unknown) => void;

function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  }) as T;
}

export function startEventCapture(onEvent: EventCallback): () => void {
  const cleanups: (() => void)[] = [];

  function listen<K extends keyof DocumentEventMap>(
    type:    K,
    handler: (e: DocumentEventMap[K]) => void,
    opts?:   AddEventListenerOptions
  ) {
    document.addEventListener(type, handler, opts);
    cleanups.push(() => document.removeEventListener(type, handler, opts));
  }

  // ── Mouse move (throttled to 50ms / ~20fps) ───────────────────────────────
  listen(
    'mousemove',
    throttle((e: MouseEvent) => {
      onEvent('mousemove', { x: e.clientX, y: e.clientY } satisfies MouseMoveData);
    }, 50),
    { passive: true }
  );

  // ── Click ─────────────────────────────────────────────────────────────────
  listen(
    'click',
    (e: MouseEvent) => {
      onEvent('click', {
        x:        e.clientX,
        y:        e.clientY,
        targetId: e.target instanceof Node ? getNodeId(e.target) : 0,
      } satisfies ClickData);
    },
    { capture: true, passive: true }
  );

  // ── Scroll (throttled to 100ms) ───────────────────────────────────────────
  listen(
    'scroll',
    throttle((e: Event) => {
      const el = (e.target === document ? document.documentElement : e.target) as Element;
      onEvent('scroll', {
        x:        el.scrollLeft,
        y:        el.scrollTop,
        targetId: getNodeId(el),
      } satisfies ScrollData);
    }, 100),
    { capture: true, passive: true }
  );

  // ── Input / change ────────────────────────────────────────────────────────
  listen(
    'input',
    (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      onEvent('input', {
        targetId: getNodeId(target),
        value:    target.type === 'password' ? '' : target.value,
      } satisfies InputData);
    },
    { capture: true }
  );

  return () => cleanups.forEach(fn => fn());
}
