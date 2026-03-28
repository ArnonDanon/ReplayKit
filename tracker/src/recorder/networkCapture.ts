import type { NetworkData } from '../types';

export function startNetworkCapture(onRequest: (data: NetworkData) => void): () => void {
  const cleanups: (() => void)[] = [];

  // ── fetch ─────────────────────────────────────────────────────────────────
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const startedAt = Date.now();
    const method    = ((init?.method) ?? 'GET').toUpperCase();
    const url       = resolveUrl(input);

    try {
      const response = await originalFetch.call(this, input, init);
      emit(onRequest, { method, url, status: response.status, startedAt });
      return response;
    } catch (err) {
      emit(onRequest, { method, url, status: 0, startedAt });
      throw err;
    }
  };

  cleanups.push(() => { window.fetch = originalFetch; });

  // ── XHR ───────────────────────────────────────────────────────────────────
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as RkXHR).__rk_method = method.toUpperCase();
    (this as RkXHR).__rk_url   = String(url);
    (origOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const startedAt = Date.now();
    this.addEventListener('loadend', () => {
      emit(onRequest, {
        method:    (this as RkXHR).__rk_method ?? 'GET',
        url:       (this as RkXHR).__rk_url    ?? '',
        status:    this.status,
        startedAt,
      });
    });
    origSend.apply(this, args);
  };

  cleanups.push(() => {
    XMLHttpRequest.prototype.open = origOpen;
    XMLHttpRequest.prototype.send = origSend;
  });

  return () => cleanups.forEach(fn => fn());
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RkXHR extends XMLHttpRequest {
  __rk_method?: string;
  __rk_url?:    string;
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL)     return input.href;
  return (input as Request).url;
}

function emit(
  cb:   (d: NetworkData) => void,
  info: { method: string; url: string; status: number; startedAt: number }
) {
  try {
    cb({ ...info, durationMs: Date.now() - info.startedAt });
  } catch { /* swallow */ }
}
