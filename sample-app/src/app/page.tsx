'use client';

import { useState } from 'react';

interface TodoResult {
  userId: number;
  id:     number;
  title:  string;
  completed: boolean;
}

export default function Home() {
  const [count,       setCount]       = useState(0);
  const [text,        setText]        = useState('');
  const [todo,        setTodo]        = useState<TodoResult | null>(null);
  const [fetching,    setFetching]    = useState(false);
  const [fetchError,  setFetchError]  = useState('');
  const [logLines,    setLogLines]    = useState<{ level: string; msg: string }[]>([]);

  // ── Network demo ────────────────────────────────────────────────────────
  async function handleFetch() {
    setFetching(true);
    setFetchError('');
    setTodo(null);
    try {
      const res  = await fetch('/api/todos');
      const data = await res.json() as TodoResult;
      setTodo(data);
    } catch {
      setFetchError('Request failed');
    } finally {
      setFetching(false);
    }
  }

  // ── Console demo ─────────────────────────────────────────────────────────
  function handleLog() {
    const msg = `counter=${count}, text="${text}"`;
    console.log('[sample-app] User state snapshot:', msg);
    console.warn('[sample-app] This is a demo warning');
    console.error('[sample-app] This is a demo error');
    setLogLines(prev => [
      ...prev,
      { level: 'log',   msg: `[LOG]   counter=${count}, text="${text}"` },
      { level: 'warn',  msg: '[WARN]  This is a demo warning' },
      { level: 'error', msg: '[ERROR] This is a demo error' },
    ]);
  }

  return (
    <>
      <h1>Home — Interactive Demo</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32 }}>
        Interact with the elements below. Open the ReplayKit player to watch this session replay.
      </p>

      {/* Counter */}
      <div className="card">
        <h2>Counter — generates click events</h2>
        <div className="counter-value">{count}</div>
        <div className="btn-group">
          <button className="btn" onClick={() => setCount(c => c + 1)}>+ Increment</button>
          <button className="btn btn-outline" onClick={() => setCount(c => c - 1)}>− Decrement</button>
          <button className="btn btn-outline" onClick={() => setCount(0)}>Reset</button>
        </div>
      </div>

      {/* Text input */}
      <div className="card">
        <h2>Text input — generates input events</h2>
        <input
          className="input"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type something here…"
        />
        {text && (
          <div className="result-box">You typed: {text}</div>
        )}
      </div>

      {/* Network */}
      <div className="card">
        <h2>Network — generates a network event</h2>
        <button className="btn" onClick={() => void handleFetch()} disabled={fetching}>
          {fetching ? 'Fetching…' : 'Fetch a todo from /api/todos'}
        </button>
        {fetchError && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{fetchError}</p>}
        {todo && (
          <div className="result-box">{JSON.stringify(todo, null, 2)}</div>
        )}
      </div>

      {/* Console */}
      <div className="card">
        <h2>Console — generates console events</h2>
        <button className="btn" onClick={handleLog}>
          Emit log + warn + error
        </button>
        {logLines.length > 0 && (
          <div className="log-output">
            {logLines.map((l, i) => (
              <div key={i} className={`log-line ${l.level}`}>{l.msg}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
