import { WebSocketServer, WebSocket } from 'ws';
import { store, wsRefs, NODE_ID, NODE_NAME, NODE_IP, PEER_URL, PORT, addLog } from './store.js';

const clients = new Set();

function broadcastToClients(msg) {
  const d = JSON.stringify(msg);
  clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(d); });
}

function syncOrgsToPeer() {
  const w = [wsRefs.peerWs, wsRefs.peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (w) w.send(JSON.stringify({ type: 'ORG_UPDATE', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) }));
}

function connectToPeer() {
  if (!PEER_URL || wsRefs.peerWs?.readyState === WebSocket.OPEN || wsRefs.peerInWs?.readyState === WebSocket.OPEN) return;
  try {
    const ws = new WebSocket(PEER_URL + '/peer');
    wsRefs.peerWs = ws;
    ws.on('open', () => {
      store.peerConnected = true;
      ws.send(JSON.stringify({ type: 'HANDSHAKE', nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP, orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) }));
      addLog('network', 'Peer Connected', 'System', `P2P handshake completed with peer at ${PEER_URL}. Organisations now discoverable.`);
      broadcastToClients({ type: 'PEER_STATUS', connected: true });
    });
    ws.on('message', d => handlePeerMsg(JSON.parse(d.toString())));
    ws.on('close', () => { if (wsRefs.peerWs !== ws) return; store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
    ws.on('error', () => {});
  } catch (e) {}
}

function handlePeerIn(ws) {
  wsRefs.peerInWs = ws;
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.type === 'HANDSHAKE') {
      store.peerOrgs = m.orgs || [];
      store.peerConnected = true;
      broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs });
      ws.send(JSON.stringify({ type: 'ORG_DIRECTORY', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) }));
      addLog('network', 'Peer Connected', 'System', 'Inbound P2P connection accepted. Peer orgs now discoverable.');
    } else {
      handlePeerMsg(m);
    }
  });
  ws.on('close', () => { if (wsRefs.peerInWs !== ws) return; wsRefs.peerInWs = null; store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
}

function handlePeerMsg(m) {
  switch (m.type) {
    case 'HANDSHAKE': store.peerOrgs = m.orgs || []; store.peerConnected = true; broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs }); break;
    case 'ORG_DIRECTORY': case 'ORG_UPDATE': store.peerOrgs = m.orgs || []; broadcastToClients({ type: 'PEER_ORGS', peerOrgs: store.peerOrgs }); break;
    case 'LEDGER_ENTRY': if (!store.ledgerLog.some(e => e.id === m.entry.id)) { store.ledgerLog.unshift(m.entry); broadcastToClients({ type: 'LEDGER_UPDATE', log: store.ledgerLog }); } break;
    case 'SHARE_CONSIGNMENT': {
      const { consignment, documents, permissions, docPermissions } = m;
      if (!store.consignments.some(c => c.id === consignment.id)) store.consignments.push(consignment);
      for (const doc of documents) { if (!store.documents.some(d => d.id === doc.id)) store.documents.push(doc); }
      if (permissions) store.permissions[consignment.id] = { ...store.permissions[consignment.id], ...permissions };
      if (docPermissions) { for (const [did, p] of Object.entries(docPermissions)) { store.docPermissions[did] = { ...store.docPermissions[did], ...p }; } }
      broadcastToClients({ type: 'DATA_SYNC' }); break;
    }
    case 'REVOKE_CONSIGNMENT': {
      const { consignmentId } = m;
      const docs = store.documents.filter(d => d.consignmentId === consignmentId);
      store.consignments = store.consignments.filter(c => c.id !== consignmentId);
      store.documents = store.documents.filter(d => d.consignmentId !== consignmentId);
      delete store.permissions[consignmentId];
      docs.forEach(d => delete store.docPermissions[d.id]);
      delete store.financePermissions[consignmentId];
      broadcastToClients({ type: 'DATA_SYNC' }); break;
    }
  }
}

/**
 * Attach WebSocket server to the HTTP server and wire up wsRefs.
 */
export function setupWebSocket(httpServer) {
  // Wire refs so route modules can access WS functions
  wsRefs.broadcastToClients = broadcastToClients;
  wsRefs.connectToPeer = connectToPeer;
  wsRefs.syncOrgsToPeer = syncOrgsToPeer;

  const wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/peer') {
      handlePeerIn(ws);
    } else {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
      ws.send(JSON.stringify({ type: 'NODE_INFO', nodeId: NODE_ID, nodeName: NODE_NAME }));
    }
  });
}
