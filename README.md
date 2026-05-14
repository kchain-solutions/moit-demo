# TWIN Vietnam — Trade & Logistics Platform

TWIN Vietnam is a two-node interactive demo showcasing cross-border trade infrastructure for the Vietnam garment and footwear export corridor. It demonstrates how digital identity, document exchange, and trade finance can interoperate across organisations and jurisdictions without replacing existing systems.

Built for stakeholder presentations to the Vietnamese Ministry of Industry and Trade (MOIT).

---

## Quick Start (Local)

```bash
npm install
npm run dev
```

Builds the React client and starts two live nodes:

| Node | URL | Description |
|------|-----|-------------|
| Alpha | http://localhost:4000 | Vietnam Export Corridor (manufacturers, customs, authorities, logistics, financiers) |
| Beta | http://localhost:4001 | Importers / Destination Markets (buyers, destination customs) |

Open both URLs in separate browser windows and sign in with the credentials shown on each login page (password is `demo` for all accounts).

---

## Demo Credentials

### Node Alpha — Vietnam Export Corridor (http://localhost:4000)

| Organisation | Username | Role |
|---|---|---|
| TNG Investment & Trading JSC | `tng` | Manufacturer · Vietnam |
| General Department of Vietnam Customs | `vncustoms` | Customs Authority · Vietnam |
| Ministry of Industry and Trade (MOIT) | `moit` | Certificate of Origin Authority · Vietnam |
| Hyosung TNS Co., Ltd | `hyosung` | Input Supplier · South Korea |
| Bureau Veritas Vietnam | `bvinspector` | Quality Inspector · Vietnam |
| Cat Lai Port Authority | `catlaiport` | Port Authority · Ho Chi Minh City |
| Gemadept Logistics | `gemadept` | Freight Forwarder · Vietnam |
| Maersk Vietnam | `maersk` | Carrier · Vietnam |
| Vietcombank | `financier1` | Financier · Vietnam |
| HSBC Vietnam | `financier2` | Financier · International |

### Node Beta — Importers / Destination Markets (http://localhost:4001)

| Organisation | Username | Role |
|---|---|---|
| Nike Inc. | `nike` | Importing Buyer · United States |
| Nike Europe B.V. | `nikeeu` | Importing Buyer · EU |
| US Customs and Border Protection | `uscbp` | Customs Authority · United States |
| EU Customs (Netherlands) | `eucustoms` | Customs Authority · EU |

---

## Architecture

```
┌─────────────────────┐    WebSocket P2P    ┌─────────────────────┐
│     Node Alpha      │◄──────────────────►│     Node Beta       │
│   localhost:4000    │   ws://4010 ↔ 4011  │   localhost:4001    │
│                     │                     │                     │
│  Manufacturers      │                     │  Importing Buyers   │
│  Customs (VN)       │                     │  Customs (US/EU)    │
│  MOIT (CoO)         │                     │                     │
│  Input Suppliers    │                     │                     │
│  Logistics & Port   │                     │                     │
│  Financiers         │                     │                     │
└─────────────────────┘                     └─────────────────────┘
          │                                           │
          └──────── Distributed Ledger (simulated) ───┘
```

Each node is a standalone Express server with:
- In-memory store (orgs, consignments, documents, permissions, tangle log)
- WebSocket server for real-time client push
- P2P WebSocket to the peer node for cross-border data sync

---

## Trade Scenario

The demo simulates a Vietnam garment/footwear export corridor:

- **Commodity:** HS 61 (knitted garments), HS 62 (woven garments), HS 64 (footwear)
- **Origin:** Vietnam (with Korean input materials from Hyosung TNS and YKK Vietnam)
- **Destinations:** United States, European Union (Netherlands)
- **Preferential trade:** CPTPP cumulation rules (Korean fabric qualifies as non-third-country content)
- **Certificate of Origin:** Issued electronically by MOIT via eCoSys
- **Customs clearance:** VNACCS (Vietnam Automated Cargo Clearance System)

---

## Features

### Digital Identity
- Private organisations register a DID using a business registration number
- 5-step animated verification: format check, registry query, licence status, DID generation, credential issuance
- Government authorities (Vietnam Customs, MOIT, US CBP, EU Customs) act as **attestation authorities**
- Verifiable Credentials anchored on the distributed ledger
- Peer organisations can inspect a "View Credential" modal showing DID, issuing authority, and ledger hash

**Test registration numbers:**

| Code | Result |
|---|---|
| `MST-123456` | Passes: valid Vietnamese tax code (Ma So Thue) |
| `KBN-254789` | Passes: valid Korean business number |
| `EIN-123456` | Passes: valid US Employer Identification Number |
| `EORI-123456` | Passes: valid EU EORI number |
| `MST-000000` | Fails step 2: blacklisted |
| `MST-111111` | Fails step 3: expired licence |
| `MST-222222` | Fails step 3: suspended |
| `X-anything` | Fails step 2: invalid prefix |

### Consignments
- UCR as primary identifier; Commercial Invoice and Export Declaration as secondary IDs
- Documents attach to consignment digital twins
- File upload (stored in memory, downloadable by authorised parties)
- 8 pre-loaded Alpha consignments (6 regular + 2 error scenarios) and 3 Beta consignments (Korean raw materials)

### Payments
- Full payment lifecycle per consignment: Unpaid, Partially Paid, Paid / Overdue
- Status changes anchored as ledger events
- Finance access managed independently from document access

### Trade Finance
- **Letters of Credit:** Draft, Issued, Advised, Confirmed, Presented, Drawn, with document compliance checklist
- **Smart Contracts:** Encode payment release conditions tied to Certificate of Origin verification; auto-release when all conditions are met; each state transition anchored on ledger
- Financiers: Vietcombank (domestic) and HSBC Vietnam (international)

### Cross-Node Sharing
- Connect Alpha and Beta nodes from the Dashboard
- Share consignments and documents to organisations on the peer node
- Peer orgs are searchable; Identity page shows their verified credentials

### Access Control
- Visual permission matrix per consignment
- Grant / revoke per organisation
- All changes produce an immutable ledger audit entry

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
```

**twin-beta**
```
NODE_ID=beta
NODE_NAME=Node Beta
PEER_URL=wss://<twin-alpha-railway-url>
```

> `PORT` is set automatically by Railway. WebSocket runs on the same port as HTTP.

4. Set the start command for each service:
   - Alpha: `node server/index.js`
   - Beta: `node server/index.js`

> **Note:** The build step (`npx vite build --outDir server/public`) runs automatically via the `railway.toml` configuration.

---

## Tech Stack

- **Backend:** Node.js 18+, Express, WebSocket (ws), Multer
- **Frontend:** React 18, Vite, Lucide icons, react-simple-maps
- **Fonts:** DM Sans, JetBrains Mono
- **Storage:** In-memory (resets on server restart, intentional for demo)
