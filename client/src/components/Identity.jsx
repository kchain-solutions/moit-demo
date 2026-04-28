import React, { useState, useEffect } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { CheckCircle, XCircle, Loader, Shield, Edit3, Search, AlertTriangle } from 'lucide-react';

export default function Identity() {
  const { user, peerOrgs, peerConnected, refresh, refreshKey } = useNode();
  const [orgs, setOrgs] = useState([]);
  const [verifying, setVerifying] = useState(null);
  const [regNum, setRegNum] = useState('');
  const [stage, setStage] = useState('input');
  const [steps, setSteps] = useState([]);
  const [failMsg, setFailMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { api.getOrgs().then(setOrgs).catch(() => {}); }, [refreshKey]);

  const STEP_LABELS = [
    'Checking registration number format...',
    'Querying national business registry...',
    'Verifying licence status (active / expired / suspended)...',
    'Generating DID on the ledger...',
    'Issuing Verifiable Credential & anchoring hash...',
  ];

  const runVerification = async () => {
    if (regNum.length < 4) return;
    setStage('running');
    setFailMsg('');
    setSteps(STEP_LABELS.map((t, i) => ({ text: t, status: i === 0 ? 'checking' : 'pending' })));

    let validation;
    try { validation = await api.validateCredential(regNum); } catch { validation = { valid: false, reason: 'Server error', failStep: 0 }; }

    const failAt = validation.valid ? -1 : (validation.failStep ?? 0);

    for (let i = 0; i < STEP_LABELS.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      if (i === failAt) {
        setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'failed' } : s));
        setFailMsg(validation.reason);
        setStage('failed');
        return;
      }
      setSteps(prev => prev.map((s, j) =>
        j === i ? { ...s, status: 'passed' } : j === i + 1 ? { ...s, status: 'checking' } : s
      ));
    }

    try {
      await api.registerOrg(verifying.id, regNum);
      setStage('passed');
      refresh();
    } catch (err) {
      setFailMsg(err.message);
      setStage('failed');
    }
  };

  const saveEdit = async (org) => {
    await api.updateOrg(org.id, { name: org.name, role: org.role });
    setEditing(null);
    refresh();
  };

  const filteredPeer = peerOrgs.filter(o => !searchQ || o.name.toLowerCase().includes(searchQ.toLowerCase()) || o.role.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="stack">
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Digital Identity</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>W3C DIDs anchored on ledger — verifiable credentials for each organisation</div>
      </div>

      {/* Org cards */}
      <div className="g3">
        {orgs.map(org => (
          <div className={`did-card ${org.verified ? 'v' : ''}`} key={org.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              {editing === org.id ? (
                <div style={{ flex: 1 }}>
                  <input value={org.name} onChange={e => setOrgs(orgs.map(o => o.id === org.id ? { ...o, name: e.target.value } : o))} onBlur={() => saveEdit(org)} style={{ fontSize: 14, fontWeight: 600, padding: '3px 8px', border: '1px solid var(--card-border)', borderRadius: 6, width: '100%', marginBottom: 4 }} />
                  <input value={org.role} onChange={e => setOrgs(orgs.map(o => o.id === org.id ? { ...o, role: e.target.value } : o))} onBlur={() => saveEdit(org)} style={{ fontSize: 11.5, padding: '2px 8px', border: '1px solid var(--card-border)', borderRadius: 6, width: '100%' }} />
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{org.name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{org.role}</p>
                </div>
              )}
              <button onClick={() => setEditing(editing === org.id ? null : org.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <Edit3 style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 10 }}>User: <span style={{ fontFamily: 'var(--mono)' }}>{org.username}</span></div>
            {org.verified ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <CheckCircle style={{ width: 15, height: 15, color: '#16a34a' }} />
                  <span className="pill pill-g">Verified</span>
                </div>
                <div className="did-str">{org.did}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Reg: <span style={{ fontFamily: 'var(--mono)' }}>{org.regNumber}</span></div>
              </>
            ) : (
              <button className="btn btn-p btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setVerifying(org); setRegNum(''); setStage('input'); setSteps([]); setFailMsg(''); }}>
                <Shield style={{ width: 12, height: 12 }} /> Register DID
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Credential reference */}
      <div className="card">
        <div className="card-h">
          <h3>Credential Validation Rules</h3>
          <span className="pill pill-a">For demo</span>
        </div>
        <div className="g2">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>✓ Will PASS verification</div>
            <table>
              <tbody>
                {[['BRN-123456', 'Valid business registration'], ['TIN-254789', 'Valid tax ID'], ['LEI-987654', 'Valid legal entity'], ['DUNS-456123', 'Valid DUNS number']].map(([code, desc]) => (
                  <tr key={code}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, paddingRight: 12 }}>{code}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>✗ Will FAIL verification</div>
            <table>
              <tbody>
                {[['BRN-000000', 'Denied — blacklisted'], ['BRN-111111', 'Expired licence'], ['BRN-222222', 'Suspended — under review'], ['X-anything', 'Invalid prefix']].map(([code, desc]) => (
                  <tr key={code}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, paddingRight: 12 }}>{code}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Peer organisations */}
      <div className="card">
        <div className="card-h">
          <h3>Peer Node Organisations</h3>
          <span className={`pill ${peerConnected ? 'pill-b' : 'pill-gr'}`}>{peerConnected ? `${peerOrgs.length} discovered` : 'Not connected'}</span>
        </div>
        {!peerConnected ? (
          <div className="empty" style={{ padding: 24 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Connect to a peer node from the Dashboard to discover their organisations.</div>
          </div>
        ) : (
          <>
            <div className="fg" style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input placeholder="Search peer organisations..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
            </div>
            {filteredPeer.length === 0 ? <div className="empty">No matches.</div> : (
              <table>
                <thead><tr><th>Organisation</th><th>Role</th><th>Node</th><th>DID</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredPeer.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.name}</td>
                      <td>{o.role}</td>
                      <td>{o.nodeName}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{o.did ? o.did.slice(0, 22) + '...' : '—'}</td>
                      <td>{o.verified ? <span className="pill pill-g">Verified</span> : <span className="pill pill-gr">Unverified</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Verification modal */}
      {verifying && (
        <div className="modal-bg" onClick={() => setVerifying(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Register {verifying.name}</h3>
            {stage === 'input' && (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Enter a business registration number. Use BRN-123456 to pass or BRN-000000 to see a denial.</p>
                <div className="fg"><label>Registration Number</label><input value={regNum} onChange={e => setRegNum(e.target.value)} placeholder="e.g. BRN-123456" autoFocus /></div>
                <div className="modal-act">
                  <button className="btn btn-s" onClick={() => setVerifying(null)}>Cancel</button>
                  <button className="btn btn-p" onClick={runVerification} disabled={regNum.length < 4}>Verify & Register</button>
                </div>
              </>
            )}
            {(stage === 'running' || stage === 'passed' || stage === 'failed') && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '10px 0' }}>
                  {steps.map((s, i) => (
                    <div className={`vs ${s.status}`} key={i} style={s.status === 'failed' ? { background: '#fef2f2', color: '#991b1b' } : {}}>
                      {s.status === 'checking' && <Loader style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                      {s.status === 'passed' && <CheckCircle style={{ width: 14, height: 14, flexShrink: 0, color: '#16a34a' }} />}
                      {s.status === 'failed' && <XCircle style={{ width: 14, height: 14, flexShrink: 0, color: '#ef4444' }} />}
                      {s.status === 'pending' && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--card-border)', flexShrink: 0 }} />}
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
                {stage === 'passed' && (
                  <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} /> Identity verified. DID issued and anchored on ledger.
                  </div>
                )}
                {stage === 'failed' && (
                  <div style={{ padding: 12, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', fontSize: 12.5, color: '#991b1b', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    <div><div style={{ fontWeight: 700, marginBottom: 2 }}>Verification Failed</div>{failMsg}</div>
                  </div>
                )}
                <div className="modal-act">
                  {stage === 'failed' && <button className="btn btn-s" onClick={() => { setStage('input'); setSteps([]); setFailMsg(''); }}>Try Again</button>}
                  <button className="btn btn-p" onClick={() => setVerifying(null)}>{stage === 'passed' ? 'Done' : 'Close'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
