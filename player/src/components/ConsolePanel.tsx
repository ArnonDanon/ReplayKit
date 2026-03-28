import type { SessionEvent, ConsoleData } from '../types';

interface ConsolePanelProps {
  events:         SessionEvent[];
  currentMs:      number;
  startTimestamp: number;
}

const LEVEL_CLASS: Record<string, string> = {
  log:   '',
  info:  'log-info',
  warn:  'log-warn',
  error: 'log-error',
};

export default function ConsolePanel({ events, currentMs, startTimestamp }: ConsolePanelProps) {
  const visible = events.filter(e => (e.timestamp - startTimestamp) <= currentMs);

  if (visible.length === 0) {
    return <p className="panel-empty">No console output at this point in the session.</p>;
  }

  return (
    <div className="console-panel">
      {visible.map((ev, i) => {
        const data = ev.data as ConsoleData;
        const ts   = new Date(ev.timestamp).toLocaleTimeString();
        return (
          <div key={i} className={`console-row ${LEVEL_CLASS[data.level] ?? ''}`}>
            <span className="log-ts">{ts}</span>
            <span className="log-level">[{data.level.toUpperCase()}]</span>
            <span className="log-args">{data.args.join(' ')}</span>
          </div>
        );
      })}
    </div>
  );
}
