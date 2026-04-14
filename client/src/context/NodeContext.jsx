import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

const Ctx = createContext();

export function NodeProvider({ children }) {
  const [user, setUser] = useState(null);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerOrgs, setPeerOrgs] = useState([]);
  const [tangleLog, setTangleLog] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const wsRef = useRef(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    setUser(data.org);
    setNodeInfo({ nodeId: data.nodeId, nodeName: data.nodeName, nodeIp: data.nodeIp });
    return data;
  }, []);
  const logout = useCallback(() => { setUser(null); setNodeInfo(null); setPeerConnected(false); setPeerOrgs([]); }, []);

  useEffect(() => {
    if (!user) return;
    const wsPort = window.location.port === '4001' ? 4011 : 4010;
    const ws = new WebSocket(`ws://localhost:${wsPort}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'PEER_STATUS') { setPeerConnected(msg.connected); if (msg.peerOrgs) setPeerOrgs(msg.peerOrgs); if (!msg.connected) setPeerOrgs([]); }
      else if (msg.type === 'PEER_ORGS') setPeerOrgs(msg.peerOrgs);
      else if (msg.type === 'TANGLE_UPDATE') setTangleLog(msg.log);
      else if (msg.type === 'DATA_SYNC') refresh();
    };
    api.getTangle().then(setTangleLog).catch(() => {});
    api.getNode().then(info => { setPeerConnected(info.peerConnected); setNodeInfo(prev => ({ ...prev, ...info })); }).catch(() => {});
    return () => ws.close();
  }, [user, refresh]);

  // Poll peer status
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => {
      api.getNode().then(i => setPeerConnected(i.peerConnected)).catch(() => {});
      api.searchPeerOrgs('').then(setPeerOrgs).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [user]);

  return (
    <Ctx.Provider value={{ user, nodeInfo, peerConnected, peerOrgs, tangleLog, refreshKey, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNode() { return useContext(Ctx); }
