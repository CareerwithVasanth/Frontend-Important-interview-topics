export function EventLog({ title = 'What just happened', entries, onClear, empty }) {
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{title}</h2>
        <button className="secondary" onClick={onClear}>Clear</button>
      </div>
      {entries.length === 0 && <p className="muted small">{empty ?? 'Nothing yet.'}</p>}
      <ol className="event-log">
        {entries.map((e) => (
          <li key={e.id}>
            <span className="event-icon">{e.icon}</span>
            <span>
              <span className="muted">{e.at}</span> {e.text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
