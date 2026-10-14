import { useEffect, useState } from 'react';
import Editor from './Editor.jsx';
import Manage from './Manage.jsx';

// Hash routes: #/invoices (list), #/new, #/edit/<id>
const parse = (hash) => {
  const m = hash.match(/^#\/edit\/(.+)$/);
  if (m) return { page: 'edit', id: decodeURIComponent(m[1]) };
  if (hash === '#/invoices') return { page: 'manage' };
  return { page: 'new', key: hash };
};

export default function App() {
  const [route, setRoute] = useState(() => parse(location.hash));
  const [newKey, setNewKey] = useState(0);

  useEffect(() => {
    const onHash = () => setRoute(parse(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (hash) => {
    if (hash === '#/new') setNewKey((k) => k + 1);
    if (location.hash === hash) setRoute(parse(hash));
    else location.hash = hash;
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <header className="topbar">
        <img src="/round-logics-logo.svg" alt="Round Logics" className="logo" />
        <div className="topbar-text">
          <h1>T&amp;C + Invoice Generator</h1>
        </div>
        <nav className="tabs">
          <button className={route.page !== 'manage' ? 'tab active' : 'tab'} onClick={() => navigate('#/new')}>
            New invoice
          </button>
          <button className={route.page === 'manage' ? 'tab active' : 'tab'} onClick={() => navigate('#/invoices')}>
            Manage invoices
          </button>
        </nav>
      </header>

      {route.page === 'manage' && <Manage navigate={navigate} />}
      {route.page === 'edit' && <Editor key={route.id} id={route.id} navigate={navigate} />}
      {route.page === 'new' && <Editor key={`new-${newKey}`} navigate={navigate} />}
    </div>
  );
}
