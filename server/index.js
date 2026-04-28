import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).reduce((a, c) => { const [k, v] = c.replace('--', '').split('='); a[k] = v; return a; }, {});
// Env vars take priority (Railway/cloud deployment), CLI args used for local dev
const PORT     = parseInt(process.env.PORT     || args.port || '4000');
const WS_PORT  = parseInt(process.env.WS_PORT  || args.ws   || '4010');
const NODE_ID  = process.env.NODE_ID   || args.id   || 'alpha';
const NODE_NAME= process.env.NODE_NAME || args.name || 'Node Alpha';
const PEER_URL = process.env.PEER_URL  || args.peer || null;
const NODE_IP  = `127.0.0.1:${PORT}`;

// Use the same base-dir as the output folder so we always write where we can read
const _projectBase = (() => {
  const candidates = [
    path.join(__dirname, '..'),
    path.join(__dirname, '../../../..'),
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, 'output')) || existsSync(path.join(c, 'server'))) return c;
  }
  return path.join(__dirname, '..');
})();
const DATA_DIR = path.join(_projectBase, 'data');
const TANGLE_FILE = path.join(DATA_DIR, `tangle-${NODE_ID}.json`);

function loadTangleLog() {
  try {
    if (existsSync(TANGLE_FILE)) return JSON.parse(readFileSync(TANGLE_FILE, 'utf-8'));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to load tangle log:`, e.message); }
  return [];
}

function saveTangleLog() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(TANGLE_FILE, JSON.stringify(store.tangleLog, null, 2));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to save tangle log:`, e.message); }
}

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
    { id: 'org1', name: 'AtlasPhosphate S.A.',     role: 'Exporter · Morocco',          username: 'atlas',      password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org2', name: 'Morocco Customs',          role: 'Customs Authority · Morocco', username: 'macustoms',  password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org3', name: 'Nigeria Customs',          role: 'Customs Authority · Nigeria', username: 'ngcustoms',  password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org4', name: 'Kenya Revenue Authority',  role: 'Customs Authority · Kenya',   username: 'kra',        password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org7', name: 'Financier 1',              role: 'Financier',                   username: 'financier1', password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org8', name: 'Financier 2',              role: 'Financier',                   username: 'financier2', password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
  ] : [
    { id: 'org5', name: 'PrimeFert Nigeria Ltd',        role: 'Importer · Nigeria', username: 'primefert', password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org6', name: 'TradeLink International Ltd',  role: 'Importer · Nigeria', username: 'tradelink', password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
  ],
  consignments: [], documents: [], permissions: {}, docPermissions: {},
  payments: [], letterOfCredits: [], smartContracts: [], financePermissions: {},
  tangleLog: loadTangleLog(),
  peerOrgs: [], peerConnected: false,
};

function addLog(type, action, actor, details, extra = {}) {
  const entry = { id: genId(), timestamp: now(), hash: genHash(), type, action, actor, details, ...extra };
  store.tangleLog.unshift(entry);
  saveTangleLog();
  broadcastToClients({ type: 'TANGLE_UPDATE', log: store.tangleLog });
  if (store.peerConnected && peerWs?.readyState === WebSocket.OPEN) peerWs.send(JSON.stringify({ type: 'TANGLE_ENTRY', entry }));
  return entry;
}

// Idempotent seed helper — appends historical events without duplicating
function seedLog(type, action, actor, details, timestamp) {
  if (store.tangleLog.some(e => e.details === details)) return;
  store.tangleLog.push({ id: genId(), timestamp, hash: genHash(), type, action, actor, details });
}

// ── Seed output folder consignments ──
const SEED_STATUSES = ['Delivered','In Transit','Customs','Delivered','Submitted','Released','Delivered','In Transit','Customs','Delivered'];
let seedStatusIdx = 0;

function getDocIssuer(docInfo, manifest) {
  // Prefer issuer explicitly set in manifest document list
  if (docInfo.issuer) return docInfo.issuer;
  const fromMA = (manifest.direction || '').startsWith('MA') || (manifest.ucr || '').includes('-MA-NG-');
  const name = docInfo.name || '';
  const ref  = docInfo.reference || '';
  if (name.includes('Invoice') || name.includes('Packing')) return manifest.exporter || 'Exporter';
  if (name.includes('Origin'))
    return fromMA ? 'MAEX — Morocco Agri-Export Bureau' : 'NEPT — Nigeria Export Promotion Trust';
  if (name.includes('Insurance')) {
    if (ref.includes('MMSA'))    return 'Maghreb Marine Assurance S.A.';
    if (ref.includes('TSIP'))   return 'TrustShield Insurance Plc';
    if (ref.includes('MERI')) return 'Meridian Assurance Co. Ltd';
    if (ref.includes('ARMA'))     return 'AxiomRisk Assurance Maroc';
    return fromMA ? 'Maghreb Marine Assurance S.A.' : 'TrustShield Insurance Plc';
  }
  if (name.includes('Lading')) {
    if (ref.startsWith('NSLR')) return 'NordShip Line S.A.';
    if (ref.startsWith('ASHR')) return 'AtlasShip S.A.';
    if (ref.startsWith('ELSG')) return 'EuroLink Shipping AG';
    if (ref.startsWith('GMSH')) return 'GlobalMar Shipping Co. S.A.';
    if (ref.startsWith('PTSC')) return 'PacTrade Shipping Co., Ltd.';
    if (ref.startsWith('GSLV')) return 'GreenSea Line';
    return 'Carrier / Shipping Line';
  }
  if (name.includes('Declaration'))
    return fromMA ? 'Morocco Customs' : 'Nigeria Customs';
  return manifest.exporter || 'Issuer';
}

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
      // Prefer manifest-provided country names (e.g. Kenyan consignments)
      const fromCountry = manifest.fromCountry || (fromCode === 'NG' ? 'Nigeria' : 'Morocco');
      const toCountry   = manifest.toCountry   || (toCode   === 'MA' ? 'Morocco'  : 'Nigeria');

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
        creatorOrgId: manifest.creatorOrgId || store.orgs[0]?.id || 'system',
        creatorOrgName: manifest.creatorOrgName || store.orgs[0]?.name || 'System',
        createdAt: (manifest.shipDate || '2026-02-01') + 'T00:00:00.000Z',
        documentCount: manifest.documents?.length || 0,
        isOutputFolder: true,
        status,
      };

      store.consignments.push(c);
      store.permissions[cId] = {};
      store.financePermissions[cId] = {};
      // All consignments are private by default — only the creator (owner) can see them.
      // Other orgs gain access only after the creator explicitly shares.
      // KE* creator = KRA (org4); MA/NG creator = atlas (org1).
      const creatorId = c.creatorOrgId;
      store.orgs.forEach(org => {
        if (org.id === creatorId) {
          store.permissions[cId][org.id] = 'owner';
        }
        // All other orgs: no entry = no access until shared
      });
      store.financePermissions[cId][creatorId] = 'owner';
      seedLog('document', 'Consignment Anchored', manifest.exporter || c.creatorOrgName,
        `Digital twin created: ${manifest.ucr} — ${manifest.product}. Anchored on the ledger.`, c.createdAt);

      for (const docInfo of (manifest.documents || [])) {
        const docId = `${cId}-doc-${docInfo.file}`;
        if (store.documents.some(d => d.id === docId)) continue;
        const docPath = path.join(OUTPUT_DIR, ucr, docInfo.file);
        let fileSize = 0;
        try { fileSize = existsSync(docPath) ? statSync(docPath).size : 0; } catch {}
        const issuer = getDocIssuer(docInfo, manifest);
        const docTs = (manifest.shipDate || '2026-02-01') + 'T00:00:00.000Z';

        store.documents.push({
          id: docId,
          consignmentId: cId,
          title: docInfo.name,
          docType: docTypeFromName(docInfo.name),
          filename: docInfo.file,
          fileSize,
          hash: genHash(),
          creatorOrgId: manifest.creatorOrgId || store.orgs[0]?.id || 'system',
          creatorOrgName: manifest.creatorOrgName || store.orgs[0]?.name || 'System',
          timestamp: docTs,
          reference: docInfo.reference,
          format: docInfo.format,
          issuer,
          isOutputFolder: true,
          outputUcr: ucr,
          outputFile: docInfo.file,
        });
        seedLog('document', 'Document Anchored', manifest.exporter || c.creatorOrgName,
          `"${docInfo.name}" anchored to ${manifest.ucr}. Issued by ${issuer}.`, docTs);
      }
    }
    saveTangleLog();
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
function getAttestingAuthority(org) {
  if (org.role?.includes('Morocco'))  return 'Morocco Customs';
  if (org.role?.includes('Nigeria'))  return 'Nigeria Customs';
  if (org.role?.includes('Kenya'))    return 'Kenya Revenue Authority';
  return 'National Registry';
}

app.post('/api/orgs/:id/register', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  if (!v.valid) return res.status(400).json({ error: v.reason, failStep: v.failStep });
  const did = genDID();
  const org0 = store.orgs.find(o => o.id === req.params.id);
  if (!org0) return res.status(404).json({ error: 'Org not found' });
  const attestedBy = getAttestingAuthority(org0);
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, regNumber: v.formatted, did, verified: true, attestedBy } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  addLog('identity', 'DID Issued', org.name, `DID created for ${org.name} (${v.type}: ${v.formatted}). Attested by ${attestedBy}. Anchored on the ledger.`, { did, attestedBy });
  syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});
app.post('/api/orgs/validate-credential', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  // attach attestedBy based on orgId if provided
  if (v.valid && req.body.orgId) {
    const org = store.orgs.find(o => o.id === req.body.orgId);
    if (org) v.attestedBy = getAttestingAuthority(org);
  }
  res.json(v);
});

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
  addLog('document', 'Consignment Created', org.name, `Digital twin created: ${ucr}. Anchored on the ledger.`);
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
  addLog('document', 'Document Anchored', org.name, `"${title}" anchored to ${consignment.ucr}. Anchored on the ledger.`);
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

// ── Finance helpers ──────────────────────────────────────────────────────────
function hasFinanceAccess(consignmentId, orgId) {
  const fp = store.financePermissions[consignmentId] || {};
  return fp[orgId] === 'owner' || fp[orgId] === 'viewer';
}
function financeAccessibleIds(orgId) {
  return Object.keys(store.financePermissions).filter(cId => hasFinanceAccess(cId, orgId));
}

// Finance Permissions
app.get('/api/finance-permissions/:consignmentId', (req, res) =>
  res.json(store.financePermissions[req.params.consignmentId] || {}));
app.post('/api/finance-permissions/share', (req, res) => {
  const { consignmentId, targetOrgId, role, sharerOrgName, targetOrgName } = req.body;
  if (!store.financePermissions[consignmentId]) store.financePermissions[consignmentId] = {};
  store.financePermissions[consignmentId][targetOrgId] = role || 'viewer';
  const c = store.consignments.find(c => c.id === consignmentId);
  addLog('finance', 'Finance Access Granted', sharerOrgName,
    `Finance data for ${c?.ucr} shared with ${targetOrgName}.`);
  res.json({ success: true });
});

// Payments
app.get('/api/payments', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.payments.filter(p => p.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.payments.filter(p => ids.includes(p.consignmentId)));
});
app.post('/api/payments', (req, res) => {
  const { consignmentId, invoiceRef, amount, currency, dueDate, paymentMethod, payorOrgId, payeeOrgId, notes, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const payment = { id: genId(), consignmentId, ucr: c?.ucr || '', invoiceRef, amount: Number(amount), currency,
    dueDate, status: 'Unpaid', paidAmount: 0, paymentMethod: paymentMethod || 'Bank Transfer',
    payorOrgId, payeeOrgId, creatorOrgId, notes: notes || '', createdAt: now(), updatedAt: now() };
  store.payments.push(payment);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('payment', 'Payment Record Created', org?.name || creatorOrgId,
    `Payment of ${currency} ${Number(amount).toLocaleString()} created for ${c?.ucr}. Invoice: ${invoiceRef}. Due: ${dueDate}.`);
  res.json(payment);
});
app.put('/api/payments/:id/status', (req, res) => {
  const { status, paidAmount, orgId, orgName } = req.body;
  const payment = store.payments.find(p => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  const prev = payment.status;
  payment.status = status;
  if (paidAmount !== undefined) payment.paidAmount = Number(paidAmount);
  payment.updatedAt = now();
  addLog('payment', `Payment ${status}`, orgName || orgId,
    `${payment.ucr} (${payment.invoiceRef}): ${prev} → ${status}. Confirmed: ${payment.currency} ${payment.paidAmount.toLocaleString()}.`);
  res.json(payment);
});

// Letter of Credit
app.get('/api/lc', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.letterOfCredits.filter(l => l.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.letterOfCredits.filter(l => ids.includes(l.consignmentId)));
});
app.post('/api/lc', (req, res) => {
  const { consignmentId, issuingBank, advisingBank, applicant, amount, currency, expiryDate, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const docs = store.documents.filter(d => d.consignmentId === consignmentId);
  const lcNumber = `LC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const lc = { id: genId(), consignmentId, ucr: c?.ucr || '', lcNumber, issuingBank, advisingBank,
    beneficiary: c?.exporter || '', applicant: applicant || c?.importer || '',
    amount: Number(amount), currency, expiryDate, status: 'Draft',
    documentCompliance: docs.map(d => ({ docType: d.title, required: true, submitted: true, compliant: null })),
    creatorOrgId, createdAt: now() };
  store.letterOfCredits.push(lc);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('finance', 'LC Created', org?.name || creatorOrgId,
    `LC ${lcNumber} created for ${c?.ucr}. Amount: ${currency} ${Number(amount).toLocaleString()}. Bank: ${issuingBank}.`);
  res.json(lc);
});
app.put('/api/lc/:id/status', (req, res) => {
  const { status, orgId, orgName, docType, compliant } = req.body;
  const lc = store.letterOfCredits.find(l => l.id === req.params.id);
  if (!lc) return res.status(404).json({ error: 'Not found' });
  if (docType !== undefined) {
    const doc = lc.documentCompliance.find(d => d.docType === docType);
    if (doc) doc.compliant = compliant;
    return res.json(lc);
  }
  const prev = lc.status;
  lc.status = status;
  addLog('finance', `LC ${status}`, orgName || orgId,
    `LC ${lc.lcNumber} for ${lc.ucr}: ${prev} → ${status}.`);
  res.json(lc);
});

// Smart Contracts
app.get('/api/contracts', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.smartContracts.filter(c => c.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.smartContracts.filter(c => ids.includes(c.consignmentId)));
});
app.post('/api/contracts', (req, res) => {
  const { consignmentId, amount, currency, conditions, autoRelease, payorOrgId, payeeOrgId, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const contractHash = genHash();
  const contractRef = `SC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const contract = { id: genId(), consignmentId, ucr: c?.ucr || '', contractRef, contractHash,
    payorOrgId, payeeOrgId, amount: Number(amount), currency,
    conditions: (conditions || []).map((cond, i) => ({ id: `cond-${i}`, description: cond.description, docType: cond.docType || null, met: false, metAt: null })),
    status: 'Active', autoRelease: autoRelease !== false, creatorOrgId, createdAt: now(), settledAt: null };
  store.smartContracts.push(contract);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('finance', 'Smart Contract Deployed', org?.name || creatorOrgId,
    `Contract ${contractRef} deployed for ${c?.ucr}. ${contract.conditions.length} release conditions. Hash: ${contractHash}.`);
  res.json(contract);
});
app.put('/api/contracts/:id/condition/:condId', (req, res) => {
  const { orgId, orgName } = req.body;
  const contract = store.smartContracts.find(c => c.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Not found' });
  const cond = contract.conditions.find(c => c.id === req.params.condId);
  if (!cond) return res.status(404).json({ error: 'Condition not found' });
  cond.met = true; cond.metAt = now();
  addLog('finance', 'Condition Verified', orgName || orgId,
    `"${cond.description}" verified on contract ${contract.contractRef} (${contract.ucr}).`);
  const allMet = contract.conditions.every(c => c.met);
  if (allMet && contract.status === 'Active') {
    contract.status = 'Conditions Met';
    addLog('finance', 'All Conditions Met', orgName || orgId,
      `All ${contract.conditions.length} conditions satisfied on ${contract.contractRef}. ${contract.autoRelease ? 'Auto-releasing...' : 'Awaiting release.'}`);
    if (contract.autoRelease) {
      contract.status = 'Released'; contract.settledAt = now();
      addLog('finance', 'Payment Auto-Released', orgName || orgId,
        `Contract ${contract.contractRef} executed. ${contract.currency} ${contract.amount.toLocaleString()} released. Hash: ${contract.contractHash}.`);
    }
  }
  res.json(contract);
});
app.put('/api/contracts/:id/status', (req, res) => {
  const { status, orgId, orgName } = req.body;
  const contract = store.smartContracts.find(c => c.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Not found' });
  const prev = contract.status;
  contract.status = status;
  if (status === 'Settled' || status === 'Released') contract.settledAt = now();
  addLog('finance', `Contract ${status}`, orgName || orgId,
    `Contract ${contract.contractRef} (${contract.ucr}): ${prev} → ${status}. Hash: ${contract.contractHash}.`);
  res.json(contract);
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

// ── WebSocket (attached to HTTP server — single port, works on Railway) ──
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
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

function seedFinanceData() {
  if (NODE_ID !== 'alpha') return;
  // Only seed once
  if (store.payments.length > 0 || store.letterOfCredits.length > 0 || store.smartContracts.length > 0) return;

  // Pick two MA-NG consignments to showcase finance
  const c1 = store.consignments.find(c => c.ucr === 'UCR-2026-MA-NG-00101');
  const c2 = store.consignments.find(c => c.ucr === 'UCR-2026-MA-NG-00102');
  if (!c1 || !c2) return;

  const atlas = 'org1';
  const attijari = 'org7';
  const accessBank = 'org8';
  const ts1 = '2026-02-18T09:00:00.000Z';
  const ts2 = '2026-02-20T11:30:00.000Z';

  // ── Finance permissions: grant banks viewer access ──
  store.financePermissions[c1.id][attijari]  = 'viewer';
  store.financePermissions[c1.id][accessBank] = 'viewer';
  store.financePermissions[c2.id][attijari]  = 'viewer';
  store.financePermissions[c2.id][accessBank] = 'viewer';

  // ── Payments ──
  const pay1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    invoiceRef: 'INV-APM-2026-0101', amount: 340000, currency: 'USD',
    dueDate: '2026-04-30', status: 'Partially Paid', paidAmount: 120000,
    paymentMethod: 'Letter of Credit',
    payorOrgId: 'org5', payeeOrgId: atlas, creatorOrgId: atlas,
    notes: 'First instalment received. Balance due on BL presentation.', createdAt: ts1, updatedAt: ts1,
  };
  const pay2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    invoiceRef: 'INV-APM-2026-0102', amount: 288000, currency: 'EUR',
    dueDate: '2026-03-28', status: 'Overdue', paidAmount: 0,
    paymentMethod: 'Open Account',
    payorOrgId: 'org6', payeeOrgId: atlas, creatorOrgId: atlas,
    notes: 'Payment overdue — buyer requested 15-day extension pending vessel arrival.', createdAt: ts2, updatedAt: ts2,
  };
  store.payments.push(pay1, pay2);

  // ── Letters of Credit ──
  const docs1 = store.documents.filter(d => d.consignmentId === c1.id);
  const docs2 = store.documents.filter(d => d.consignmentId === c2.id);
  const lc1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    lcNumber: 'LC-2026-ATW-00101',
    issuingBank: 'Bank 1', advisingBank: 'Bank 2',
    beneficiary: 'AtlasPhosphate S.A.', applicant: 'PrimeFert Nigeria Ltd',
    amount: 340000, currency: 'USD', expiryDate: '2026-07-31',
    status: 'Confirmed',
    documentCompliance: docs1.map((d, i) => ({ docType: d.title, required: true, submitted: true, compliant: i < 4 ? true : null })),
    creatorOrgId: atlas, createdAt: ts1,
  };
  const lc2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    lcNumber: 'LC-2026-ATW-00102',
    issuingBank: 'Bank 1', advisingBank: 'Bank 2',
    beneficiary: 'AtlasPhosphate S.A.', applicant: 'TradeLink International Ltd',
    amount: 288000, currency: 'EUR', expiryDate: '2026-06-30',
    status: 'Issued',
    documentCompliance: docs2.map(d => ({ docType: d.title, required: true, submitted: false, compliant: null })),
    creatorOrgId: atlas, createdAt: ts2,
  };
  store.letterOfCredits.push(lc1, lc2);

  // ── Smart Contracts ──
  const hash1 = genHash();
  const hash2 = genHash();
  const sc1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    contractRef: 'SC-2026-ATW-0101', contractHash: hash1,
    payorOrgId: 'org5', payeeOrgId: atlas,
    amount: 340000, currency: 'USD',
    conditions: [
      { id: 'cond-0', description: 'Bill of Lading (eBL) verified and presented', docType: 'Bill of Lading (eBL)', met: true,  metAt: '2026-03-01T08:00:00.000Z' },
      { id: 'cond-1', description: 'Certificate of Origin (AfCFTA) confirmed',    docType: 'Certificate of Origin (AfCFTA)', met: true,  metAt: '2026-03-01T09:15:00.000Z' },
      { id: 'cond-2', description: 'Commercial Invoice approved by advising bank', docType: 'Commercial Invoice', met: false, metAt: null },
    ],
    status: 'Active', autoRelease: true, creatorOrgId: atlas,
    createdAt: ts1, settledAt: null,
  };
  const sc2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    contractRef: 'SC-2026-ATW-0102', contractHash: hash2,
    payorOrgId: 'org6', payeeOrgId: atlas,
    amount: 288000, currency: 'EUR',
    conditions: [
      { id: 'cond-0', description: 'Goods delivered to Apapa Port — vessel confirmed', docType: 'Bill of Lading (eBL)', met: false, metAt: null },
      { id: 'cond-1', description: 'Export Declaration cleared by Nigeria Customs',     docType: 'Export Declaration',          met: false, metAt: null },
    ],
    status: 'Active', autoRelease: true, creatorOrgId: atlas,
    createdAt: ts2, settledAt: null,
  };
  store.smartContracts.push(sc1, sc2);

  // Seed tangle entries for all seeded finance records
  const seedTs = (t, ts) => { if (!store.tangleLog.some(e => e.details && e.details.includes(t))) store.tangleLog.push({ id: genId(), timestamp: ts, hash: genHash(), type: 'finance', action: 'Finance Seeded', actor: 'AtlasPhosphate S.A.', details: t }); };
  seedTs(`Payment INV-APM-2026-0101 created for ${c1.ucr}. USD 340,000. Partially Paid.`, ts1);
  seedTs(`Payment INV-APM-2026-0102 created for ${c2.ucr}. EUR 288,000. Overdue.`, ts2);
  seedTs(`LC LC-2026-ATW-00101 created for ${c1.ucr}. Amount: USD 340,000. Status: Confirmed.`, ts1);
  seedTs(`LC LC-2026-ATW-00102 created for ${c2.ucr}. Amount: EUR 288,000. Status: Issued.`, ts2);
  seedTs(`Contract SC-2026-ATW-0101 deployed for ${c1.ucr}. 3 release conditions. Hash: ${hash1}.`, ts1);
  seedTs(`Contract SC-2026-ATW-0102 deployed for ${c2.ucr}. 2 release conditions. Hash: ${hash2}.`, ts2);
  saveTangleLog();

  console.log(`[${NODE_NAME}] Seeded finance data: 2 payments, 2 LCs, 2 smart contracts`);
}

// Seed output folder data then start
seedOutputConsignments();
seedFinanceData();
httpServer.listen(PORT, () => { console.log(`[${NODE_NAME}] Listening on port ${PORT} (HTTP + WS on same port)`); });
