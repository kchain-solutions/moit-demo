import React, { useState, useEffect } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { FileStack, TrendingUp, Activity, Wifi, WifiOff, Radio, Link2, Unlink, Server, BarChart2, AlertTriangle } from 'lucide-react';

function fmtValue(val, currency = 'USD') {
  if (!val) return '—';
  const n = Number(val);
  const sym = currency === 'EUR' ? '€' : '$';
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
  return `${sym}${n.toLocaleString()}`;
}

function StatusPill({ status }) {
  const map = {
    'In Transit': 'pill pill-dot pill-transit',
    'Customs': 'pill pill-dot pill-customs',
    'Delivered': 'pill pill-dot pill-delivered',
    'Submitted': 'pill pill-dot pill-submitted',
    'Draft': 'pill pill-dot pill-draft',
    'Released': 'pill pill-dot pill-released',
    'Under Review': 'pill pill-dot pill-review',
  };
  return <span className={map[status] || 'pill pill-dot pill-draft'}>{status || 'Draft'}</span>;
}

function DocsPill({ count, total }) {
  const cls = count === total ? 'docs-pill docs-complete' : count < total / 2 ? 'docs-pill docs-low' : 'docs-pill docs-partial';
  return <span className={cls}>{count}/{total}</span>;
}

export default function Dashboard({ searchQ = '' }) {
  const { nodeInfo, peerConnected, peerOrgs, tangleLog, user, refreshKey, refresh } = useNode();
  const [orgs, setOrgs] = useState([]);
  const [consignments, setConsignments] = useState([]);
  const [discoverable, setDiscoverable] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);

  useEffect(() => {
    api.getOrgs().then(setOrgs).catch(() => {});
    api.getConsignments(user.id).then(setConsignments).catch(() => {});
    api.discoverNodes().then(setDiscoverable).catch(() => {});
  }, [user.id, refreshKey, peerConnected]);

  const handleConnect = async () => {
    setConnecting(true);
    try { await api.connectNode(); refresh(); } catch {}
    setConnecting(false);
    setShowDiscover(false);
  };

  const handleDisconnect = async () => {
    await api.disconnectNode();
    refresh();
  };

  const verified = orgs.filter(o => o.verified).length;
  const totalValue = consignments.reduce((s, c) => s + (c.totalValue || 0), 0);
  const errorCount = consignments.filter(c => c.errorType).length;

  const filtered = searchQ
    ? consignments.filter(c =>
        c.ucr?.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.product?.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.exporter?.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.importer?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : consignments;

  const recent = filtered.slice(0, 8);

  return (
    <div className="stack">
      {/* Stats */}
      <div className="g4">
        <div className="stat-card">
          <div className="stat-icon blue"><FileStack /></div>
          <div className="stat-label">Active Consignments</div>
          <div className="stat-value">{consignments.length}</div>
          <div className="stat-sub">{verified} orgs verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp /></div>
          <div className="stat-label">Trade Volume</div>
          <div className="stat-value">{fmtValue(totalValue)}</div>
          <div className="stat-sub">across {consignments.length} shipments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Activity /></div>
          <div className="stat-label">Tangle Events</div>
          <div className="stat-value">{tangleLog.length}</div>
          <div className="stat-sub">immutable records</div>
        </div>
        <div className="stat-card dark">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', marginBottom: 8 }}>Entity Trust Score</div>
          <div className="trust-score-wrap">
            <span className="trust-num">{verified > 0 ? 87 : '—'}</span>
            {verified > 0 && <span className="trust-grade">A</span>}
          </div>
          <div className="trust-bar-track"><div className="trust-bar-fill" style={{ width: verified > 0 ? '87%' : '0%' }} /></div>
          <div className="trust-sub">{verified > 0 ? 'Top 5% of AfCFTA Exporters' : 'Register a DID to get a score'}</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }}>

        {/* Recent Consignments table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Consignments</h3>
              <span className="live-badge"><span className="live-dot" />LIVE TRACKER</span>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>View All</span>
          </div>
          {recent.length === 0 ? (
            <div className="empty">No consignments visible. Create one or connect to a peer node.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route & Product</th>
                  <th>Docs</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="ucr-ref">{c.ucr}</div>
                      <div className="ucr-date">{c.shipDate || new Date(c.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      {c.fromCountry && c.toCountry ? (
                        <div className="route-display">
                          <span>{c.fromCountry}</span>
                          <span className="route-arrow">→</span>
                          <span>{c.toCountry}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{c.creatorOrgName}</div>
                      )}
                      <div className="route-product">{c.product || c.description || '—'}</div>
                    </td>
                    <td>
                      <DocsPill count={c.documentCount || 0} total={6} />
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                      {c.errorType && <span title={c.errorDescription} style={{ marginLeft: 5 }}><AlertTriangle style={{ width: 12, height: 12, color: '#a16207', verticalAlign: 'middle' }} /></span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="value-cell">{fmtValue(c.totalValue, c.currency)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel: Network + Tangle Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Node network */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Wifi style={{ width: 15, height: 15, color: peerConnected ? '#22c55e' : '#94a3b8' }} />
                Node Network
              </h3>
              {peerConnected
                ? <button className="btn btn-sm btn-d" onClick={handleDisconnect}><Unlink style={{ width: 11, height: 11 }} /> Disconnect</button>
                : <button className="btn btn-sm btn-p" onClick={() => setShowDiscover(true)}><Radio style={{ width: 11, height: 11 }} /> Connect</button>}
            </div>
            <div className="nv" style={{ height: peerConnected ? 190 : 150, borderRadius: 0, border: 'none' }}>
              <div className="nb" style={{ left: 12, top: 16 }}>
                <h4>{nodeInfo?.nodeName || 'This Node'}</h4>
                <p>{nodeInfo?.nodeIp}</p>
                {orgs.map(o => (
                  <div key={o.id} style={{ fontSize: 9.5, color: '#6b7280', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: o.verified ? '#22c55e' : '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
                    {o.name}
                  </div>
                ))}
              </div>
              <div className="nb tgl" style={{ left: '50%', top: peerConnected ? 70 : 50, transform: 'translateX(-50%)' }}>
                <h4>IOTA Tangle</h4>
                <p>{tangleLog.length} records</p>
              </div>
              {peerConnected ? (
                <div className="nb" style={{ right: 12, top: 16 }}>
                  <h4>{discoverable[0]?.name || 'Peer Node'}</h4>
                  <p>{discoverable[0]?.ip || '...'}</p>
                  {peerOrgs.map(o => (
                    <div key={o.id} style={{ fontSize: 9.5, color: '#6b7280', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: o.verified ? '#22c55e' : '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
                      {o.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ position: 'absolute', right: 12, top: 16, width: 120, padding: '14px 12px', background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 8, textAlign: 'center' }}>
                  <Server style={{ width: 18, height: 18, color: '#d1d5db', margin: '0 auto 5px' }} />
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>No peer</div>
                </div>
              )}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <line x1="142" y1="44" x2="200" y2={peerConnected ? 82 : 62} stroke={peerConnected ? '#22c55e' : '#d1d5db'} strokeWidth="1.5" strokeDasharray={peerConnected ? '' : '5 4'} />
                {peerConnected && <>
                  <line x1="260" y1="82" x2="318" y2="44" stroke="#22c55e" strokeWidth="1.5" />
                  <line x1="142" y1="34" x2="318" y2="34" stroke="#16a34a" strokeWidth="1" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                  </line>
                  <text x="230" y="26" textAnchor="middle" fontSize="8" fill="#16a34a" fontFamily="var(--mono)">P2P ACTIVE</text>
                </>}
              </svg>
            </div>
            {errorCount > 0 && (
              <div style={{ padding: '8px 16px', background: '#fefce8', borderTop: '1px solid #fde68a', display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, color: '#a16207' }}>
                <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
                <span><strong>{errorCount} consignment{errorCount > 1 ? 's' : ''}</strong> flagged for reconciliation</span>
              </div>
            )}
          </div>

          {/* Recent Tangle Activity */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity style={{ width: 15, height: 15, color: 'var(--amber)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h3>
            </div>
            <div style={{ padding: '10px 14px', maxHeight: 300, overflowY: 'auto' }}>
              {tangleLog.length === 0 ? (
                <div className="empty" style={{ padding: 20 }}>No activity yet.</div>
              ) : (
                tangleLog.slice(0, 6).map(e => (
                  <div key={e.id} className={`te ${e.type === 'permission' ? 'perm' : e.type === 'identity' ? 'id' : e.type === 'network' ? 'net' : ''}`} style={{ animation: 'fadeIn .2s forwards' }}>
                    <div style={{ minWidth: 52 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: '#94a3b8' }}>{new Date(e.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.5px', color: '#94a3b8', marginBottom: 1 }}>{e.type} — {e.action}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{e.details}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: '#16a34a', marginTop: 2 }}>{e.hash?.slice(0, 14)}...</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discovery modal */}
      {showDiscover && (
        <div className="modal-bg" onClick={() => setShowDiscover(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Discover & Connect to Nodes</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>Available nodes on the network. Connect to exchange organisation directories and enable cross-node data sharing.</p>
            {discoverable.length === 0 ? (
              <div className="empty">No discoverable nodes found. Ensure the peer node is running.</div>
            ) : (
              discoverable.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--card-border)', borderRadius: 10, marginBottom: 8 }}>
                  <Server style={{ width: 22, height: 22, color: '#16a34a' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{n.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{n.ip}</div>
                  </div>
                  {n.connected
                    ? <span className="pill pill-g pill-dot">Connected</span>
                    : <button className="btn btn-p btn-sm" onClick={handleConnect} disabled={connecting}><Link2 style={{ width: 11, height: 11 }} />{connecting ? 'Connecting...' : 'Connect'}</button>}
                </div>
              ))
            )}
            <div className="modal-act"><button className="btn btn-s" onClick={() => setShowDiscover(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
