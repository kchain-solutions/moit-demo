import React, { useState, useEffect } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { CheckCircle, XCircle, Loader, Shield, Edit3, Search, AlertTriangle } from 'lucide-react';

export default function Identity() {
  const { user, peerOrgs, peerConnected, refresh, refreshKey } = useNode();
  const [orgs, setOrgs] = useState([]);
  const [verifying, setVerifying] = useState(null);
  const [regNum, setRegNum] = useState('');
  const [stage, setStage] = useState('input'); // input | running | passed | failed
  const [steps, setSteps] = useState([]);
  const [failMsg, setFailMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { api.getOrgs().then(setOrgs).catch(() => {}); }, [refreshKey]);

  const STEP_LABELS = [
    'Checking registration number format...',
    'Querying national business registry...',
    'Verifying licence status (active / expired / suspended)...',
    'Generating DID on IOTA Tangle...',
    'Issuing Verifiable Credential & anchoring hash...',
  ];

  const runVerification = async () => {
    if (regNum.length < 4) return;
    setStage('running');
    setFailMsg('');
    setSteps(STEP_LABELS.map((t, i) => ({ text: t, status: i === 0 ? 'checking' : 'pending' })));

    // Pre-validate to know where it will fail
    let validation;
    try { validation = await api.validateCredential(regNum); } catch { validation = { valid: false, reason: 'Server error', failStep: 0 }; }

    const failAt = validation.valid ? -1 : (validation.failStep ?? 0);

    for (let i = 0; i < STEP_LABELS.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      if (i === failAt) {
        // This step fails
        setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'failed' } : s));
        setFailMsg(validation.reason);
        setStage('failed');
        return;
      }
      setSteps(prev => prev.map((s, j) =>
        j === i ? { ...s, status: 'passed' } : j === i + 1 ? { ...s, status: 'checking' } : s
      ));
    }

    // All passed — register
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
      {/* Org cards */}
      <div className="g3">
        {orgs.map(org => (
          <div className={`did-card ${org.verified ? 'v' : ''}`} key={org.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              {editing === org.id ? (
                <div style={{ flex: 1 }}>
                  <input value={org.name} onChange={e => setOrgs(orgs.map(o => o.id === org.id ? { ...o, name: e.target.value } : o))} onBlur={() => saveEdit(org)} style={{ fontSize: 14, fontWeight: 600, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%', marginBottom: 4 }} />
                  <input value={org.role} onChange={e => setOrgs(orgs.map(o => o.id === org.id ? { ...o, role: e.target.value } : o))} onBlur={() => saveEdit(org)} style={{ fontSize: 11, padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%' }} />
                </div>
              ) : (
                <div><h4 style={{ fontSize: 14, fontWeight: 600 }}>{org.name}</h4><p style={{ fontSize: 11, color: '#6b7280' }}>{org.role}</p></div>
              )}
              <button onClick={() => setEditing(editing === org.id ? null : org.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><Edit3 style={{ width: 13, height: 13 }} /></button>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>User: {org.username}</div>
            {org.verified ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}><CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} /><span className="pill pill-g">Verified</span></div>
                <div className="did-str">{org.did}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Reg: {org.regNumber}</div>
              </>
            ) : (
              <button className="btn btn-p btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setVerifying(org); setRegNum(''); setStage('input'); setSteps([]); setFailMsg(''); }}>
                <Shield style={{ width: 12, height: 12 }} /> Register DID
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Credential reference */}
      <div className="card">
        <div className="card-h"><h3>Credential Validation Rules</h3><span className="pill pill-a">For demo</span></div>
        <div className="g2">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>✓ Will PASS verification</div>
            <table><tbody>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>BRN-123456</td><td style={{ fontSize: 11, color: '#6b7280' }}>Valid business registration</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>TIN-254789</td><td style={{ fontSize: 11, color: '#6b7280' }}>Valid tax ID</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>LEI-987654</td><td style={{ fontSize: 11, color: '#6b7280' }}>Valid legal entity</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>DUNS-456123</td><td style={{ fontSize: 11, color: '#6b7280' }}>Valid DUNS number</td></tr>
            </tbody></table>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>✗ Will FAIL verification</div>
            <table><tbody>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>BRN-000000</td><td style={{ fontSize: 11, color: '#6b7280' }}>Denied — blacklisted</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>BRN-111111</td><td style={{ fontSize: 11, color: '#6b7280' }}>Expired licence</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>BRN-222222</td><td style={{ fontSize: 11, color: '#6b7280' }}>Suspended — under review</td></tr>
              <tr><td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>X-anything</td><td style={{ fontSize: 11, color: '#6b7280' }}>Invalid prefix</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      {/* Peer org discovery */}
      <div className="card">
        <div className="card-h"><h3>Peer Node Organisations</h3><span className={`pill ${peerConnected ? 'pill-b' : 'pill-gr'}`}>{peerConnected ? `${peerOrgs.length} discovered` : 'Not connected'}</span></div>
        {!peerConnected ? (
          <div className="empty" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Connect to a peer node from the Dashboard to discover their organisations.</div>
          </div>
        ) : (
          <>
            <div className="fg" style={{ marginBottom: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: '#9ca3af' }} />
                <input placeholder="Search peer organisations..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ paddingLeft: 30 }} />
              </div>
            </div>
            {filteredPeer.length === 0 ? <div className="empty">No matches.</div> : (
              <table><thead><tr><th>Organisation</th><th>Role</th><th>Node</th><th>DID</th><th>Status</th></tr></thead><tbody>
                {filteredPeer.map(o => (
                  <tr key={o.id}><td style={{ fontWeight: 500 }}>{o.name}</td><td>{o.role}</td><td>{o.nodeName}</td><td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{o.did ? o.did.slice(0, 20) + '...' : '\u2014'}</td><td>{o.verified ? <span className="pill pill-g">Verified</span> : <span className="pill pill-gr">Unverified</span>}</td></tr>
                ))}
              </tbody></table>
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
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Enter a business registration number. Use BRN-123456 to pass or BRN-000000 to see a denial.</p>
                <div className="fg"><label>Registration Number</label><input value={regNum} onChange={e => setRegNum(e.target.value)} placeholder="e.g. BRN-123456" autoFocus /></div>
                <div className="modal-act"><button className="btn btn-s" onClick={() => setVerifying(null)}>Cancel</button><button className="btn btn-p" onClick={runVerification} disabled={regNum.length < 4}>Verify & Register</button></div>
              </>
            )}
            {(stage === 'running' || stage === 'passed' || stage === 'failed') && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '10px 0' }}>
                  {steps.map((s, i) => (
                    <div className={`vs ${s.status}`} key={i} style={s.status === 'failed' ? { background: '#fef2f2', color: '#991b1b' } : {}}>
                      {s.status === 'checking' && <Loader style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                      {s.status === 'passed' && <CheckCircle style={{ width: 14, height: 14, flexShrink: 0 }} />}
                      {s.status === 'failed' && <XCircle style={{ width: 14, height: 14, flexShrink: 0, color: '#ef4444' }} />}
                      {s.status === 'pending' && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #d1d5db', flexShrink: 0 }} />}
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
                {stage === 'passed' && (
                  <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle style={{ width: 16, height: 16 }} /> Identity verified. DID issued and anchored on IOTA Tangle.
                  </div>
                )}
                {stage === 'failed' && (
                  <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    <div><div style={{ fontWeight: 600, marginBottom: 2 }}>Verification Failed</div>{failMsg}</div>
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
