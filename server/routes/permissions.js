import { Router } from 'express';
import { WebSocket } from 'ws';
import { store, addLog, wsRefs } from '../store.js';

const router = Router();

router.get('/api/permissions/:consignmentId', (req, res) => res.json(store.permissions[req.params.consignmentId] || {}));

router.post('/api/permissions/share', (req, res) => {
  const { consignmentId, recipientOrgId, recipientOrgName, sharerOrgName, shareMode, selectedDocIds } = req.body;
  const consignment = store.consignments.find(c => c.id === consignmentId);
  if (!consignment) return res.status(400).json({ error: 'Not found' });
  if (!store.permissions[consignmentId]) store.permissions[consignmentId] = {};
  store.permissions[consignmentId][recipientOrgId] = 'viewer';
  const allDocs = store.documents.filter(d => d.consignmentId === consignmentId);
  if (shareMode === 'selective' && selectedDocIds?.length > 0) {
    for (const docId of selectedDocIds) { if (!store.docPermissions[docId]) store.docPermissions[docId] = {}; store.docPermissions[docId][recipientOrgId] = 'viewer'; }
    const names = allDocs.filter(d => selectedDocIds.includes(d.id)).map(d => d.title).join(', ');
    addLog('permission', 'Selective Share', sharerOrgName, `${consignment.ucr}: shared ${selectedDocIds.length}/${allDocs.length} docs with ${recipientOrgName}. [${names}]`);
  } else {
    for (const doc of allDocs) { if (!store.docPermissions[doc.id]) store.docPermissions[doc.id] = {}; store.docPermissions[doc.id][recipientOrgId] = 'viewer'; }
    addLog('permission', 'Full Share', sharerOrgName, `"${consignment.ucr}" \u2014 all ${allDocs.length} docs shared with ${recipientOrgName}. Encrypted via TLIP.`);
  }
  const isPeer = store.peerOrgs.some(o => o.id === recipientOrgId);
  const peerSock = [wsRefs.peerWs, wsRefs.peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (isPeer && peerSock) {
    const docsToSend = shareMode === 'selective' && selectedDocIds?.length ? allDocs.filter(d => selectedDocIds.includes(d.id)) : allDocs;
    peerSock.send(JSON.stringify({ type: 'SHARE_CONSIGNMENT', consignment, documents: docsToSend.map(d => ({ ...d, fileBase64: undefined })), permissions: store.permissions[consignmentId], docPermissions: Object.fromEntries(docsToSend.map(d => [d.id, store.docPermissions[d.id] || {}])) }));
  }
  res.json({ success: true });
});

router.post('/api/permissions/revoke', (req, res) => {
  const { consignmentId, recipientOrgId, recipientOrgName, revokerOrgName } = req.body;
  const c = store.consignments.find(c => c.id === consignmentId);
  if (store.permissions[consignmentId]) delete store.permissions[consignmentId][recipientOrgId];
  store.documents.filter(d => d.consignmentId === consignmentId).forEach(d => { if (store.docPermissions[d.id]) delete store.docPermissions[d.id][recipientOrgId]; });
  addLog('permission', 'Access Revoked', revokerOrgName, `Access to "${c?.ucr}" revoked for ${recipientOrgName}.`);
  const isPeer = store.peerOrgs.some(o => o.id === recipientOrgId);
  if (isPeer) {
    const peerSock = [wsRefs.peerWs, wsRefs.peerInWs].find(w => w?.readyState === WebSocket.OPEN);
    if (peerSock) peerSock.send(JSON.stringify({ type: 'REVOKE_CONSIGNMENT', consignmentId, recipientOrgId }));
  }
  res.json({ success: true });
});

export default router;
