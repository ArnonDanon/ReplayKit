import { useEffect, useRef } from 'react';

interface TimelineProps {
  durationMs:    number;
  currentMs:     number;
  playing:       boolean;
  speed:         1 | 2 | 4;
  onSeek:        (ms: number) => void;
  onPlayPause:   (playing: boolean) => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function Timeline({
  durationMs, currentMs, playing, speed,
  onSeek, onPlayPause, onSpeedChange,
}: TimelineProps) {
  const rafRef      = useRef<number | null>(null);
  const positionRef = useRef(currentMs);   // current position tracked in rAF loop
  const lastTickRef = useRef(0);

  // Keep positionRef in sync with external seeks (scrubbing)
  useEffect(() => { positionRef.current = currentMs; }, [currentMs]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    function tick(now: number) {
      const delta = (now - lastTickRef.current) * speed;
      lastTickRef.current = now;

      const next = Math.min(positionRef.current + delta, durationMs);
      positionRef.current = next;
      onSeek(next);

      if (next < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onPlayPause(false);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // currentMs intentionally excluded: positionRef tracks it without re-triggering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, durationMs]);

  const progress = durationMs > 0 ? (currentMs / durationMs) * 100 : 0;

  return (
    <div className="timeline">
      <button
        className="play-btn"
        onClick={() => onPlayPause(!playing)}
        disabled={durationMs === 0}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <span className="time-display">
        {formatTime(currentMs)} / {formatTime(durationMs)}
      </span>

      <input
        type="range"
        className="scrubber"
        min={0}
        max={durationMs}
        value={currentMs}
        onChange={e => {
          onPlayPause(false);
          onSeek(Number(e.target.value));
        }}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      />

      <div className="speed-group">
        {([1, 2, 4] as const).map(s => (
          <button
            key={s}
            className={`speed-btn ${speed === s ? 'active' : ''}`}
            onClick={() => onSpeedChange(s)}
          >{s}×</button>
        ))}
      </div>
    </div>
  );
}
