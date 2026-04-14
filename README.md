# ADAPT System Demo v2

A decentralised trade platform demo with two real nodes communicating via WebSocket P2P, showcasing digital identity (DID), cross-border document exchange, and permissioned data sharing on simulated IOTA Tangle.

## Quick Start

```bash
npm install
npm run dev
```

This builds the React client and starts **two nodes simultaneously**:
- **Node Alpha** — http://localhost:4000 (Exporter Co. + Customs Authority)
- **Node Beta** — http://localhost:4001 (Importer Co.)

Open both URLs in separate browser tabs. Log in with the demo credentials shown on the login page.

## Architecture

```
┌─────────────────┐     WebSocket P2P     ┌─────────────────┐
│   Node Alpha    │◄───────────────────────►│   Node Beta     │
│   Port 4000     │    ws://4010 ↔ 4011    │   Port 4001     │
│                 │                         │                 │
│  Exporter Co.   │                         │  Importer Co.   │
│  Customs Auth.  │                         │                 │
│                 │                         │                 │
│  Express + WS   │                         │  Express + WS   │
│  In-memory store│                         │  In-memory store│
└────────┬────────┘                         └────────┬────────┘
         │                                           │
         └──────────── IOTA Tangle (simulated) ──────┘
```

Each node is a separate Express server with its own:
- In-memory data store (orgs, consignments, documents, permissions, tangle log)
- WebSocket server for client push updates
- P2P WebSocket connection to the peer node

## Features

### Login System
- Each organisation has its own username/password
- Separate sessions per browser tab
- Node Alpha: `exporter/demo`, `customs/demo`
- Node Beta: `importer/demo`

### Digital Identity (DIDs)
- Register organisations with a business registration number
- Animated 5-step verification simulation
- W3C DID format: `did:iota:0x...`
- Verifiable Credentials linked to DID
- **Editable org names** — click edit icon to rename during demos

### Consignments (Digital Twins)
- UCR as primary identifier
- Commercial Invoice # and Export Declaration # as secondary IDs
- Documents anchor to the consignment twin
- **File upload** — actual files stored in memory (base64), downloadable by shared orgs

### Cross-Node Sharing
- Share consignments + docs to orgs on the peer node
- P2P WebSocket transfers the full data package
- Peer orgs are searchable after handshake
- Connection status visible in sidebar and dashboard

### Permissions
- Visual access control matrix
- Click cells to grant/revoke
- Owner indicated with crown icon
- All changes anchored on tangle with audit trail

### Tangle Explorer
- Filterable by type: identity, document, permission, network
- Colour-coded entries
- Hashes, timestamps, actors
- Events sync across both nodes in real time

## Demo Credentials

| Node | Username | Password | Organisation |
|------|----------|----------|-------------|
| Alpha (4000) | exporter | demo | Exporter Co. |
| Alpha (4000) | customs | demo | Customs Authority |
| Beta (4001) | importer | demo | Importer Co. |

## Customising Org Names
Click the **edit icon** on any org card in the Identity page to rename it live during a demo. Changes sync to the peer node.

## Tech Stack
- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: React 18, Vite, Lucide icons
- **Fonts**: DM Sans, JetBrains Mono
- **Storage**: In-memory (resets on restart)
- **File handling**: Multer (upload), base64 in-memory storage
