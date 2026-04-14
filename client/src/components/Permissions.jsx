import React, { useState, useEffect } from 'react';
import { useNode } from '../context/NodeContext';
import { api } from '../utils/api';
import { Crown, Shield } from 'lucide-react';

export default function Permissions() {
  const { user, peerOrgs, refresh, refreshKey } = useNode();
  const [consignments, setConsignments] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [permsMap, setPermsMap] = useState({});

  useEffect(() => {
    api.getConsignments(user.id).then(async (cs) => {
      setConsignments(cs);
      const pm = {};
      for (const c of cs) { pm[c.id] = await api.getPermissions(c.id).catch(() => ({})); }
      setPermsMap(pm);
    }).catch(() => {});
    api.getAllOrgs().then(orgs => {
      const combined = [...orgs];
      peerOrgs.forEach(po => { if (!combined.some(o => o.id === po.id)) combined.push(po); });
      setAllOrgs(combined);
    }).catch(() => {});
  }, [user.id, refreshKey, peerOrgs]);

  const toggle = async (consignmentId, orgId, orgName, currentPerm, creatorId) => {
    if (orgId === creatorId) return;
    if (currentPerm) {
      await api.revokeAccess({ consignmentId, recipientOrgId: orgId, recipientOrgName: orgName, revokerOrgName: user.name });
    } else {
      await api.shareConsignment({ consignmentId, recipientOrgId: orgId, recipientOrgName: orgName, sharerOrgName: user.name });
    }
    refresh();
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card-h"><h3>Access Control Matrix</h3><span className="pill pill-b">{consignments.length} consignments</span></div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Click cells to grant/revoke access. Owner (crown) always has access. Changes are anchored on the Tangle.</p>
        {consignments.length === 0 ? <div className="empty">No consignments to show permissions for.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Consignment</th>{allOrgs.map(o => <th key={o.id} style={{ textAlign: 'center', fontSize: 9 }}>{o.name}</th>)}</tr></thead>
              <tbody>
                {consignments.map(c => {
                  const p = permsMap[c.id] || {};
                  return (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight: 500, fontSize: 12 }}>{c.ucr}</div></td>
                      {allOrgs.map(o => {
                        const isOwner = p[o.id] === 'owner';
                        const hasAccess = isOwner || p[o.id] === 'viewer';
                        return (
                          <td key={o.id} className="perm-cell" onClick={() => toggle(c.id, o.id, o.name, p[o.id], c.creatorOrgId)} style={{ cursor: isOwner ? 'default' : 'pointer' }}>
                            {isOwner ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><Crown style={{ width: 12, height: 12, color: '#f59e0b' }} /><span style={{ color: '#16a34a', fontWeight: 700 }}>&#10003;</span></span>
                              : hasAccess ? <span style={{ color: '#16a34a', fontWeight: 700 }}>&#10003;</span>
                              : <span style={{ color: '#d1d5db' }}>&#10005;</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-h"><h3>Permission Rules</h3></div>
        <div className="g3">
          {[{ n: '1', t: 'Owner controls', d: 'The consignment creator decides who can view their data. No central authority can override.' },
            { n: '2', t: 'Encrypted sharing', d: 'Data is encrypted in transit. Only permitted parties receive decryption keys.' },
            { n: '3', t: 'Auditable', d: 'Every grant and revocation is recorded on the IOTA Tangle with timestamp and hash.' }].map(r => (
            <div key={r.n} style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginBottom: 3 }}>{r.n}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 3 }}>{r.t}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{r.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
