import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).reduce((a, c) => { const [k, v] = c.replace('--', '').split('='); a[k] = v; return a; }, {});
const PORT = parseInt(args.port || '4000');
const WS_PORT = parseInt(args.ws || '4010');
const NODE_ID = args.id || 'alpha';
const NODE_NAME = args.name || 'Node Alpha';
const PEER_URL = args.peer || null;
const NODE_IP = `127.0.0.1:${PORT}`;

const genId = () => crypto.randomBytes(8).toString('hex');
const genHash = () => '0x' + crypto.randomBytes(16).toString('hex');
const genDID = () => 'did:iota:0x' + crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();

// Find output directory
const possibleOutputPaths = [
  path.join(__dirname, '../output'),
  path.join(__dirname, '../../../../output'),
];
const OUTPUT_DIR = possibleOutputPaths.find(p => existsSync(p)) ?? null;
if (OUTPUT_DIR) console.log(`[${NODE_NAME}] Output directory: ${OUTPUT_DIR}`);

// ── Credential validation ──
const BLACKLISTED = ['BRN-000000','TIN-000000','LEI-000000','DUNS-000000','BRN-999999'];
const EXPIRED = ['BRN-111111','TIN-111111'];
const SUSPENDED = ['BRN-222222','TIN-222222'];

function validateCredential(regNumber) {
  const n = (regNumber || '').toUpperCase().trim();
  if (n.length < 6) return { valid: false, reason: 'Registration number too short (minimum 6 characters)', failStep: 0 };
  if (BLACKLISTED.includes(n)) return { valid: false, reason: 'Registration number is on the DENIED list — organisation not recognised by any registry', failStep: 1 };
  if (n.startsWith('X') || n.startsWith('0')) return { valid: false, reason: 'Invalid prefix — number not found in any recognised national or international registry', failStep: 1 };
  if (EXPIRED.includes(n)) return { valid: false, reason: 'Registration has EXPIRED — licence is no longer active. Organisation must renew before DID issuance.', failStep: 2 };
  if (SUSPENDED.includes(n)) return { valid: false, reason: 'Registration is SUSPENDED — organisation is under regulatory review. DID issuance blocked.', failStep: 2 };
  const prefix = n.split('-')[0];
  const typeMap = { BRN: 'Business Registration Number', TIN: 'Tax Identification Number', LEI: 'Legal Entity Identifier', DUNS: 'DUNS Number' };
  return { valid: true, type: typeMap[prefix] || 'National Registration Number', formatted: n };
}

// ── Store ──
const store = {
  orgs: NODE_ID === 'alpha' ? [
    { id: 'org1', name: 'Exporter Co.', role: 'Exporter', username: 'exporter', password: 'demo', did: null, verified: false, regNumber: null },
    { id: 'org2', name: 'Customs Authority', role: 'Government Agency', username: 'customs', password: 'demo', did: null, verified: false, regNumber: null },
  ] : [
    { id: 'org3', name: 'Importer Co.', role: 'Importer', username: 'importer', password: 'demo', did: null, verified: false, regNumber: null },
  ],
  consignments: [], documents: [], permissions: {}, docPermissions: {}, tangleLog: [],
  peerOrgs: [], peerConnected: false,
};

function addLog(type, action, actor, details, extra = {}) {
  const entry = { id: genId(), timestamp: now(), hash: genHash(), type, action, actor, details, ...extra };
  store.tangleLog.unshift(entry);
  broadcastToClients({ type: 'TANGLE_UPDATE', log: store.tangleLog });
  if (store.peerConnected && peerWs?.readyState === WebSocket.OPEN) peerWs.send(JSON.stringify({ type: 'TANGLE_ENTRY', entry }));
  return entry;
}

// ── Seed output folder consignments ──
const SEED_STATUSES = ['Delivered','In Transit','Customs','Delivered','Submitted','Released','Delivered','In Transit','Customs','Delivered'];
let seedStatusIdx = 0;

function docTypeFromName(name) {
  if (name.includes('Invoice')) return 'Commercial Invoice';
  if (name.includes('Packing')) return 'Packing List';
  if (name.includes('Origin')) return 'Certificate of Origin';
  if (name.includes('Insurance')) return 'Insurance Certificate';
  if (name.includes('Lading')) return 'Bill of Lading';
  if (name.includes('Declaration')) return 'Export Declaration';
  return 'General';
}

function seedOutputConsignments() {
  if (!OUTPUT_DIR) return;
  try {
    const entries = readdirSync(OUTPUT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const ucr = entry.name;
      const manifestPath = path.join(OUTPUT_DIR, ucr, 'manifest.json');
      if (!existsSync(manifestPath)) continue;

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const cId = `output-${ucr}`;
      if (store.consignments.some(c => c.id === cId)) continue;

      const parts = ucr.split('-');
      const fromCode = parts[2] || '';
      const toCode = parts[3] || '';
      const fromCountry = fromCode === 'NG' ? 'Nigeria' : 'Morocco';
      const toCountry = toCode === 'MA' ? 'Morocco' : 'Nigeria';

      const status = manifest.errorType ? 'Under Review' : SEED_STATUSES[seedStatusIdx++ % SEED_STATUSES.length];

      const c = {
        id: cId,
        ucr: manifest.ucr,
        commercialInvoiceNo: manifest.documents?.find(d => d.name.includes('Invoice'))?.reference || '',
        exportDeclarationNo: manifest.documents?.find(d => d.name.includes('Export Declaration'))?.reference || '',
        description: manifest.product,
        product: manifest.product,
        hsCode: manifest.hsCode,
        quantity: manifest.quantity,
        unit: manifest.unit,
        totalValue: manifest.totalValue,
        currency: manifest.currency,
        exporter: manifest.exporter,
        importer: manifest.importer,
        fromCountry,
        toCountry,
        originPort: manifest.originPort,
        destinationPort: manifest.destinationPort,
        vessel: manifest.vessel,
        shipDate: manifest.shipDate,
        incoterms: manifest.incoterms,
        errorType: manifest.errorType || null,
        errorDescription: manifest.errorDescription || null,
        creatorOrgId: store.orgs[0]?.id || 'system',
        creatorOrgName: store.orgs[0]?.name || 'System',
        createdAt: (manifest.shipDate || '2026-02-01') + 'T00:00:00.000Z',
        documentCount: manifest.documents?.length || 0,
        isOutputFolder: true,
        status,
      };

      store.consignments.push(c);
      store.permissions[cId] = {};
      store.orgs.forEach((org, i) => {
        store.permissions[cId][org.id] = i === 0 ? 'owner' : 'viewer';
      });

      for (const docInfo of (manifest.documents || [])) {
        const docId = `${cId}-doc-${docInfo.file}`;
        if (store.documents.some(d => d.id === docId)) continue;
        const docPath = path.join(OUTPUT_DIR, ucr, docInfo.file);
        let fileSize = 0;
        try { fileSize = existsSync(docPath) ? statSync(docPath).size : 0; } catch {}

        store.documents.push({
          id: docId,
          consignmentId: cId,
          title: docInfo.name,
          docType: docTypeFromName(docInfo.name),
          filename: docInfo.file,
          fileSize,
          hash: genHash(),
          creatorOrgId: store.orgs[0]?.id || 'system',
          creatorOrgName: store.orgs[0]?.name || 'System',
          timestamp: (manifest.shipDate || '2026-02-01') + 'T00:00:00.000Z',
          reference: docInfo.reference,
          format: docInfo.format,
          isOutputFolder: true,
          outputUcr: ucr,
          outputFile: docInfo.file,
        });
      }
    }
    console.log(`[${NODE_NAME}] Seeded ${store.consignments.filter(c => c.isOutputFolder).length} consignments from output folder`);
  } catch (e) {
    console.error(`[${NODE_NAME}] Failed to seed output consignments:`, e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const publicDir = path.join(__dirname, 'public');
if (existsSync(publicDir)) app.use(express.static(publicDir));

// Auth
app.post('/api/login', (req, res) => {
  const org = store.orgs.find(o => o.username === req.body.username && o.password === req.body.password);
  if (!org) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ org: { ...org, password: undefined }, nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP });
});

// Node info
app.get('/api/node', (req, res) => res.json({ nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP, wsPort: WS_PORT, peerConnected: store.peerConnected, orgCount: store.orgs.length, peerOrgCount: store.peerOrgs.length }));

app.get('/api/node/discover', (req, res) => {
  if (!PEER_URL) return res.json([]);
  const peerWsPort = parseInt(PEER_URL.match(/:(\d+)/)?.[1] || '0');
  const peerHttpPort = peerWsPort - 10;
  res.json([{ id: NODE_ID === 'alpha' ? 'beta' : 'alpha', name: NODE_ID === 'alpha' ? 'Node Beta' : 'Node Alpha', ip: `127.0.0.1:${peerHttpPort}`, wsUrl: PEER_URL, connected: store.peerConnected }]);
});

app.post('/api/node/connect', (req, res) => {
  if (store.peerConnected) return res.json({ success: true, message: 'Already connected' });
  connectToPeer();
  setTimeout(() => res.json({ success: store.peerConnected, message: store.peerConnected ? 'Connected — organisations now discoverable' : 'Connection attempt sent. Peer may not be online yet.' }), 2500);
});
app.post('/api/node/disconnect', (req, res) => {
  if (peerWs) { peerWs.close(); peerWs = null; }
  store.peerConnected = false; store.peerOrgs = [];
  broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] });
  addLog('network', 'Peer Disconnected', 'System', 'P2P connection terminated. Peer organisations no longer visible.');
  res.json({ success: true });
});

// Orgs
app.get('/api/orgs', (req, res) => res.json(store.orgs.map(o => ({ ...o, password: undefined }))));
app.get('/api/orgs/all', (req, res) => {
  const local = store.orgs.map(o => ({ ...o, password: undefined, nodeId: NODE_ID, nodeName: NODE_NAME, local: true }));
  const remote = store.peerConnected ? store.peerOrgs.map(o => ({ ...o, local: false })) : [];
  res.json([...local, ...remote]);
});
app.put('/api/orgs/:id', (req, res) => {
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, name: req.body.name ?? o.name, role: req.body.role ?? o.role } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  if (org) syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});

// DID registration
app.post('/api/orgs/:id/register', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  if (!v.valid) return res.status(400).json({ error: v.reason, failStep: v.failStep });
  const did = genDID();
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, regNumber: v.formatted, did, verified: true } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  addLog('identity', 'DID Issued', org.name, `DID created for ${org.name} (${v.type}: ${v.formatted}). Anchored on IOTA Tangle.`, { did });
  syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});
app.post('/api/orgs/validate-credential', (req, res) => res.json(validateCredential(req.body.regNumber)));

// Consignments
app.get('/api/consignments', (req, res) => {
  const { orgId } = req.query;
  res.json(store.consignments.filter(c => {
    const p = store.permissions[c.id] || {};
    return p[orgId] === 'owner' || p[orgId] === 'viewer';
  }));
});
app.post('/api/consignments', (req, res) => {
  const { ucr, commercialInvoiceNo, exportDeclarationNo, creatorOrgId, description } = req.body;
  const org = store.orgs.find(o => o.id === creatorOrgId);
  if (!org) return res.status(400).json({ error: 'Org not found' });
  const c = { id: genId(), ucr, commercialInvoiceNo: commercialInvoiceNo || '', exportDeclarationNo: exportDeclarationNo || '', description: description || '', creatorOrgId, creatorOrgName: org.name, createdAt: now(), documentCount: 0, status: 'Draft' };
  store.consignments.push(c);
  store.permissions[c.id] = { [creatorOrgId]: 'owner' };
  addLog('document', 'Consignment Created', org.name, `Digital twin created: ${ucr}. Anchored on Tangle.`);
  res.json(c);
});

// Documents
app.get('/api/documents', (req, res) => {
  const { orgId, consignmentId } = req.query;
  let docs = store.documents;
  if (consignmentId) docs = docs.filter(d => d.consignmentId === consignmentId);
  if (orgId) {
    docs = docs.filter(d => {
      const cp = store.permissions[d.consignmentId] || {};
      if (cp[orgId] === 'owner' || d.creatorOrgId === orgId) return true;
      const dp = store.docPermissions[d.id] || {};
      if (dp[orgId]) return true;
      const hasDLP = store.documents.filter(dd => dd.consignmentId === d.consignmentId).some(dd => Object.keys(store.docPermissions[dd.id] || {}).length > 0);
      if (hasDLP) return false;
      return cp[orgId] === 'viewer';
    });
  }
  res.json(docs.map(d => ({ ...d, fileBase64: undefined })));
});
app.post('/api/documents', upload.single('file'), (req, res) => {
  const { consignmentId, title, docType, creatorOrgId } = req.body;
  const org = store.orgs.find(o => o.id === creatorOrgId);
  const consignment = store.consignments.find(c => c.id === consignmentId);
  if (!org || !consignment) return res.status(400).json({ error: 'Not found' });
  let fileBase64 = null, filename = null, fileSize = 0;
  if (req.file) { fileBase64 = req.file.buffer.toString('base64'); filename = req.file.originalname; fileSize = req.file.size; }
  const doc = { id: genId(), consignmentId, title, docType: docType || 'General', filename, fileBase64, fileSize, hash: genHash(), creatorOrgId, creatorOrgName: org.name, timestamp: now() };
  store.documents.push(doc);
  consignment.documentCount = store.documents.filter(d => d.consignmentId === consignmentId).length;
  addLog('document', 'Document Anchored', org.name, `"${title}" anchored to ${consignment.ucr}. Hash on Tangle.`);
  res.json({ ...doc, fileBase64: undefined });
});

app.get('/api/documents/:id/download', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.isOutputFolder && OUTPUT_DIR) {
    const filePath = path.join(OUTPUT_DIR, doc.outputUcr, doc.outputFile);
    if (existsSync(filePath)) {
      res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
      return res.sendFile(filePath);
    }
  }
  if (!doc.fileBase64) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
  res.send(Buffer.from(doc.fileBase64, 'base64'));
});

app.get('/api/documents/:id/xml', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.isOutputFolder && OUTPUT_DIR && doc.filename?.endsWith('.xml')) {
    const filePath = path.join(OUTPUT_DIR, doc.outputUcr, doc.outputFile);
    if (existsSync(filePath)) return res.json({ content: readFileSync(filePath, 'utf-8'), docType: doc.docType });
  }
  if (doc.fileBase64 && doc.filename?.endsWith('.xml')) {
    return res.json({ content: Buffer.from(doc.fileBase64, 'base64').toString('utf-8'), docType: doc.docType });
  }
  res.status(400).json({ error: 'Not an XML file or not available' });
});

// Permissions
app.get('/api/permissions/:consignmentId', (req, res) => res.json(store.permissions[req.params.consignmentId] || {}));
app.post('/api/permissions/share', (req, res) => {
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
    addLog('permission', 'Full Share', sharerOrgName, `"${consignment.ucr}" — all ${allDocs.length} docs shared with ${recipientOrgName}. Encrypted via TLIP.`);
  }
  const isPeer = store.peerOrgs.some(o => o.id === recipientOrgId);
  if (isPeer && peerWs?.readyState === WebSocket.OPEN) {
    const docsToSend = shareMode === 'selective' && selectedDocIds?.length ? allDocs.filter(d => selectedDocIds.includes(d.id)) : allDocs;
    peerWs.send(JSON.stringify({ type: 'SHARE_CONSIGNMENT', consignment, documents: docsToSend.map(d => ({ ...d, fileBase64: undefined })), permissions: store.permissions[consignmentId], docPermissions: Object.fromEntries(docsToSend.map(d => [d.id, store.docPermissions[d.id] || {}])) }));
  }
  res.json({ success: true });
});
app.post('/api/permissions/revoke', (req, res) => {
  const { consignmentId, recipientOrgId, recipientOrgName, revokerOrgName } = req.body;
  const c = store.consignments.find(c => c.id === consignmentId);
  if (store.permissions[consignmentId]) delete store.permissions[consignmentId][recipientOrgId];
  store.documents.filter(d => d.consignmentId === consignmentId).forEach(d => { if (store.docPermissions[d.id]) delete store.docPermissions[d.id][recipientOrgId]; });
  addLog('permission', 'Access Revoked', revokerOrgName, `Access to "${c?.ucr}" revoked for ${recipientOrgName}.`);
  res.json({ success: true });
});

// Tangle
app.get('/api/tangle', (req, res) => res.json(store.tangleLog));
app.get('/api/peer/orgs', (req, res) => {
  if (!store.peerConnected) return res.json([]);
  let orgs = store.peerOrgs;
  if (req.query.q) orgs = orgs.filter(o => o.name.toLowerCase().includes(req.query.q.toLowerCase()));
  res.json(orgs);
});
app.get('*', (req, res) => { const f = path.join(publicDir, 'index.html'); existsSync(f) ? res.sendFile(f) : res.status(404).json({ error: 'Build first' }); });

// ── WebSocket ──
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${WS_PORT}`);
  if (url.pathname === '/peer') { handlePeerIn(ws); } else { clients.add(ws); ws.on('close', () => clients.delete(ws)); ws.send(JSON.stringify({ type: 'NODE_INFO', nodeId: NODE_ID, nodeName: NODE_NAME })); }
});
function broadcastToClients(msg) { const d = JSON.stringify(msg); clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(d); }); }

// ── P2P ──
let peerWs = null;
function connectToPeer() {
  if (!PEER_URL || peerWs?.readyState === WebSocket.OPEN) return;
  try {
    peerWs = new WebSocket(PEER_URL + '/peer');
    peerWs.on('open', () => {
      store.peerConnected = true;
      peerWs.send(JSON.stringify({ type: 'HANDSHAKE', nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP, orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) }));
      addLog('network', 'Peer Connected', 'System', `P2P handshake completed with peer at ${PEER_URL}. Organisations now discoverable.`);
      broadcastToClients({ type: 'PEER_STATUS', connected: true });
    });
    peerWs.on('message', d => handlePeerMsg(JSON.parse(d.toString())));
    peerWs.on('close', () => { store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
    peerWs.on('error', () => {});
  } catch (e) {}
}
function handlePeerIn(ws) {
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.type === 'HANDSHAKE') { store.peerOrgs = m.orgs || []; store.peerConnected = true; broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs }); ws.send(JSON.stringify({ type: 'ORG_DIRECTORY', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) })); addLog('network', 'Peer Connected', 'System', 'Inbound P2P connection accepted. Peer orgs now discoverable.'); } else handlePeerMsg(m); });
  ws.on('close', () => { store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
}
function handlePeerMsg(m) {
  switch (m.type) {
    case 'HANDSHAKE': store.peerOrgs = m.orgs || []; store.peerConnected = true; broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs }); break;
    case 'ORG_DIRECTORY': case 'ORG_UPDATE': store.peerOrgs = m.orgs || []; broadcastToClients({ type: 'PEER_ORGS', peerOrgs: store.peerOrgs }); break;
    case 'TANGLE_ENTRY': if (!store.tangleLog.some(e => e.id === m.entry.id)) { store.tangleLog.unshift(m.entry); broadcastToClients({ type: 'TANGLE_UPDATE', log: store.tangleLog }); } break;
    case 'SHARE_CONSIGNMENT': {
      const { consignment, documents, permissions, docPermissions } = m;
      if (!store.consignments.some(c => c.id === consignment.id)) store.consignments.push(consignment);
      for (const doc of documents) { if (!store.documents.some(d => d.id === doc.id)) store.documents.push(doc); }
      if (permissions) store.permissions[consignment.id] = { ...store.permissions[consignment.id], ...permissions };
      if (docPermissions) { for (const [did, p] of Object.entries(docPermissions)) { store.docPermissions[did] = { ...store.docPermissions[did], ...p }; } }
      broadcastToClients({ type: 'DATA_SYNC' }); break;
    }
  }
}
function syncOrgsToPeer() { if (peerWs?.readyState === WebSocket.OPEN) peerWs.send(JSON.stringify({ type: 'ORG_UPDATE', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) })); }

// Seed output folder data then start
seedOutputConsignments();
app.listen(PORT, () => { console.log(`[${NODE_NAME}] HTTP on http://localhost:${PORT} | WS on ws://localhost:${WS_PORT}`); });
