const BASE = window.location.origin;
async function req(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({ error: 'Failed' })); throw new Error(e.error || 'Failed'); }
  return r.json();
}
export const api = {
  login: (u, p) => req('/api/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  getNode: () => req('/api/node'),
  discoverNodes: () => req('/api/node/discover'),
  connectNode: () => req('/api/node/connect', { method: 'POST' }),
  disconnectNode: () => req('/api/node/disconnect', { method: 'POST' }),
  getOrgs: () => req('/api/orgs'),
  getAllOrgs: () => req('/api/orgs/all'),
  updateOrg: (id, d) => req(`/api/orgs/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  registerOrg: (id, regNumber) => req(`/api/orgs/${id}/register`, { method: 'POST', body: JSON.stringify({ regNumber }) }),
  validateCredential: (regNumber) => req('/api/orgs/validate-credential', { method: 'POST', body: JSON.stringify({ regNumber }) }),
  getConsignments: (orgId) => req(`/api/consignments?orgId=${orgId}`),
  createConsignment: (d) => req('/api/consignments', { method: 'POST', body: JSON.stringify(d) }),
  getDocuments: (orgId, cId) => req(`/api/documents?orgId=${orgId}${cId ? `&consignmentId=${cId}` : ''}`),
  uploadDocument: (fd) => fetch(`${BASE}/api/documents`, { method: 'POST', body: fd }).then(r => r.json()),
  downloadUrl: (id) => `${BASE}/api/documents/${id}/download`,
  getPermissions: (cId) => req(`/api/permissions/${cId}`),
  shareConsignment: (d) => req('/api/permissions/share', { method: 'POST', body: JSON.stringify(d) }),
  revokeAccess: (d) => req('/api/permissions/revoke', { method: 'POST', body: JSON.stringify(d) }),
  getTangle: () => req('/api/tangle'),
  searchPeerOrgs: (q) => req(`/api/peer/orgs?q=${encodeURIComponent(q || '')}`),
};
