export default function About() {
  return (
    <>
      <h1>About ReplayKit</h1>

      <div className="card">
        <h2>What is this?</h2>
        <div className="about-content">
          <p>
            ReplayKit is a lightweight, self-hosted session replay tool for internal Next.js applications.
            It records user interactions and lets developers replay exactly what a user experienced —
            without sending any data to external services.
          </p>
          <p>
            Everything runs in your own infrastructure. No third-party SDKs, no cloud dependencies,
            no data leaving your network.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>What gets recorded?</h2>
        <ul className="event-list">
          <li>
            <span className="event-badge eb-dom">DOM</span>
            Full page snapshot on load, then incremental mutations
          </li>
          <li>
            <span className="event-badge eb-mouse">Mouse</span>
            Cursor position (50 ms), clicks, and scroll position (100 ms)
          </li>
          <li>
            <span className="event-badge eb-dom">Input</span>
            Text field changes (password fields are always masked)
          </li>
          <li>
            <span className="event-badge eb-console">Console</span>
            console.log / warn / error / info — also still visible in devtools
          </li>
          <li>
            <span className="event-badge eb-network">Network</span>
            fetch + XHR: method, URL, status, duration — no request/response bodies
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>What is NOT recorded?</h2>
        <div className="about-content">
          <p>Password field values, request/response bodies, iframe content,
          localStorage/sessionStorage, cookies, or WebSocket messages.</p>
        </div>
      </div>
    </>
  );
}
