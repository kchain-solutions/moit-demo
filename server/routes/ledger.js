import { Router } from 'express';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { store } from '../store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

const router = Router();

router.get('/api/ledger', (req, res) => res.json(store.ledgerLog));

router.get('/api/peer/orgs', (req, res) => {
  if (!store.peerConnected) return res.json([]);
  let orgs = store.peerOrgs;
  if (req.query.q) orgs = orgs.filter(o => o.name.toLowerCase().includes(req.query.q.toLowerCase()));
  res.json(orgs);
});

// SPA fallback
router.get('*', (req, res) => {
  const f = path.join(publicDir, 'index.html');
  existsSync(f) ? res.sendFile(f) : res.status(404).json({ error: 'Build first' });
});

export default router;
