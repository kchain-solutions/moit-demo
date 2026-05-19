# Trade Corridor Demo Platform

A two-node interactive demo showcasing cross-border trade infrastructure for configurable trade corridors. It demonstrates how digital identity, document exchange, and trade finance can interoperate across organisations and jurisdictions without replacing existing systems.

The platform is **corridor-agnostic**: all organisations, documents, credentials, geography, and branding are driven by a JSON configuration file. Switch corridors by changing the config.

---

## Quick Start (Local)

```bash
npm install
npm run demo
```

Builds the React client and starts two live nodes plus a routing proxy:

| Node | URL | Description |
|------|-----|-------------|
| Alpha | http://localhost:4000 | Export corridor (manufacturers, customs, authorities, logistics, financiers) |
| Beta | http://localhost:4001 | Import corridor (buyers, destination customs) |
| Proxy | http://localhost:4002 | Single-URL access with `?node=alpha` or `?node=beta` |

Open both node URLs in separate browser windows and sign in with the credentials shown on each login page (password is `demo` for all accounts).

### Switching corridors

The default config is `configs/vietnam-us.json`. To use a different corridor:

```bash
CONFIG_FILE=configs/adapt-africa.json npm run demo
```

Available configs:
- `configs/vietnam-us.json` — Vietnam garment/footwear export to US/EU
- `configs/adapt-africa.json` — ADAPT Africa trade corridor

---

## Demo Credentials

Credentials are defined in the active corridor config file. The password is `demo` for all accounts.

To see which organisations are available, check the `nodes.alpha.orgs` and `nodes.beta.orgs` arrays in the active config file, or simply open the login page which shows quick-login buttons for all configured organisations.

### Example: Vietnam-US corridor (`configs/vietnam-us.json`)

**Node Alpha — Export Corridor (http://localhost:4000)**

| Organisation | Username | Role |
|---|---|---|
| TNG Investment & Trading JSC | `tng` | Manufacturer |
| General Department of Vietnam Customs | `vncustoms` | Customs Authority |
| Ministry of Industry and Trade (MOIT) | `moit` | Certificate of Origin Authority |
| Hyosung TNS Co., Ltd | `hyosung` | Input Supplier |
| Bureau Veritas Vietnam | `bvinspector` | Quality Inspector |
| Cat Lai Port Authority | `catlaiport` | Port Authority |
| Gemadept Logistics | `gemadept` | Freight Forwarder |
| Maersk Vietnam | `maersk` | Carrier |
| Vietcombank | `financier1` | Financier |
| HSBC Vietnam | `financier2` | Financier |

**Node Beta — Import Corridor (http://localhost:4001)**

| Organisation | Username | Role |
|---|---|---|
| Nike Inc. | `nike` | Importing Buyer |
| Nike Europe B.V. | `nikeeu` | Importing Buyer |
| US Customs and Border Protection | `uscbp` | Customs Authority |
| EU Customs (Netherlands) | `eucustoms` | Customs Authority |

---

## Architecture

```
┌─────────────────────┐    WebSocket P2P    ┌─────────────────────┐
│     Node Alpha      │◄──────────────────►│     Node Beta       │
│   localhost:4000    │   ws://4010 ↔ 4011  │   localhost:4001    │
│                     │                     │                     │
│  Export orgs        │                     │  Import orgs        │
│  (from config)      │                     │  (from config)      │
└─────────────────────┘                     └─────────────────────┘
          │                                           │
          └──────── IOTA Mainnet (simulated) ─────────┘
```

Each node is a standalone Express server with:
- In-memory store (orgs, consignments, documents, permissions, ledger log)
- WebSocket server for real-time client push
- P2P WebSocket to the peer node for cross-border data sync
- All corridor-specific data loaded from the JSON config file

---

## Configuration System

The platform uses a JSON Schema-validated configuration to define every corridor-specific aspect:

| Section | What it controls |
|---------|-----------------|
| `branding` | App name, logo, theme colors |
| `nodes` | Organisation definitions for Alpha and Beta |
| `geography` | Country data, map coordinates, trade routes |
| `documents` | Document types, templates, seed data |
| `finance` | Currencies, payment methods, LC/contract seeds |
| `credentials` | Registration types, blacklists, validation rules |

See `configs/demo-config.schema.json` for the full schema.

### Creating a new corridor

1. Copy an existing config (e.g. `configs/vietnam-us.json`)
2. Modify organisations, geography, documents, and branding
3. Validate against the schema
4. Run: `CONFIG_FILE=configs/your-corridor.json npm run demo`

---

## Features

### Digital Identity
- Organisations register a DID using a business registration number
- 5-step animated verification: format check, registry query, licence status, DID generation, credential issuance
- Verifiable Credentials anchored on the distributed ledger

### Consignments
- UCR as primary identifier
- Documents attach to consignment digital twins
- File upload (stored in memory, downloadable by authorised parties)

### Payments
- Full payment lifecycle per consignment: Unpaid, Partially Paid, Paid / Overdue
- Status changes anchored as ledger events

### Trade Finance
- **Letters of Credit:** Draft, Issued, Advised, Confirmed, Presented, Drawn
- **Smart Contracts:** Payment release conditions tied to document verification

### Cross-Node Sharing
- Connect Alpha and Beta nodes from the Dashboard
- Share consignments and documents to organisations on the peer node

### Access Control
- Visual permission matrix per consignment
- Grant / revoke per organisation

### Analytics (Ledger Explorer)
- Filterable event log: identity, document, permission, payment, contract, network
- Hash, timestamp, actor, and detail for every event
- Syncs across both nodes in real time

---

## Deployment

### Railway (recommended)

1. Push this repository to GitHub.
2. Create two Railway services from the same repo.
3. Set environment variables per service:

**twin-alpha**
```
NODE_ID=alpha
NODE_NAME=Node Alpha
PEER_URL=wss://<twin-beta-railway-url>
CONFIG_FILE=configs/vietnam-us.json
```

**twin-beta**
```
NODE_ID=beta
NODE_NAME=Node Beta
PEER_URL=wss://<twin-alpha-railway-url>
CONFIG_FILE=configs/vietnam-us.json
```

> `PORT` is set automatically by Railway. WebSocket runs on the same port as HTTP.

### Docker

```bash
docker compose up --build
```

Same three services on the same ports (4000, 4001, 4002).

---

## Tech Stack

- **Backend:** Node.js 18+, Express, WebSocket (ws), Multer
- **Frontend:** React 18, Vite, Lucide icons, react-simple-maps
- **Fonts:** DM Sans, JetBrains Mono
- **Storage:** In-memory (resets on server restart, intentional for demo)
