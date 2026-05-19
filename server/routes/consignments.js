import { Router } from 'express';
import { genId, now } from '../utils.js';
import { store, addLog } from '../store.js';

const router = Router();

router.get('/api/consignments', (req, res) => {
  const { orgId } = req.query;
  res.json(store.consignments.filter(c => {
    const p = store.permissions[c.id] || {};
    return p[orgId] === 'owner' || p[orgId] === 'viewer';
  }));
});

router.post('/api/consignments', (req, res) => {
  const { ucr, commercialInvoiceNo, exportDeclarationNo, creatorOrgId, description } = req.body;
  const org = store.orgs.find(o => o.id === creatorOrgId);
  if (!org) return res.status(400).json({ error: 'Org not found' });
  const c = { id: genId(), ucr, commercialInvoiceNo: commercialInvoiceNo || '', exportDeclarationNo: exportDeclarationNo || '', description: description || '', creatorOrgId, creatorOrgName: org.name, createdAt: now(), documentCount: 0, status: 'Draft' };
  store.consignments.push(c);
  store.permissions[c.id] = { [creatorOrgId]: 'owner' };
  addLog('document', 'Consignment Created', org.name, `Digital twin created: ${ucr}. Anchored on the ledger.`);
  res.json(c);
});

export default router;
