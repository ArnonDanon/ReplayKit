import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, getEvents } from '../api';
import type { Session, SessionEvent } from '../types';
import Player       from '../components/Player';
import Timeline     from '../components/Timeline';
import ConsolePanel from '../components/ConsolePanel';
import NetworkPanel from '../components/NetworkPanel';

type Tab = 'console' | 'network';

export default function SessionDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [session,   setSession]   = useState<Session | null>(null);
  const [events,    setEvents]    = useState<SessionEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [speed,     setSpeed]     = useState<1 | 2 | 4>(1);
  const [tab,       setTab]       = useState<Tab>('console');

  useEffect(() => {
    if (!id) return;
    Promise.all([getSession(id), getEvents(id)]).then(([s, e]) => {
      setSession(s);
      setEvents(e);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="page"><p className="status-msg">Loading session…</p></div>;
  if (!session) return <div className="page"><p className="status-msg error">Session not found.</p></div>;

  const durationMs    = session.durationMs ?? 0;
  const consoleEvents = events.filter(e => e.type === 'console');
  const networkEvents = events.filter(e => e.type === 'network');

  return (
    <div className="detail-page">

      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Sessions</button>
        <div className="session-meta">
          <span className="meta-url" title={session.startUrl}>{session.startUrl}</span>
          <span className="meta-date">{new Date(session.startedAt).toLocaleString()}</span>
          <span className={`badge badge-${session.status}`}>{session.status}</span>
        </div>
      </header>

      <div className="player-area">
        <Player events={events} currentMs={currentMs} />
      </div>

      <div className="timeline-area">
        <Timeline
          durationMs={durationMs}
          currentMs={currentMs}
          playing={playing}
          speed={speed}
          onSeek={setCurrentMs}
          onPlayPause={setPlaying}
          onSpeedChange={setSpeed}
        />
      </div>

      <div className="panels-area">
        <div className="tabs">
          <button
            className={`tab ${tab === 'console' ? 'active' : ''}`}
            onClick={() => setTab('console')}
          >Console ({consoleEvents.length})</button>
          <button
            className={`tab ${tab === 'network' ? 'active' : ''}`}
            onClick={() => setTab('network')}
          >Network ({networkEvents.length})</button>
        </div>
        <div className="panel-content">
          {tab === 'console'
            ? <ConsolePanel events={consoleEvents} currentMs={currentMs} startTimestamp={events[0]?.timestamp ?? 0} />
            : <NetworkPanel events={networkEvents} currentMs={currentMs} startTimestamp={events[0]?.timestamp ?? 0} />
          }
        </div>
      </div>

    </div>
  );
}
