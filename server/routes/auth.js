import { Router } from 'express';
import { store, NODE_ID, NODE_NAME, NODE_IP } from '../store.js';

const router = Router();

router.post('/api/login', (req, res) => {
  const org = store.orgs.find(o => o.username === req.body.username && o.password === req.body.password);
  if (!org) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ org: { ...org, password: undefined }, nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP });
});

export default router;
