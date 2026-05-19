import { Router } from 'express';
import { getConfig } from '../config.js';
import { genDID } from '../utils.js';
import { store, NODE_ID, NODE_NAME, addLog, wsRefs } from '../store.js';

const router = Router();

// ── Credential validation ──
const cfg = getConfig();
const BLACKLISTED = cfg?.credentials?.blacklisted ?? [];
const EXPIRED = cfg?.credentials?.expired ?? [];
const SUSPENDED = cfg?.credentials?.suspended ?? [];

function validateCredential(regNumber) {
  const n = (regNumber || '').toUpperCase().trim();
  if (n.length < 6) return { valid: false, reason: 'Registration number too short (minimum 6 characters)', failStep: 0 };
  if (BLACKLISTED.includes(n)) return { valid: false, reason: 'Registration number is on the DENIED list \u2014 organisation not recognised by any registry', failStep: 1 };
  if (n.startsWith('X') || n.startsWith('0')) return { valid: false, reason: 'Invalid prefix \u2014 number not found in any recognised national or international registry', failStep: 1 };
  if (EXPIRED.includes(n)) return { valid: false, reason: 'Registration has EXPIRED \u2014 licence is no longer active. Organisation must renew before DID issuance.', failStep: 2 };
  if (SUSPENDED.includes(n)) return { valid: false, reason: 'Registration is SUSPENDED \u2014 organisation is under regulatory review. DID issuance blocked.', failStep: 2 };
  const prefix = n.split('-')[0];
  const typeMap = cfg?.credentials?.registrationTypes ?? {};
  return { valid: true, type: typeMap[prefix] || 'National Registration Number', formatted: n };
}

function getAttestingAuthority(org) {
  const authorities = getConfig()?.credentials?.attestationAuthorities;
  if (authorities) {
    const match = authorities.find(a => org.role?.includes(a.roleMatch));
    if (match) return match.authority;
  }
  return getConfig()?.credentials?.defaultAuthority ?? 'National Business Registry';
}

function syncOrgsToPeer() { wsRefs.syncOrgsToPeer(); }

// ── Routes ──
router.get('/api/orgs', (req, res) => res.json(store.orgs.map(o => ({ ...o, password: undefined }))));

router.get('/api/orgs/all', (req, res) => {
  const local = store.orgs.map(o => ({ ...o, password: undefined, nodeId: NODE_ID, nodeName: NODE_NAME, local: true }));
  const remote = store.peerConnected ? store.peerOrgs.map(o => ({ ...o, local: false })) : [];
  res.json([...local, ...remote]);
});

router.put('/api/orgs/:id', (req, res) => {
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, name: req.body.name ?? o.name, role: req.body.role ?? o.role } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  if (org) syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});

router.post('/api/orgs/:id/register', (req, res) => {
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

router.post('/api/orgs/validate-credential', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  if (v.valid && req.body.orgId) {
    const org = store.orgs.find(o => o.id === req.body.orgId);
    if (org) v.attestedBy = getAttestingAuthority(org);
  }
  res.json(v);
});

export default router;
