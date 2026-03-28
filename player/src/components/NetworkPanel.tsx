import type { SessionEvent, NetworkData } from '../types';

interface NetworkPanelProps {
  events:         SessionEvent[];
  currentMs:      number;
  startTimestamp: number;
}

function statusClass(status: number) {
  if (status >= 500) return 'status-5xx';
  if (status >= 400) return 'status-4xx';
  if (status >= 300) return 'status-3xx';
  if (status >= 200) return 'status-2xx';
  return 'status-err';
}

export default function NetworkPanel({ events, currentMs, startTimestamp }: NetworkPanelProps) {
  const visible = events.filter(e => (e.timestamp - startTimestamp) <= currentMs);

  if (visible.length === 0) {
    return <p className="panel-empty">No network requests at this point in the session.</p>;
  }

  return (
    <table className="network-table">
      <thead>
        <tr>
          <th>Method</th>
          <th>Status</th>
          <th>Duration</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((ev, i) => {
          const d = ev.data as NetworkData;
          return (
            <tr key={i}>
              <td className="net-method">{d.method}</td>
              <td className={statusClass(d.status)}>{d.status || 'ERR'}</td>
              <td>{d.durationMs}ms</td>
              <td className="net-url" title={d.url}>{d.url}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
