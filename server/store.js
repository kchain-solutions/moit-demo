import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import { genId, genHash, now } from './utils.js';
import { loadConfig, getConfig } from './config.js';

// Load corridor config before store init (must happen before getConfig() calls)
loadConfig();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

// ── CLI args & env ──
const args = process.argv.slice(2).reduce((a, c) => { const [k, v] = c.replace('--', '').split('='); a[k] = v; return a; }, {});
export const PORT     = parseInt(process.env.PORT     || args.port || '4000');
export const WS_PORT  = parseInt(process.env.WS_PORT  || args.ws   || '4010');
export const NODE_ID  = process.env.NODE_ID   || args.id   || 'alpha';
export const NODE_NAME= process.env.NODE_NAME || args.name || 'Node Alpha';
export const PEER_URL = process.env.PEER_URL  || args.peer || null;
export const NODE_IP  = `127.0.0.1:${PORT}`;

const LEDGER_FILE = path.join(DATA_DIR, `ledger-${NODE_ID}.json`);

function loadLedgerLog() {
  try {
    if (existsSync(LEDGER_FILE)) {
      const raw = JSON.parse(readFileSync(LEDGER_FILE, 'utf-8'));
      const savedCorridor = raw?._corridorId;
      const currentCorridor = getConfig()?.corridor?.id;
      if (savedCorridor && currentCorridor && savedCorridor !== currentCorridor) {
        console.log(`[${NODE_NAME}] Corridor changed (${savedCorridor} \u2192 ${currentCorridor}), resetting ledger`);
        return [];
      }
      return raw?.entries ?? (Array.isArray(raw) ? raw : []);
    }
  } catch (e) { console.error(`[${NODE_NAME}] Failed to load ledger log:`, e.message); }
  return [];
}

function saveLedgerLog() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const corridorId = getConfig()?.corridor?.id;
    const wrapper = { _corridorId: corridorId || null, entries: store.ledgerLog };
    writeFileSync(LEDGER_FILE, JSON.stringify(wrapper, null, 2));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to save ledger log:`, e.message); }
}

// ── Store init ──
function initOrgs() {
  const cfgOrgs = getConfig()?.nodes?.[NODE_ID]?.orgs;
  if (cfgOrgs) return cfgOrgs.map(o => ({ ...o, did: null, verified: false, regNumber: null }));
  return [];
}

export const store = {
  orgs: initOrgs(),
  consignments: [], documents: [], permissions: {}, docPermissions: {},
  payments: [], letterOfCredits: [], smartContracts: [], financePermissions: {},
  ledgerLog: loadLedgerLog(),
  peerOrgs: [], peerConnected: false,
};

// ── WebSocket references (set by ws.js) ──
export const wsRefs = {
  peerWs: null,
  peerInWs: null,
  broadcastToClients: () => {},
  connectToPeer: () => {},
  syncOrgsToPeer: () => {},
};

// ── Ledger helpers ──
export function addLog(type, action, actor, details, extra = {}) {
  const entry = { id: genId(), timestamp: now(), hash: genHash(), type, action, actor, details, ...extra };
  store.ledgerLog.unshift(entry);
  saveLedgerLog();
  wsRefs.broadcastToClients({ type: 'LEDGER_UPDATE', log: store.ledgerLog });
  const activePeer = [wsRefs.peerWs, wsRefs.peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (store.peerConnected && activePeer) activePeer.send(JSON.stringify({ type: 'LEDGER_ENTRY', entry }));
  return entry;
}

export function seedLog(type, action, actor, details, timestamp) {
  if (store.ledgerLog.some(e => e.details === details)) return;
  store.ledgerLog.push({ id: genId(), timestamp, hash: genHash(), type, action, actor, details });
}

export { saveLedgerLog };
