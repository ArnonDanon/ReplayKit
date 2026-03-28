interface MouseCursorProps {
  x:         number;
  y:         number;
  showClick: boolean;
}

export default function MouseCursor({ x, y, showClick }: MouseCursorProps) {
  return (
    <div
      className={`mouse-cursor ${showClick ? 'clicking' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      aria-hidden="true"
    >
      {/* CSS cursor arrow */}
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 1L1 15L5 11L8 18L10 17L7 10L12 10Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {showClick && <span className="click-ripple" />}
    </div>
  );
}
