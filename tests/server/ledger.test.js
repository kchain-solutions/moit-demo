import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, resetStore, seedStore, store } from '../helpers/setup.js';

const app = createApp();

describe('GET /api/ledger', () => {
  beforeEach(() => {
    resetStore();
    seedStore();
  });

  it('returns ledger log entries', async () => {
    const res = await request(app).get('/api/ledger');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('type');
    expect(res.body[0]).toHaveProperty('action');
    expect(res.body[0]).toHaveProperty('timestamp');
  });
});

describe('GET /api/peer/orgs', () => {
  it('returns empty when not connected', async () => {
    store.peerConnected = false;
    const res = await request(app).get('/api/peer/orgs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns peer orgs when connected', async () => {
    store.peerConnected = true;
    store.peerOrgs = [{ id: 'peer1', name: 'Peer Org', role: 'Test' }];
    const res = await request(app).get('/api/peer/orgs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Peer Org');
    // Cleanup
    store.peerConnected = false;
    store.peerOrgs = [];
  });

  it('filters peer orgs by query', async () => {
    store.peerConnected = true;
    store.peerOrgs = [
      { id: 'p1', name: 'Alpha Corp', role: 'Test' },
      { id: 'p2', name: 'Beta Inc', role: 'Test' },
    ];
    const res = await request(app).get('/api/peer/orgs?q=alpha');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alpha Corp');
    store.peerConnected = false;
    store.peerOrgs = [];
  });
});
