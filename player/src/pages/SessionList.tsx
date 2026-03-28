import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, deleteSession } from '../api';
import type { Session } from '../types';

const PAGE_SIZE = 20;

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSessions(page, PAGE_SIZE);
      setSessions(data.sessions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    await deleteSession(id);
    void load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <header className="page-header">
        <h1>ReplayKit</h1>
        <span className="session-count">{total} session{total !== 1 ? 's' : ''}</span>
        <button className="btn-ghost" onClick={() => {
          localStorage.removeItem('rk_token');
          navigate('/login');
        }}>Sign out</button>
      </header>

      {loading ? (
        <p className="status-msg">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="status-msg">
          No sessions yet. Add <code>&lt;ReplayKitProvider&gt;</code> to your Next.js app to start recording.
        </p>
      ) : (
        <table className="sessions-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr
                key={s.id}
                className="session-row"
                onClick={() => navigate(`/sessions/${s.id}`)}
              >
                <td className="cell-url" title={s.startUrl}>{s.startUrl}</td>
                <td className="cell-date">{formatDate(s.startedAt)}</td>
                <td>{formatDuration(s.durationMs)}</td>
                <td>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={e => void handleDelete(e, s.id)}
                    title="Delete"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-ghost"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >← Prev</button>
          <span>{page} / {totalPages}</span>
          <button
            className="btn-ghost"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
