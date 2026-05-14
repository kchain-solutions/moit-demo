# TWIN Vietnam Demo: Tutorial and Presentation Guide

**For:** Live demo presentations to MOIT, TBI, IOTA, and stakeholders
**Prerequisites:** Node.js 18+, npm installed

---

## Quick Start

```bash
npm install
npm run dev
```

This starts two nodes:
- **Node Alpha** (Vietnam Export): http://localhost:4000
- **Node Beta** (US/EU Import): http://localhost:4001

For a single-URL sharing (e.g., screen sharing via tunnel):
```bash
npm run demo
# Proxy at http://localhost:4002/?node=alpha  or  ?node=beta
```

---

## Login Credentials

### Node Alpha: Vietnam Export Corridor

| Username | Password | Organization | Role | When to use |
|----------|----------|-------------|------|-------------|
| `tng` | `demo` | TNG Investment & Trading JSC | Manufacturer | Steps 1, 2, 4, and cross-border sharing |
| `moit` | `demo` | Ministry of Industry and Trade (MOIT) | Certificate of Origin Authority | Step 4 (issue CO) |
| `vncustoms` | `demo` | General Department of Vietnam Customs | Customs Authority (VNACCS) | Step 5 (export clearance) |
| `hyosung` | `demo` | Hyosung TNS Co., Ltd | Input Supplier (Korea) | Step 1 context (input materials) |
| `bvinspector` | `demo` | Bureau Veritas Vietnam | Quality Inspector | Step 3 (inspection report) |
| `catlaiport` | `demo` | Cat Lai Port Authority | Port Authority (HCMC) | Step 5 (vessel departure) |
| `gemadept` | `demo` | Gemadept Logistics | Freight Forwarder | Step 4 (packing list) |
| `maersk` | `demo` | Maersk Vietnam | Carrier | Step 5 (Bill of Lading) |
| `financier1` | `demo` | Vietcombank | Advising Bank | Trade finance (LC advising) |
| `financier2` | `demo` | HSBC Vietnam | International Bank | Trade finance (LC confirmation) |

### Node Beta: Destination Import Node

| Username | Password | Organization | Role | When to use |
|----------|----------|-------------|------|-------------|
| `nike` | `demo` | Nike Inc. | Importing Buyer (US) | Step 6 (verify received shipment) |
| `nikeeu` | `demo` | Nike Europe B.V. | Importing Buyer (EU) | Step 6 (EU corridor) |
| `uscbp` | `demo` | US Customs and Border Protection | US Customs | Step 6 (origin verification) |
| `eucustoms` | `demo` | EU Customs (Netherlands) | EU Customs | Step 6 (EVFTA verification) |

---

## The User Journey

This is the core demo flow. It mirrors the TWIN Vietnam Concept Note (Annex 1).

```
Step 1          Step 2          Step 3          Step 4                  Step 5
Korean CoO +    Bill of         Inspection      MOIT CoO +              Export clearance
Commercial      Material        Report          Export Declaration +     + Bill of Lading
Invoice                                         Commercial Invoice +
(Inputs)                                        Packing List
   |               |               |               |                       |
Hyosung/TNG     TNG             Bureau Veritas  MOIT + TNG + Gemadept   Customs + Maersk
                                                                        + Cat Lai Port

                    -----> Cross-border share to Nike + CBP ----->

                                                                    Step 6
                                                                    CBP origin
                                                                    verification
                                                                        |
                                                                    US CBP (Beta)
```

---

## Flow 1: Full User Journey (Live Demo, ~15 min)

This is the complete presenter walkthrough. Use this when you have time to show the full pipeline.

### Step 1: Raw Material Sourcing (Login: `tng` on Alpha)

**What you show:** The Vietnamese manufacturer receives Korean fabric with a Certificate of Origin. This proves CPTPP cumulation eligibility.

1. Open http://localhost:4000
2. Login as `tng` / `demo`
3. Go to **Consignments** page
4. Click **"New Consignment"**
5. Fill in:
   - UCR: `VN-2026-LIVE-001`
   - Product: `Men's Cotton Polo Shirts (Knitted)`
   - HS Code: `6105.10`
   - Quantity: `24,000 pcs`
   - Total Value: `168,000`
   - Currency: `USD`
   - Incoterms: `FOB`
   - Vessel: `MV Maersk Seletar`
   - Origin Port: `Cat Lai Terminal, Ho Chi Minh City`
   - Destination Port: `Port of Los Angeles`
   - Exporter: `TNG Investment & Trading JSC`
   - Importer: `Nike Inc.`
   - Origin Country: `Vietnam`
   - Destination Country: `United States`
6. Click **Create**
7. Upload two documents:
   - **Commercial Invoice (Inputs)**: upload any PDF. Doc type: `Commercial Invoice (Inputs)`, Issuer: `Hyosung TNS Co., Ltd`
   - **Input Certificate of Origin**: upload any PDF. Doc type: `Input Certificate of Origin`, Issuer: `Korea Customs Service`

**Talking point:** "The Korean fabric supplier provides a Certificate of Origin. Because Korea is a CPTPP member, this fabric qualifies as non-third-country content for Vietnam's origin calculation."

### Step 2: Production and BOM (Login: `tng` on Alpha)

**What you show:** The manufacturer records the Bill of Material with origin composition breakdown.

1. Stay logged in as `tng`
2. Upload a document to the same consignment:
   - **Bill of Material**: Doc type: `Bill of Material`, Issuer: `TNG Investment & Trading JSC`
3. (If origin composition panel is implemented) Show the breakdown:
   - Vietnam content: 65.5%
   - CPTPP content (Korea): 30.0%
   - Third-country content (China): 4.5%

**Talking point:** "The system automatically calculates the origin composition. 65.5% Vietnam content exceeds the threshold for US preferential tariff. Korean fabric counts as CPTPP cumulation."

### Step 3: Quality Inspection (Login: `bvinspector` on Alpha)

**What you show:** An independent inspector verifies product quality and logs the result.

1. First, as `tng`, go to **Permissions** and grant viewer access to Bureau Veritas (`bvinspector`)
2. Logout, login as `bvinspector` / `demo`
3. Go to **Consignments**, find the shared consignment
4. Upload a document:
   - **Inspection Report**: Doc type: `Inspection Report`, Issuer: `Bureau Veritas Vietnam`
5. The Tangle (Analytics page) shows a new entry: "Bureau Veritas Vietnam uploaded Inspection Report"

**Talking point:** "The inspection result is logged on the immutable ledger. Destination customs can independently verify that an accredited inspector signed off on product quality."

### Step 4: Export Documentation (Login: `moit`, then `tng`, then `gemadept`)

**What you show:** Three actors produce the export documentation package.

**4a. MOIT issues Certificate of Origin:**
1. As `tng`, grant viewer access to MOIT (`moit`)
2. Login as `moit` / `demo`
3. Upload: **MOIT Certificate of Origin**, Doc type: `MOIT Certificate of Origin`, Issuer: `Ministry of Industry and Trade (MOIT)`
4. The tangle log records: "MOIT issued Certificate of Origin via eCoSys"

**Talking point:** "The MOIT officer reviews the digital dossier (BOM, input CoO, inspection report) and issues the electronic Certificate of Origin through eCoSys. This CO is digitally signed by MOIT's node."

**4b. Manufacturer uploads export docs:**
1. Login as `tng` / `demo`
2. Upload: **Export Declaration**, Doc type: `Export Declaration`, Issuer: `General Department of Vietnam Customs`
3. Upload: **Commercial Invoice**, Doc type: `Commercial Invoice`, Issuer: `TNG Investment & Trading JSC`

**4c. Freight forwarder issues packing list:**
1. As `tng`, grant viewer access to Gemadept (`gemadept`)
2. Login as `gemadept` / `demo`
3. Upload: **Packing List**, Doc type: `Packing List`, Issuer: `Gemadept Logistics`

### Step 5: Export Clearance and Departure (Login: `vncustoms`, then `maersk`)

**What you show:** Vietnam Customs clears the shipment and the carrier issues the Bill of Lading.

**5a. Export clearance:**
1. As `tng`, grant viewer access to Vietnam Customs (`vncustoms`)
2. Login as `vncustoms` / `demo`
3. View the consignment and all attached documents
4. Upload: **Export Clearance** (or update consignment status to "Released")

**Talking point:** "Vietnam Customs verifies the documents via VNACCS and grants export clearance. The clearance is recorded on the ledger with a digital signature."

**5b. Bill of Lading:**
1. As `tng`, grant viewer access to Maersk (`maersk`)
2. Login as `maersk` / `demo`
3. Upload: **Bill of Lading**, Doc type: `Bill of Lading`, Issuer: `Maersk Vietnam`

**5c. Port departure (optional):**
1. Login as `catlaiport` / `demo`
2. The tangle log can record a port departure event

**Status events (present in tangle log):**
- Container loaded at Cat Lai Terminal
- Vessel departed Ho Chi Minh City
- Customs clearance granted (VNACCS)
- Vessel in transit

### Cross-Border Share (Login: `tng` on Alpha)

**What you show:** The manufacturer shares the entire consignment dossier across borders to the destination node.

1. Login as `tng` on Alpha
2. Go to **Network** page
3. Click **Connect** to Beta node (Node Beta: Destination Import)
4. Once connected (green status), go to **Consignments**
5. Find the consignment and click **Share**
6. Select **Nike Inc.** and **US CBP** as recipients
7. The consignment, all documents, and permissions sync via P2P WebSocket to the Beta node

**Talking point:** "This is the core TWIN value. With one click, the entire verified dossier travels securely to the destination. Nike and US CBP receive the same immutable records that were built step by step in Vietnam."

### Step 6: Destination Verification (Login: `uscbp` on Beta)

**What you show:** US CBP receives and verifies the origin claim.

1. Open http://localhost:4001 (or use proxy with `?node=beta`)
2. Login as `uscbp` / `demo`
3. Go to **Consignments**, find the received consignment
4. Open it and inspect all documents:
   - Input CoO (Korean fabric, CPTPP)
   - Bill of Material (origin composition: 65.5% Vietnam)
   - Inspection Report (pass)
   - MOIT CoO (digitally signed)
   - Export Declaration (VNACCS cleared)
   - Commercial Invoice
   - Packing List (Gemadept Logistics)
   - Bill of Lading (vessel details)
5. Go to **Analytics** (Tangle Explorer) and show the complete audit trail

**Talking point:** "CBP can now verify the entire chain of custody. Every document is linked to a verified digital identity. The origin composition shows 65.5% Vietnamese content. The Korean fabric is CPTPP-eligible. No Xinjiang-origin materials. This is the evidence base that replaces weeks of manual document verification."

---

## Flow 2: Pre-Seeded Quick Demo (~5 min)

For shorter presentations, skip Steps 1-5 (already pre-seeded) and start from the cross-border share.

### Setup

The demo ships with 8 pre-loaded Alpha consignments and 3 Beta consignments. The first two consignments (`VN-2026-EXP-00101`, `VN-2026-EXP-00102`) have pre-configured permissions and all 8 documents attached.

### Quick Demo Script

1. **Login as `tng` on Alpha** (http://localhost:4000)
   - Show the **Dashboard**: trade volume, active consignments, recent tangle activity
   - Show **Consignments**: click on `VN-2026-EXP-00101` (polo shirts to Nike US)
   - Walk through the 8 attached documents, explain each step
   - Show the **Permissions** page: who can see what

2. **Connect Alpha to Beta**
   - Go to **Network**, click **Connect** to Beta
   - Show peer organizations discovered (Nike, CBP, EU Customs)

3. **Share consignment to Beta**
   - Go to **Consignments**, share `VN-2026-EXP-00101` with Nike and CBP
   - Show real-time tangle update

4. **Switch to Beta, login as `uscbp`** (http://localhost:4001)
   - Open the received consignment
   - Walk through the documents and tangle trail
   - Point out: "All of this happened automatically. No emails, no PDFs, no manual checks."

5. **Show error case** (back on Alpha)
   - Login as `tng`, open `VN-2026-EXP-E002` (Origin Verification Failed)
   - Show the error: UFLPA flag, origin composition below threshold
   - Explain: "TWIN catches this before the shipment reaches US ports."

---

## Flow 3: Digital Identity Demo (~3 min)

Demonstrates the W3C DID registration process.

1. Login as `tng` on Alpha
2. Go to **Identity** page
3. Notice TNG is listed as "Not Registered"
4. Click **Register** on TNG's card
5. Enter a credential number: `MST-0102030405` (Vietnamese tax code format)
6. Watch the 5-step animated verification:
   - Initializing identity anchor
   - Creating DID document
   - Validating business credential
   - Registering on distributed ledger
   - Issuing verifiable attestation
7. TNG now shows a DID: `did:iota:0x...`

**Test credentials (pass):**
- `MST-0102030405` (Vietnam Tax Code / Ma So Thue)
- `KBN-1234567890` (Korean Business Number)
- `EIN-12-3456789` (US Employer Identification Number)
- `EORI-DE123456` (EU EORI Number)

**Test credentials (fail):**
- `MST-000000` (blacklisted)
- `MST-111111` (expired licence)
- `MST-222222` (suspended)
- `X-anything` (invalid prefix)

**Talking point:** "Every actor on the TWIN network gets a verifiable digital identity. MOIT, customs, manufacturers, carriers: they all sign their contributions with a DID anchored on the IOTA ledger."

---

## Flow 4: Trade Finance Demo (~5 min)

Demonstrates how origin verification drives payment release.

1. Login as `tng` on Alpha
2. Go to **Trade Finance** page

### Letters of Credit tab

3. View LC `LC-2026-VCB-0101`:
   - Issuing Bank: HSBC Vietnam
   - Advising Bank: Vietcombank
   - Amount: $168,000 USD
   - Status: Confirmed
   - Required docs: MOIT CoO, Commercial Invoice, Bill of Lading, Inspection Report
4. Click through the document compliance checklist. Show that MOIT CoO is marked compliant.

**Talking point:** "The Letter of Credit requires a verified Certificate of Origin. In the traditional process, the advising bank manually checks 15-20 pages of paper documents. On TWIN, the bank sees digitally signed, tamper-proof documents."

### Smart Contracts tab

5. View Smart Contract `SC-2026-VN-0101`:
   - Amount: $168,000 USD
   - Auto-release: enabled
   - Conditions:
     - MOIT Certificate of Origin issued and verified: **MET**
     - Origin composition verified (Vietnam content >= 55%): **MET**
     - Bill of Lading verified and presented: **NOT MET**
     - US CBP pre-clearance (no UFLPA hold): **NOT MET**
6. Click **Verify** on condition 3 (B/L verified). It turns green.
7. Click **Verify** on condition 4 (CBP pre-clearance). All conditions met.
8. If auto-release is on, the contract status changes to "Released" automatically.

**Talking point:** "This is the key innovation. The smart contract ties payment release directly to origin verification. When TWIN confirms that Vietnamese content exceeds 55% and CBP has no UFLPA hold, the payment releases automatically. No manual intervention, no 5-15 day waiting period."

---

## Flow 5: Error Case Walkthrough (~3 min)

Demonstrates TWIN's value in catching compliance issues early.

### Error 1: HS Code Mismatch (`VN-2026-EXP-E001`)

1. Login as `tng` on Alpha
2. Open consignment `VN-2026-EXP-E001` (status: Under Review)
3. Show the error description: Export Declaration filed under HS 6205.30 (man-made fibres) but Commercial Invoice declares HS 6205.20 (cotton)
4. View the Export Declaration XML: HS code shows `6205.30`
5. View the Commercial Invoice: product described as "cotton dress shirts"
6. The mismatch is visible to Vietnam Customs and would be flagged by VNACCS

**Talking point:** "TWIN catches HS code discrepancies before the shipment leaves Vietnam. Without TWIN, this would be caught at the US port, causing detention, re-inspection, and potential tariff penalties."

### Error 2: Origin Verification Failed (`VN-2026-EXP-E002`)

1. Open consignment `VN-2026-EXP-E002` (status: Under Review)
2. Show the error: origin composition shows only 38% Vietnamese value-added (below 40% threshold)
3. The BOM reveals: fleece fabric sourced from a non-CPTPP supplier in China exceeds the permitted third-country input ratio
4. UFLPA screening flag: fleece supplier region of origin requires additional documentation

**Talking point:** "This shipment would face a 40% tariff instead of 20% at the US border. TWIN flags it before export. The manufacturer can either source alternative materials or provide additional UFLPA documentation. The brand (Nike) avoids reputational risk and tariff liability."

---

## Flow 6: Analytics and Audit Trail (~2 min)

1. Login as any user on either node
2. Go to **Analytics** (Tangle Explorer)
3. Show the immutable ledger with all events
4. Use the filter buttons:
   - **CONSIGNMENT**: creation events
   - **DOCUMENT**: upload events (shows who uploaded what, when)
   - **PERMISSION**: sharing events (who granted access to whom)
   - **IDENTITY**: DID registration events
   - **PAYMENT** / **LC** / **CONTRACT**: finance events
5. Each entry shows: timestamp, actor, action, SHA-256 hash

**Talking point:** "Every action on TWIN is recorded with a cryptographic hash. This is the tamper-proof audit trail that customs authorities, brands, and financiers can independently verify."

---

## Flow 7: Korean Raw Materials (Beta Node, ~3 min)

Shows the input supply chain (Step 1 of the journey).

1. Open http://localhost:4001
2. Login as `nike` / `demo`
3. Go to **Consignments**
4. View the 3 Korean raw material shipments:
   - `KR-2026-EXP-00201`: Spandex yarn from Hyosung TNS
   - `KR-2026-EXP-00202`: Nylon fabric from Hyosung TNS
   - `KR-2026-EXP-00203`: Zippers from YKK Korea
5. Each has standard trade documents (Commercial Invoice, Packing List, B/L, Korean CoO, Export Declaration)

**Talking point:** "These are the raw materials flowing from Korea to Vietnam. The Korean Certificates of Origin prove CPTPP cumulation eligibility. When TNG uses this fabric to make garments, the BOM references these input CoOs to justify the origin composition calculation."

---

## Presentation Tips

### Audience-specific emphasis

| Audience | Focus on | Key flows |
|----------|----------|-----------|
| **MOIT officials** | eCoSys integration, data sovereignty, government control | Flow 1 (full journey, emphasize Step 4), Flow 3 (identity) |
| **Customs (Vietnam/US)** | Verification, error detection, audit trail | Flow 5 (error cases), Flow 6 (analytics), Flow 2 (quick demo) |
| **Brands (Nike)** | Tariff risk reduction, UFLPA compliance, speed | Flow 2 (quick demo), Flow 4 (trade finance), Flow 5 (errors) |
| **Financiers** | LC automation, origin-tied conditions, payment speed | Flow 4 (trade finance), Flow 2 (quick demo) |
| **TBI/IOTA internal** | Full architecture, all features | Flow 1 (complete walkthrough) |

### Timing guide

| Duration | Recommended flows |
|----------|-------------------|
| 5 minutes | Flow 2 (pre-seeded quick demo) |
| 10 minutes | Flow 2 + Flow 5 (quick demo + error cases) |
| 15 minutes | Flow 2 + Flow 4 + Flow 5 (quick demo + trade finance + errors) |
| 20 minutes | Flow 1 (full user journey, abbreviated) |
| 30 minutes | Flow 1 + Flow 4 + Flow 5 + Flow 6 |
| 45 minutes | All flows |

### Common questions and answers

**"Where is the data stored?"**
Each node stores data in memory. Trade documents stay with the data owner. Only cryptographic hashes are shared on the distributed ledger. The demo resets on restart by design.

**"How does this integrate with eCoSys/VNACCS?"**
In the demo, MOIT and Customs are simulated as separate logins. In production, TWIN connects via adapters: the MOIT node fetches CO data from eCoSys via API, and the Customs node receives export declarations from VNACCS.

**"Is this on the real IOTA blockchain?"**
The demo simulates the DLT layer with a local JSON file (tangle-alpha.json, tangle-beta.json). In production, these entries would be on the IOTA DLT with real cryptographic anchoring.

**"What about data sovereignty?"**
The two-node model demonstrates data sovereignty by design. Vietnam's data stays on Node Alpha. Only what the owner explicitly shares crosses to Node Beta. Permissions are owner-controlled.

**"Why two nodes instead of one?"**
This mirrors the real architecture. Each country operates its own TWIN node. Cross-border data exchange happens via P2P WebSocket (simulating the Data Space Connector protocol). No central server sees all data.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 4000/4001 already in use | Kill existing processes: `lsof -ti:4000 \| xargs kill` |
| Node connection fails | Ensure both nodes are running. Try: `npm run dev` which starts both |
| Documents not showing | Check you granted permission first (Permissions page) |
| Tangle not syncing between nodes | Connect nodes via Network page before sharing |
| Login fails | All passwords are `demo`. Check username spelling. |
