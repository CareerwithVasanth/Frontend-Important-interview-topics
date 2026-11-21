function StatusBadge({ result }) {
  if (result.status === 0) return <span className="badge err">network/CORS error</span>;
  return <span className={`badge ${result.ok ? 'ok' : 'err'}`}>{result.status}</span>;
}

function extras(data) {
  if (!data) return null;
  const { request: _req, response: _res, ...rest } = data;
  return Object.keys(rest).length ? rest : null;
}

// Shows one request/response round trip from the server's point of view.
export function ResultView({ result }) {
  if (!result) return null;
  const { data } = result;
  const rest = extras(data);

  return (
    <dl className="result">
      <div className="row small">
        <StatusBadge result={result} />
        <code>{result.method} {result.url}</code>
        <span className="muted">credentials: {result.credentials} · {result.ms}ms</span>
      </div>
      {result.error && <p className="warn">{result.error}</p>}
      {data?.request && (
        <>
          <dt>Cookie header the server received</dt>
          <dd><pre>{data.request.cookieHeader ?? '(none — browser sent no cookies)'}</pre></dd>
        </>
      )}
      {data?.response && (
        <>
          <dt>Set-Cookie the server sent back</dt>
          <dd><pre>{data.response.setCookie.length ? data.response.setCookie.join('\n') : '(none)'}</pre></dd>
        </>
      )}
      {data?.warnings?.map((w) => <p key={w} className="warn">⚠️ {w}</p>)}
      {rest && (
        <>
          <dt>Response body</dt>
          <dd><pre>{JSON.stringify(rest, null, 2)}</pre></dd>
        </>
      )}
    </dl>
  );
}

export function RequestLog({ log, onClear }) {
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Request log</h2>
        <button className="secondary" onClick={onClear}>Clear</button>
      </div>
      {log.length === 0 && <p className="muted small">No requests yet.</p>}
      <div className="log">
        {log.map((r) => (
          <details key={r.id}>
            <summary>
              <StatusBadge result={r} /> {r.at} {r.method} {r.url.replace(/^https?:\/\/[^/]+/, '')}
            </summary>
            <ResultView result={r} />
          </details>
        ))}
      </div>
    </section>
  );
}

export function Section({ title, lessons, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {lessons && (
        <div className="lesson">
          <ul>{lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}
      {children}
    </section>
  );
}
