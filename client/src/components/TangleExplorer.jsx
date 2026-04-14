import React, { useState } from 'react';
import { useNode } from '../context/NodeContext';
import { Database, Fingerprint, FileText, Shield, Wifi } from 'lucide-react';

const ICONS = { identity: Fingerprint, document: FileText, permission: Shield, network: Wifi };
const COLORS = { identity: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' }, document: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }, permission: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }, network: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' } };

export default function TangleExplorer() {
  const { tangleLog } = useNode();
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? tangleLog : tangleLog.filter(e => e.type === filter);
  const counts = { all: tangleLog.length, identity: tangleLog.filter(e => e.type === 'identity').length, document: tangleLog.filter(e => e.type === 'document').length, permission: tangleLog.filter(e => e.type === 'permission').length, network: tangleLog.filter(e => e.type === 'network').length };

  return (
    <div className="stack">
      <div className="g4">
        {[{ k: 'all', l: 'All', I: Database }, { k: 'identity', l: 'Identity', I: Fingerprint }, { k: 'document', l: 'Documents', I: FileText }, { k: 'permission', l: 'Permissions', I: Shield }].map(f => (
          <div key={f.k} className="stat" onClick={() => setFilter(f.k)} style={{ cursor: 'pointer', border: filter === f.k ? '2px solid #22c55e' : '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><f.I style={{ width: 12, height: 12, color: '#6b7280' }} /><span className="l" style={{ margin: 0 }}>{f.l}</span></div>
            <div className="v">{counts[f.k]}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-h"><h3>Immutable Ledger</h3><span className="pill pill-g"><Database style={{ width: 9, height: 9 }} /> {filtered.length} records</span></div>
        {filtered.length === 0 ? <div className="empty">No events yet.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((e, i) => {
              const c = COLORS[e.type] || COLORS.network;
              const Icon = ICONS[e.type] || Database;
              return (
                <div key={e.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: '0 6px 6px 0', opacity: 0, animation: `fadeIn .25s ${i * .02}s forwards` }}>
                  <div style={{ minWidth: 65 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#9ca3af' }}>{new Date(e.timestamp).toLocaleTimeString()}</div>
                    <Icon style={{ width: 14, height: 14, color: c.border, marginTop: 4 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.5px', color: c.text }}>{e.type}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{e.action}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.4 }}>{e.details}</div>
                    {e.did && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#16a34a', marginTop: 3 }}>DID: {e.did}</div>}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Hash: {e.hash?.slice(0, 18)}... — Actor: {e.actor}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
