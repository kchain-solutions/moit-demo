import React, { useState, useEffect } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { Wifi, WifiOff, Radio, Link2, Unlink, Server, Search } from 'lucide-react';

export default function Dashboard() {
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
    try { await api.connectNode(); refresh(); } catch (e) {}
    setConnecting(false);
    setShowDiscover(false);
  };

  const handleDisconnect = async () => {
    await api.disconnectNode();
    refresh();
  };

  const verified = orgs.filter(o => o.verified).length;

  return (
    <div className="stack">
      <div className="g4">
        <div className="stat"><div className="l">Local orgs</div><div className="v">{orgs.length}</div><div className="s">{verified} verified</div></div>
        <div className="stat"><div className="l">Peer orgs</div><div className="v">{peerConnected ? peerOrgs.length : '\u2014'}</div><div className="s">{peerConnected ? 'discoverable' : 'not connected'}</div></div>
        <div className="stat"><div className="l">Consignments</div><div className="v">{consignments.length}</div><div className="s">visible to you</div></div>
        <div className="stat"><div className="l">Tangle events</div><div className="v">{tangleLog.length}</div><div className="s">immutable</div></div>
      </div>

      {/* Node connection card */}
      <div className="card">
        <div className="card-h">
          <h3>Node-to-Node Network</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {peerConnected ? (
              <button className="btn btn-sm btn-d" onClick={handleDisconnect}><Unlink style={{ width: 12, height: 12 }} /> Disconnect</button>
            ) : (
              <button className="btn btn-sm btn-p" onClick={() => setShowDiscover(true)}><Radio style={{ width: 12, height: 12 }} /> Connect to Node</button>
            )}
          </div>
        </div>

        <div className="nv" style={{ height: peerConnected ? 240 : 180 }}>
          {/* This node */}
          <div className="nb" style={{ left: 20, top: 20 }}>
            <h4>{nodeInfo?.nodeName || 'This Node'}</h4>
            <p>{nodeInfo?.nodeIp}</p>
            {orgs.map(o => (
              <div key={o.id} style={{ fontSize: 10, color: '#6b7280', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: o.verified ? '#22c55e' : '#d1d5db' }} />
                {o.name}
              </div>
            ))}
          </div>

          {/* Tangle */}
          <div className="nb tgl" style={{ left: '50%', top: peerConnected ? 80 : 60, transform: 'translateX(-50%)' }}>
            <h4>IOTA Tangle</h4>
            <p>{tangleLog.length} records</p>
          </div>

          {/* Peer node (only visible when connected) */}
          {peerConnected ? (
            <div className="nb" style={{ right: 20, top: 20 }}>
              <h4>{discoverable[0]?.name || 'Peer Node'}</h4>
              <p>{discoverable[0]?.ip || '...'}</p>
              {peerOrgs.map(o => (
                <div key={o.id} style={{ fontSize: 10, color: '#6b7280', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: o.verified ? '#22c55e' : '#d1d5db' }} />
                  {o.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'absolute', right: 20, top: 20, width: 140, padding: '16px 14px', background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 8, textAlign: 'center' }}>
              <Server style={{ width: 20, height: 20, color: '#d1d5db', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 11, color: '#9ca3af' }}>No peer connected</div>
              <div style={{ fontSize: 10, color: '#d1d5db' }}>Click "Connect" above</div>
            </div>
          )}

          {/* Connection lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <line x1="160" y1="55" x2="270" y2={peerConnected ? 100 : 80} stroke={peerConnected ? '#22c55e' : '#d1d5db'} strokeWidth="1.5" strokeDasharray={peerConnected ? '' : '6 4'} />
            {peerConnected && <>
              <line x1="410" y1="100" x2="520" y2="55" stroke="#22c55e" strokeWidth="1.5" />
              <line x1="160" y1="40" x2="520" y2="40" stroke="#16a34a" strokeWidth="1" strokeDasharray="4 4">
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
              </line>
              <text x="340" y="32" textAnchor="middle" fontSize="9" fill="#16a34a" fontFamily="var(--mono)">P2P SYNC ACTIVE</text>
            </>}
          </svg>
        </div>
      </div>

      {/* Recent tangle */}
      <div className="card">
        <div className="card-h"><h3>Recent Tangle Activity</h3></div>
        {tangleLog.length === 0 ? <div className="empty">No activity yet.</div> : (
          tangleLog.slice(0, 8).map(e => (
            <div className={`te ${e.type === 'permission' ? 'perm' : e.type === 'identity' ? 'id' : e.type === 'network' ? 'net' : ''}`} key={e.id}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#9ca3af', minWidth: 65 }}>{new Date(e.timestamp).toLocaleTimeString()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.5px', color: '#9ca3af' }}>{e.type} \u2014 {e.action}</div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{e.details}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#16a34a', marginTop: 2 }}>{e.hash?.slice(0, 14)}...</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Discovery modal */}
      {showDiscover && (
        <div className="modal-bg" onClick={() => setShowDiscover(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Discover & Connect to Nodes</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Available nodes on the network. Connect to exchange organisation directories and enable cross-node data sharing.</p>
            {discoverable.length === 0 ? (
              <div className="empty">No discoverable nodes found. Ensure the peer node is running.</div>
            ) : (
              discoverable.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                  <Server style={{ width: 24, height: 24, color: '#16a34a' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{n.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)' }}>{n.ip}</div>
                  </div>
                  {n.connected ? (
                    <span className="pill pill-g">Connected</span>
                  ) : (
                    <button className="btn btn-p btn-sm" onClick={handleConnect} disabled={connecting}>
                      <Link2 style={{ width: 12, height: 12 }} /> {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
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
