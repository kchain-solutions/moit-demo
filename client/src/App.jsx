import React, { useState } from 'react';
import { useNode } from './context/NodeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Identity from './components/Identity';
import Consignments from './components/Consignments';
import Permissions from './components/Permissions';
import TangleExplorer from './components/TangleExplorer';
import { LayoutDashboard, FileStack, Fingerprint, Shield, Activity, LogOut, Wifi, WifiOff, HelpCircle, Settings, Globe } from 'lucide-react';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'consignments', label: 'Consignments', icon: FileStack },
  { id: 'identity', label: 'Identity', icon: Fingerprint },
  { id: 'permissions', label: 'Access Control', icon: Shield },
  { id: 'tangle', label: 'Analytics', icon: Activity },
];

export default function App() {
  const { user, nodeInfo, peerConnected, logout } = useNode();
  const [page, setPage] = useState('dashboard');
  const [searchQ, setSearchQ] = useState('');

  if (!user) return <Login />;

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const PAGE_TITLES = {
    dashboard: nodeInfo?.nodeName || 'Dashboard',
    consignments: 'Consignments',
    identity: 'Digital Identity',
    permissions: 'Access Control',
    tangle: 'Analytics',
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-icon">
            <Globe />
          </div>
          <div className="sb-brand-text">
            <h1>ADAPT</h1>
            <p>Global Trade Ops</p>
          </div>
        </div>

        <nav className="sb-nav">
          {PAGES.map(p => (
            <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => setPage(p.id)}>
              <p.icon /> {p.label}
            </button>
          ))}
        </nav>

        <div className="sb-ft">
          <div className="entity-status">
            <div className="es-label">Entity Status</div>
            <div className="es-value">
              <div className={`dot ${peerConnected ? 'dot-on' : 'dot-off'}`} />
              <span>{user.name}</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#475569', marginTop: 3, paddingLeft: 13 }}>
              {peerConnected ? 'Peer synced' : 'Local only'} — {nodeInfo?.nodeName || 'Node'}
            </div>
          </div>
          <div className="sb-links">
            <button>
              {peerConnected
                ? <><Wifi style={{ width: 13, height: 13, color: '#22c55e' }} /> <span style={{ color: '#94a3b8' }}>Node Online</span></>
                : <><WifiOff style={{ width: 13, height: 13 }} /> <span>No Peer</span></>}
            </button>
            <button onClick={logout}>
              <LogOut style={{ width: 13, height: 13 }} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="hdr">
          <div className="hdr-left">
            <div className="hdr-org">{user.name}</div>
            <div className="hdr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="Search consignments, documents, entities..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
          </div>
          <div className="hdr-right">
            <button className="hdr-bell">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <div className="hdr-user">
              <div className="hdr-user-info" style={{ textAlign: 'right' }}>
                <div className="name">{user.name}</div>
                <div className="sub">{user.role} — {nodeInfo?.nodeName}</div>
              </div>
              <div className="avatar">{initials}</div>
            </div>
          </div>
        </header>

        <div className="cnt">
          {page === 'dashboard' && <Dashboard searchQ={searchQ} />}
          {page === 'consignments' && <Consignments searchQ={searchQ} />}
          {page === 'identity' && <Identity />}
          {page === 'permissions' && <Permissions />}
          {page === 'tangle' && <TangleExplorer />}
        </div>
      </main>
    </div>
  );
}
