import React, { useState, useEffect, useRef } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { Plus, Upload, Send, Download, FileText, Lock, Package, X } from 'lucide-react';

export default function Consignments() {
  const { user, peerOrgs, refresh, refreshKey, peerConnected } = useNode();
  const [consignments, setConsignments] = useState([]);
  const [selectedC, setSelectedC] = useState(null);
  const [docs, setDocs] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    api.getConsignments(user.id).then(setConsignments).catch(() => {});
    api.getAllOrgs().then(setAllOrgs).catch(() => {});
  }, [user.id, refreshKey]);

  useEffect(() => {
    if (selectedC) api.getDocuments(user.id, selectedC.id).then(setDocs).catch(() => {});
    else setDocs([]);
  }, [selectedC, user.id, refreshKey]);

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Your Consignments (Digital Twins)</h3>
        <button className="btn btn-p" onClick={() => setShowCreate(true)}><Plus style={{ width: 13, height: 13 }} /> New Consignment</button>
      </div>

      {consignments.length === 0 ? (
        <div className="card"><div className="empty"><Package style={{ width: 28, height: 28, opacity: .3, marginBottom: 8 }} /><p>No consignments visible. Create one or have another org share one with you.</p></div></div>
      ) : (
        <div className="g3">
          {consignments.map(c => (
            <div className="csg-card" key={c.id} onClick={() => setSelectedC(c)} style={selectedC?.id === c.id ? { borderColor: '#16a34a', background: '#f0fdf4' } : {}}>
              <div className="ucr">{c.ucr}</div>
              <div className="ids">
                {c.commercialInvoiceNo && <span>CI: {c.commercialInvoiceNo}</span>}
                {c.commercialInvoiceNo && c.exportDeclarationNo && ' | '}
                {c.exportDeclarationNo && <span>ED: {c.exportDeclarationNo}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{c.description || 'No description'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span className="pill pill-b">{c.documentCount || 0} docs</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>by {c.creatorOrgName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedC && (
        <div className="card">
          <div className="card-h">
            <div>
              <h3>{selectedC.ucr}</h3>
              <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--mono)', marginTop: 2 }}>
                {selectedC.commercialInvoiceNo && `CI: ${selectedC.commercialInvoiceNo}`}
                {selectedC.commercialInvoiceNo && selectedC.exportDeclarationNo && ' | '}
                {selectedC.exportDeclarationNo && `ED: ${selectedC.exportDeclarationNo}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-p btn-sm" onClick={() => setShowUpload(true)}><Upload style={{ width: 12, height: 12 }} /> Upload Doc</button>
              <button className="btn btn-s btn-sm" onClick={() => setShowShare(true)}><Send style={{ width: 12, height: 12 }} /> Share</button>
            </div>
          </div>
          {docs.length === 0 ? <div className="empty">No documents anchored yet.</div> : (
            <table>
              <thead><tr><th>Document</th><th>Type</th><th>File</th><th>Created by</th><th>Tangle hash</th><th></th></tr></thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.title}</td>
                    <td><span className="pill pill-b">{d.docType}</span></td>
                    <td>{d.filename ? <span style={{ fontSize: 11, color: '#6b7280' }}>{d.filename} ({Math.round(d.fileSize / 1024)}KB)</span> : '\u2014'}</td>
                    <td>{d.creatorOrgName}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#16a34a' }}>{d.hash?.slice(0, 14)}...</td>
                    <td>{d.filename && <a href={api.downloadUrl(d.id)} className="btn btn-s btn-sm" style={{ textDecoration: 'none' }}><Download style={{ width: 11, height: 11 }} /></a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => { setShowCreate(false); refresh(); }} userId={user.id} />}
      {showUpload && selectedC && <UploadModal consignment={selectedC} userId={user.id} onClose={() => { setShowUpload(false); refresh(); }} />}
      {showShare && selectedC && <ShareModal consignment={selectedC} user={user} allOrgs={allOrgs} peerOrgs={peerOrgs} peerConnected={peerConnected} onClose={() => { setShowShare(false); refresh(); }} />}
    </div>
  );
}

function CreateModal({ onClose, userId }) {
  const [ucr, setUcr] = useState('UCR-2026-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0'));
  const [ci, setCi] = useState('');
  const [ed, setEd] = useState('');
  const [desc, setDesc] = useState('');
  const submit = async () => { await api.createConsignment({ ucr, commercialInvoiceNo: ci, exportDeclarationNo: ed, description: desc, creatorOrgId: userId }); onClose(); };
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>Create Consignment (Digital Twin)</h3>
      <div className="fg"><label>UCR Number (Primary ID)</label><input value={ucr} onChange={e => setUcr(e.target.value)} /></div>
      <div className="g2">
        <div className="fg"><label>Commercial Invoice No.</label><input value={ci} onChange={e => setCi(e.target.value)} placeholder="e.g. INV-2026-001" /></div>
        <div className="fg"><label>Export Declaration No.</label><input value={ed} onChange={e => setEd(e.target.value)} placeholder="e.g. EXD-2026-001" /></div>
      </div>
      <div className="fg"><label>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Consignment description..." /></div>
      <div className="modal-act"><button className="btn btn-s" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={submit}><Plus style={{ width: 13, height: 13 }} /> Create & Anchor</button></div>
    </div></div>
  );
}

function UploadModal({ consignment, userId, onClose }) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('General');
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  const submit = async () => {
    const fd = new FormData();
    fd.append('consignmentId', consignment.id); fd.append('title', title); fd.append('docType', docType); fd.append('creatorOrgId', userId);
    if (file) fd.append('file', file);
    await api.uploadDocument(fd); onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>Upload Document to {consignment.ucr}</h3>
      <div className="fg"><label>Document Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Commercial Invoice" autoFocus /></div>
      <div className="fg"><label>Document Type</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}>
          {['General','Commercial Invoice','Certificate of Origin','Bill of Lading','Export Declaration','Import Declaration','Health Certificate','Phytosanitary Certificate','Packing List','Insurance Certificate'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="fg"><label>Attach File</label>
        <div style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: file ? '#f0fdf4' : '#fff' }} onClick={() => fileRef.current?.click()}>
          {file ? <><FileText style={{ width: 20, height: 20, color: '#16a34a', marginBottom: 4 }} /><div style={{ fontSize: 12, color: '#166534' }}>{file.name} ({Math.round(file.size / 1024)}KB)</div></> : <><Upload style={{ width: 20, height: 20, color: '#9ca3af', marginBottom: 4 }} /><div style={{ fontSize: 12, color: '#6b7280' }}>Click to select file</div></>}
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
      </div>
      <div className="modal-act"><button className="btn btn-s" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={submit} disabled={!title.trim()}><Upload style={{ width: 13, height: 13 }} /> Upload & Anchor</button></div>
    </div></div>
  );
}

function ShareModal({ consignment, user, allOrgs, peerOrgs, peerConnected, onClose }) {
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [shareMode, setShareMode] = useState('all'); // 'all' | 'selective'
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [docs, setDocs] = useState([]);

  const shareableOrgs = [...allOrgs.filter(o => o.id !== user.id), ...peerOrgs.filter(po => !allOrgs.some(ao => ao.id === po.id))];

  useEffect(() => {
    api.getPermissions(consignment.id).then(p => { setPerms(p); setLoading(false); }).catch(() => setLoading(false));
    api.getDocuments(user.id, consignment.id).then(setDocs).catch(() => {});
  }, [consignment.id, user.id]);

  const toggleDoc = (docId) => {
    setSelectedDocIds(prev => prev.includes(docId) ? prev.filter(d => d !== docId) : [...prev, docId]);
  };

  const doShare = async (org) => {
    await api.shareConsignment({
      consignmentId: consignment.id,
      recipientOrgId: org.id,
      recipientOrgName: org.name,
      sharerOrgName: user.name,
      shareMode,
      selectedDocIds: shareMode === 'selective' ? selectedDocIds : undefined,
    });
    setPerms(p => ({ ...p, [org.id]: 'viewer' }));
  };

  const doRevoke = async (org) => {
    await api.revokeAccess({ consignmentId: consignment.id, recipientOrgId: org.id, recipientOrgName: org.name, revokerOrgName: user.name });
    setPerms(p => { const n = { ...p }; delete n[org.id]; return n; });
  };

  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
      <h3>Share {consignment.ucr}</h3>

      {/* Share mode toggle */}
      {docs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Share mode</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${shareMode === 'all' ? 'btn-p' : 'btn-s'}`} onClick={() => setShareMode('all')}>All documents ({docs.length})</button>
            <button className={`btn btn-sm ${shareMode === 'selective' ? 'btn-p' : 'btn-s'}`} onClick={() => setShareMode('selective')}>Select specific documents</button>
          </div>
        </div>
      )}

      {/* Selective document picker */}
      {shareMode === 'selective' && docs.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Select documents to share:</div>
          {docs.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedDocIds.includes(d.id)} onChange={() => toggleDoc(d.id)} style={{ accentColor: '#16a34a' }} />
              <FileText style={{ width: 14, height: 14, color: '#6b7280' }} />
              <span style={{ fontWeight: 500 }}>{d.title}</span>
              <span className="pill pill-b" style={{ marginLeft: 4 }}>{d.docType}</span>
              {d.filename && <span style={{ fontSize: 10, color: '#9ca3af' }}>({d.filename})</span>}
            </label>
          ))}
          {selectedDocIds.length > 0 && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 6, fontWeight: 500 }}>{selectedDocIds.length} of {docs.length} documents selected</div>}
        </div>
      )}

      {/* Recipient list */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Organisations</div>
      {!peerConnected && <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, fontSize: 11, color: '#991b1b', marginBottom: 10 }}><Lock style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Peer node offline. Cross-node sharing unavailable.</div>}
      {loading ? <div className="empty">Loading...</div> : shareableOrgs.length === 0 ? <div className="empty">No other organisations available.</div> : (
        shareableOrgs.map(o => {
          const has = !!perms[o.id];
          const isRemote = !o.local && !allOrgs.some(a => a.id === o.id);
          const disabled = isRemote && !peerConnected;
          return (
            <div className="sr" key={o.id} style={{ opacity: disabled ? 0.4 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{o.name}{isRemote && <span className="pill pill-a" style={{ marginLeft: 6 }}>peer node</span>}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>{o.role}{o.nodeName ? ` \u2014 ${o.nodeName}` : ''}</div>
              </div>
              {has ? (
                <button className="btn btn-sm btn-d" onClick={() => doRevoke(o)}>Revoke</button>
              ) : (
                <button className="btn btn-sm btn-p" onClick={() => doShare(o)} disabled={disabled || (shareMode === 'selective' && selectedDocIds.length === 0)}>
                  <Send style={{ width: 11, height: 11 }} /> Share
                </button>
              )}
            </div>
          );
        })
      )}
      <div className="modal-act"><button className="btn btn-p" onClick={onClose}>Done</button></div>
    </div></div>
  );
}
