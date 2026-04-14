import React, { useState } from 'react';
import { useNode } from './context/NodeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Identity from './components/Identity';
import Consignments from './components/Consignments';
import Permissions from './components/Permissions';
import TangleExplorer from './components/TangleExplorer';
import { LayoutDashboard, Fingerprint, Package, Shield, Database, LogOut, Wifi, WifiOff } from 'lucide-react';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'identity', label: 'Identity & DIDs', icon: Fingerprint },
  { id: 'consignments', label: 'Consignments', icon: Package },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'tangle', label: 'Tangle Explorer', icon: Database },
];
const TITLES = { dashboard: 'Node Network', identity: 'Digital Identity', consignments: 'Consignments & Documents', permissions: 'Access Permissions', tangle: 'IOTA Tangle Explorer' };

export default function App() {
  const { user, nodeInfo, peerConnected, logout } = useNode();
  const [page, setPage] = useState('dashboard');

  if (!user) return <Login />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sb-brand"><h1>ADAPT</h1><p>Distributed Trade Platform</p></div>
        <nav className="sb-nav">
          {PAGES.map(p => (
            <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => setPage(p.id)}>
              <p.icon /> {p.label}
            </button>
          ))}
        </nav>
        <div className="sb-ft">
          <div className="ub">{user.name}</div>
          <div className="nl"><div className={`dot dot-on`} /> {nodeInfo?.nodeName || 'Node'}</div>
          <div className="nl">
            {peerConnected ? <><Wifi style={{ width: 12, height: 12, color: '#4ade80' }} /> <span style={{ color: '#86efac' }}>Peer synced</span></> : <><WifiOff style={{ width: 12, height: 12, color: '#9ca3af' }} /> <span style={{ color: '#9ca3af' }}>No peer</span></>}
          </div>
          <button className="btn btn-sm" onClick={logout} style={{ marginTop: 10, color: '#fca5a5', background: 'rgba(255,255,255,.08)', width: '100%', justifyContent: 'center', border: 'none' }}>
            <LogOut style={{ width: 12, height: 12 }} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="hdr">
          <h2>{TITLES[page]}</h2>
          <div className="hdr-meta">
            <span className={`badge ${peerConnected ? 'badge-g' : 'badge-r'}`}>{peerConnected ? 'Nodes Connected' : 'Peer Offline'}</span>
          </div>
        </header>
        <div className="cnt">
          {page === 'dashboard' && <Dashboard />}
          {page === 'identity' && <Identity />}
          {page === 'consignments' && <Consignments />}
          {page === 'permissions' && <Permissions />}
          {page === 'tangle' && <TangleExplorer />}
        </div>
      </main>
    </div>
  );
}
