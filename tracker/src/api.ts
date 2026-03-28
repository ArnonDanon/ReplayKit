import type { EventItem } from './types';

// Capture the native fetch *before* our network interceptor wraps it,
// so tracker API calls are never recorded as network events.
const _fetch: typeof fetch =
  typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function headers(apiKey: string) {
  return { ...JSON_HEADERS, 'X-Api-Key': apiKey };
}

export interface CreateSessionRequest {
  id:        string;
  userAgent: string;
  startUrl:  string;
  metadata:  string;   // JSON string
}

export async function createSession(
  serverUrl: string,
  apiKey:    string,
  req:       CreateSessionRequest
): Promise<void> {
  await _fetch(`${serverUrl}/api/sessions`, {
    method:  'POST',
    headers: headers(apiKey),
    body:    JSON.stringify(req),
  });
}

export async function sendEvents(
  serverUrl: string,
  apiKey:    string,
  sessionId: string,
  events:    EventItem[]
): Promise<void> {
  await _fetch(`${serverUrl}/api/sessions/${sessionId}/events`, {
    method:  'POST',
    headers: headers(apiKey),
    body:    JSON.stringify({ events }),
  });
}

export async function endSession(
  serverUrl: string,
  apiKey:    string,
  sessionId: string,
  durationMs: number
): Promise<void> {
  await _fetch(`${serverUrl}/api/sessions/${sessionId}/end`, {
    method:  'POST',
    headers: headers(apiKey),
    body:    JSON.stringify({ durationMs }),
    keepalive: true,   // survives beforeunload
  });
}
