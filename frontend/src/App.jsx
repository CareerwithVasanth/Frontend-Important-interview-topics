import { Link, Navigate, NavLink, Route, Routes } from 'react-router';
import { labs } from './labs/registry.js';

function Home() {
  return (
    <main className="container">
      <h1>Web Fundamentals Lab</h1>
      <p className="muted">End-to-end React + Node playground. Pick a lab:</p>
      <div className="grid">
        {labs.map((lab) => (
          <Link key={lab.slug} to={`/${lab.slug}`} className="card card-link">
            <h2>{lab.title}</h2>
            <p className="muted">{lab.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">🧪 Web Fundamentals Lab</Link>
        <nav>
          {labs.map((lab) => (
            <NavLink key={lab.slug} to={`/${lab.slug}`}>{lab.title}</NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        {labs.map(({ slug, Component }) => (
          <Route key={slug} path={`/${slug}/*`} element={<Component />} />
        ))}
        {/* Old URL from before Cookies moved into the Storage lab. */}
        <Route path="/cookies" element={<Navigate to="/storage/cookies" replace />} />
        <Route path="*" element={<main className="container"><p>Not found. <Link to="/">Go home</Link></p></main>} />
      </Routes>
    </>
  );
}
