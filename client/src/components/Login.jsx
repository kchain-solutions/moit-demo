import React, { useState } from 'react';
import { useNode } from '../context/NodeContext';
import { Globe } from 'lucide-react';

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

  const handleQuick = (u) => { setUsername(u); setPassword('demo'); };

  return (
    <div className="login-pg">
      <div className="login-box">
        <div className="login-brand">
          <div className="login-logo"><Globe /></div>
          <h1>ADAPT</h1>
        </div>
        <p className="sub">Global Trade Operations — Sign in to your organisation</p>

        <div className="node-badge">
          Connected to: <strong>{port === '4001' ? 'Node Beta (Importer)' : 'Node Alpha (Exporter / Customs)'}</strong>
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
          {port === '4001' ? (
            <div className="cred-row" style={{ cursor: 'pointer' }} onClick={() => handleQuick('importer')}>
              <span className="role">Importer</span>
              <span>importer / demo</span>
            </div>
          ) : (
            <>
              <div className="cred-row" style={{ cursor: 'pointer' }} onClick={() => handleQuick('exporter')}>
                <span className="role">Exporter</span>
                <span>exporter / demo</span>
              </div>
              <div className="cred-row" style={{ cursor: 'pointer' }} onClick={() => handleQuick('customs')}>
                <span className="role">Customs</span>
                <span>customs / demo</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
