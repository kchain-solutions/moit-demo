import React, { useState } from 'react';
import { useNode } from '../context/NodeContext';

export default function Login() {
  const { login } = useNode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const port = window.location.port;

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

  return (
    <div className="login-pg">
      <div className="login-box">
        <h1>ADAPT</h1>
        <p className="sub">Distributed Trade Platform — Sign in to your organisation</p>
        <div style={{ padding: '8px 12px', background: 'var(--gr50)', borderRadius: 6, marginBottom: 16, fontSize: 11, color: 'var(--gr500)' }}>
          Node: <strong style={{ color: 'var(--g700)' }}>{port === '4001' ? 'Node Beta' : 'Node Alpha'}</strong> — Port {port}
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
          <button type="submit" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 20, padding: 12, background: 'var(--g50)', borderRadius: 8, fontSize: 11, color: 'var(--gr600)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--g800)' }}>Demo Credentials</div>
          {port === '4001' ? (
            <div>importer / demo</div>
          ) : (
            <><div>exporter / demo</div><div>customs / demo</div></>
          )}
        </div>
      </div>
    </div>
  );
}
