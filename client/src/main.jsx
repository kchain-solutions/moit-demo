import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConfigProvider } from './context/ConfigContext';
import { NodeProvider } from './context/NodeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider>
      <NodeProvider><App /></NodeProvider>
    </ConfigProvider>
  </React.StrictMode>
);
