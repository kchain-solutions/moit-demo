import { Router } from 'express';
import multer from 'multer';
import { genId, genHash, now } from '../utils.js';
import { store, addLog } from '../store.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

router.get('/api/documents', (req, res) => {
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

router.post('/api/documents', upload.single('file'), (req, res) => {
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

router.get('/api/documents/:id/download', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (!doc.fileBase64) return res.status(404).json({ error: 'File not stored \u2014 upload a real file to enable download' });
  res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
  res.send(Buffer.from(doc.fileBase64, 'base64'));
});

router.get('/api/documents/:id/xml', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.fileBase64 && doc.filename?.endsWith('.xml')) {
    return res.json({ content: Buffer.from(doc.fileBase64, 'base64').toString('utf-8'), docType: doc.docType });
  }
  res.status(400).json({ error: 'Not an XML file or not available' });
});

export default router;
