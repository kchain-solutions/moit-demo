import http from 'http';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT, NODE_NAME } from './store.js';
import { seedConsignments, seedFinanceData } from './seed.js';
import { setupWebSocket } from './ws.js';

// Route modules
import configRoutes from './routes/config.js';
import authRoutes from './routes/auth.js';
import nodeRoutes from './routes/node.js';
import orgRoutes from './routes/orgs.js';
import consignmentRoutes from './routes/consignments.js';
import documentRoutes from './routes/documents.js';
import permissionRoutes from './routes/permissions.js';
import financeRoutes from './routes/finance.js';
import ledgerRoutes from './routes/ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const publicDir = path.join(__dirname, 'public');
if (existsSync(publicDir)) app.use(express.static(publicDir));

// Mount routes
app.use(configRoutes);
app.use(authRoutes);
app.use(nodeRoutes);
app.use(orgRoutes);
app.use(consignmentRoutes);
app.use(documentRoutes);
app.use(permissionRoutes);
app.use(financeRoutes);
app.use(ledgerRoutes); // must be last (contains SPA wildcard fallback)

// Seed demo data
seedConsignments();
seedFinanceData();

// Start server — skipped on Vercel (serverless handles the lifecycle)
const IS_VERCEL = !!process.env.VERCEL;
const httpServer = http.createServer(app);

if (!IS_VERCEL) {
  setupWebSocket(httpServer);
  httpServer.listen(PORT, () => { console.log(`[${NODE_NAME}] Listening on port ${PORT} (HTTP + WS on same port)`); });
}

// Export for Vercel's @vercel/node runner
export default app;
