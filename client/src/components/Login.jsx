import React, { useState } from 'react';
import { useNode } from '../context/NodeContext';

const ALPHA_CREDS = [
  { role: 'Manufacturer - Vietnam',                    username: 'tng',         label: 'TNG Investment & Trading JSC' },
  { role: 'Customs Authority - Vietnam',               username: 'vncustoms',   label: 'General Department of Vietnam Customs' },
  { role: 'Certificate of Origin Authority - Vietnam', username: 'moit',        label: 'Ministry of Industry and Trade (MOIT)' },
  { role: 'Input Supplier - South Korea',              username: 'hyosung',     label: 'Hyosung TNS Co., Ltd' },
  { role: 'Quality Inspector - Vietnam',               username: 'bvinspector', label: 'Bureau Veritas Vietnam' },
  { role: 'Port Authority - Ho Chi Minh City',         username: 'catlaiport',  label: 'Cat Lai Port Authority' },
  { role: 'Freight Forwarder - Vietnam',               username: 'gemadept',    label: 'Gemadept Logistics' },
  { role: 'Carrier - Vietnam',                         username: 'maersk',      label: 'Maersk Vietnam' },
  { role: 'Financier - Vietnam',                       username: 'financier1',  label: 'Vietcombank' },
  { role: 'Financier - International',                 username: 'financier2',  label: 'HSBC Vietnam' },
];

const BETA_CREDS = [
  { role: 'Importing Buyer - United States',   username: 'nike',      label: 'Nike Inc.' },
  { role: 'Importing Buyer - EU',              username: 'nikeeu',    label: 'Nike Europe B.V.' },
  { role: 'Customs Authority - United States', username: 'uscbp',     label: 'US Customs and Border Protection' },
  { role: 'Customs Authority - EU',            username: 'eucustoms', label: 'EU Customs (Netherlands)' },
];

export default function Login() {
  const { login } = useNode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Detect node via port (direct) or ?node= param / cookie (via proxy)
  const port = window.location.port;
  const nodeParam = new URLSearchParams(window.location.search).get('node');
  const cookieNode = document.cookie.match(/adapt-node=(\w+)/)?.[1];
  const isBeta = port === '4001' || nodeParam === 'beta' || (nodeParam !== 'alpha' && cookieNode === 'beta');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  const handleQuick = (u) => {
    setUsername(u);
    setPassword('demo');
  };

  const creds = isBeta ? BETA_CREDS : ALPHA_CREDS;

  return (
    <div className="login-pg">
      <div className="login-box">
        <div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <img src="/vietnam.png" alt="Vietnam" className="login-logo-img" style={{ height: 36, width: 36, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, textAlign: 'left' }}>
            <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>TWIN Vietnam</span>
            
          </div>
        </div>
        <p className="sub" style={{ marginTop: 10 }}>Trade & Logistics Platform — Sign in to your organisation</p>

        <div className="node-badge">
          Node: <strong>{isBeta ? 'Beta — Importers / Destination Markets' : 'Alpha — Vietnam Export Corridor'}</strong>
        </div>

        {error && <div className="err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
          </div>
          <div className="fg">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          <button type="submit" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-creds">
          <div className="dc-title">Quick Sign-In</div>
          {creds.map(c => (
            <div key={c.username} className="cred-row" style={{ cursor: 'pointer', padding: '5px 0' }} onClick={() => handleQuick(c.username)}>
              <span className="role">{c.role}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11.5 }}>{c.label}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10.5 }}>{c.username} / demo</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
