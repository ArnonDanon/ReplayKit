import type { Session, SessionEvent, SessionListResponse } from './types';

function token() { return localStorage.getItem('rk_token') ?? ''; }

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

function checkAuth(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('rk_token');
    window.location.href = '/login';
  }
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch('/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json() as { token: string };
  return data.token;
}

export async function listSessions(page = 1, pageSize = 20): Promise<SessionListResponse> {
  const res = await fetch(`/api/sessions?page=${page}&pageSize=${pageSize}`, {
    headers: authHeaders(),
  });
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json() as Promise<SessionListResponse>;
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}`, { headers: authHeaders() });
  checkAuth(res);
  if (!res.ok) throw new Error('Session not found');
  return res.json() as Promise<Session>;
}

export async function getEvents(sessionId: string): Promise<SessionEvent[]> {
  const res = await fetch(`/api/sessions/${sessionId}/events`, { headers: authHeaders() });
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to load events');
  return res.json() as Promise<SessionEvent[]>;
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, {
    method:  'DELETE',
    headers: authHeaders(),
  });
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to delete session');
}
