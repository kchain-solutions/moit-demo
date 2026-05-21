import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, resetStore, seedStore, store } from '../helpers/setup.js';

const app = createApp();

describe('GET /api/documents', () => {
  beforeEach(() => {
    resetStore();
    seedStore();
  });

  it('returns documents for a consignment', async () => {
    const cId = store.consignments[0].id;
    const res = await request(app).get(`/api/documents?orgId=org1&consignmentId=${cId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // fileBase64 should be stripped from response
    for (const doc of res.body) {
      expect(doc.fileBase64).toBeUndefined();
    }
  });
});

describe('POST /api/documents', () => {
  beforeEach(() => {
    resetStore();
    seedStore();
  });

  it('creates a document for a consignment', async () => {
    const cId = store.consignments[0].id;
    const res = await request(app)
      .post('/api/documents')
      .field('consignmentId', cId)
      .field('title', 'Test Document')
      .field('docType', 'General')
      .field('creatorOrgId', 'org1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test Document');
  });
});

describe('GET /api/documents/:id/download', () => {
  beforeEach(() => {
    resetStore();
    seedStore();
  });

  it('downloads an existing document', async () => {
    const doc = store.documents[0];
    const res = await request(app).get(`/api/documents/${doc.id}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('returns 404 for nonexistent document', async () => {
    const res = await request(app).get('/api/documents/nonexistent/download');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/documents/:id/xml', () => {
  beforeEach(() => {
    resetStore();
    seedStore();
  });

  it('returns XML content for XML documents', async () => {
    const xmlDoc = store.documents.find(d => d.filename?.endsWith('.xml'));
    if (!xmlDoc) return; // skip if no XML docs
    const res = await request(app).get(`/api/documents/${xmlDoc.id}/xml`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('content');
    expect(res.body.content).toContain('<?xml');
  });
});
