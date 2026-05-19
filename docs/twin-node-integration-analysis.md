# TWIN Node Integration Analysis

**Date:** 2026-05-19 (updated 2026-05-12)
**Status:** Phase 1 substantially complete (51/63), Phase 2 ready for development
**Architecture decision:** In-process TWIN connectors (ADR-001, Strategy C Hybrid)
**Sources:** moit-demo task board, twin-etd-poc source code, twin-node-reference.mdx, twin-supply-chain-reference.mdx, tutorials.101-reference.mdx, demo-evolution-plan.md

## How to start Phase 2

1. **Resolve Phase 1 blockers** (4 tasks): T-1V03 (origin composition) > T-143 (Cambodia config) > T-145 (E2E test) > T-162 (Vitest)
2. **Set up TWIN connectors**: T-226 (TypeScript pipeline) > T-229 (WASM test) > T-227 (connectors.ts) > T-228 (notarization.ts)
3. **Build adapter layer**: T-205 (ITwinAdapter interface + InProcessAdapter) > T-209 (mode toggle)
4. **Integrate real features**: T-210/T-211 (DID) + T-214/T-215 (notarization) in parallel
5. **Validate**: T-221 (simulated parity) > T-222 (in-process E2E)

Key env var: `IOTA_MNEMONIC` (BIP-39 seed phrase for testnet wallet)
Key env var: `ADAPTER_MODE=simulated|in-process|twin-node`

---

## 1. Completed Work (Phase 1)

### 1A. Configuration System (T-101 through T-120)

The demo is now fully corridor-agnostic. All hardcoded Vietnam data has been extracted into `configs/vietnam-us.json`. A second config `configs/adapt-africa.json` proves the system works for different corridors.

| Component | What was done |
|-----------|--------------|
| `server/config.js` | Loads JSON config at startup via `CONFIG_FILE` env var |
| `GET /api/config` | Serves sanitized corridor metadata (no passwords/secrets) |
| `GET /api/orgs` | Returns organizations from config without credentials |
| `ConfigContext.jsx` | React context fetches config, applies theme CSS variables |
| CSS theming | `--accent`, `--accent-light`, `--nav-bg` etc. overridable per corridor |
| Credential validation | Blacklists, expired, suspended, registration types all from config |
| Finance seed data | Payments, LCs, smart contracts loaded from config |
| Consignments | All seed consignments and documents driven by config |

**Hardcoded fallback removal (T-144):** Config file is now mandatory. Server will not start without a valid config.

**Corridor-agnostic renaming (T-150, T-151):** All "tangle" references renamed to "ledger" / "IOTA Mainnet". UI references to "Vietnam" or "MOIT" removed from source code (only appear in config data).

### 1B. Mobile Optimization (T-121 through T-142)

All 9 pages are responsive:
- Sidebar drawer with hamburger menu (tablet)
- Bottom tab bar (phone)
- Table-to-card conversions for Dashboard, Consignments, Payments, Permissions
- Vertical stepper for Trade Finance LC flow
- Bottom sheet modals on mobile
- Touch targets compliant with WCAG 2.1 AA (44x44px)
- Hover states wrapped in `@media (hover: hover)`

### 1C. Server Modularization (T-160, de facto complete)

The 1054-line `server/index.js` monolith has been split into modular files:

```
server/
  index.js          # ~55 lines: imports, middleware, route mounting, startup
  config.js          # Config loader
  store.js           # In-memory state, CLI args, ledger helpers
  seed.js            # seedConsignments(), seedFinanceData()
  ws.js              # WebSocket server, P2P peering, message routing
  utils.js           # genId(), genHash(), genDID(), now(), escXml()
  generators/
    pdf.js           # makeSeedPdf()
    xml.js           # makeSeedXml()
  routes/
    config.js        # GET /api/config
    auth.js          # POST /api/login
    node.js          # GET /api/node, connect, disconnect, discover
    orgs.js          # GET /api/orgs, register, validate-credential
    consignments.js  # GET/POST /api/consignments
    documents.js     # GET/POST /api/documents, download, xml
    permissions.js   # GET/POST /api/permissions, share, revoke
    finance.js       # Payments, LCs, Smart Contracts
    ledger.js        # GET /api/ledger, SPA fallback
```

T-160 has been moved to `done/` and the board regenerated.

### 1D. Ledger Corridor Isolation

`saveLedgerLog()` and `loadLedgerLog()` are corridor-aware: a `_corridorId` marker ensures switching configs triggers automatic re-seed. Ledger files (`data/ledger-*.json`) are gitignored.

---

## 2. Remaining Phase 1 Tasks

### Blockers for Phase 2 (must do first)

| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| **T-1V03** | Origin composition fields in schema | P0 | **Core Vietnam differentiator.** Without these the adapter cannot map to `IOriginComposition` |
| **T-143** | Create Cambodia-EU corridor config | P1 | Validates config system with different actors |
| **T-145** | End-to-end testing: config system | P0 | Depends on T-143. Prerequisite of T-205 (adapter scaffold) |
| **T-162** | Add Vitest and baseline server API tests | P0 | Safety net before adapter refactoring. Unblocked (T-160 done) |

### Useful but not blocking

| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| T-1V07 | Vietnamese diacritics support | P1 | **High embarrassment risk** for MOIT demo |
| T-147 | Update Docker Compose for CONFIG_FILE | P1 | Needed for docker-compose.twin.yml |
| T-161 | Extract shared frontend utilities | P1 | StatusPill, DocsPill, Modal, fmtValue duplicates |

### Deferrable

| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| T-115 | Adaptive login credential list layout | P2 | Cosmetic |
| T-164 | Standardize modal patterns | P2 | Depends on T-161 |
| T-1V01 | Vietnam government actor types in schema | P1 | Useful, not critical |
| T-1V02 | Document type registry in schema | P2 | UNECE codes, more relevant in Phase 3 |
| T-1V04 | vietnam-eu.json corridor config | P2 | Depends on T-1V03 and T-143 |
| T-1V05 | Regulatory metadata in schema | P2 | UFLPA, EVFTA, CPTPP |
| T-1V06 | Two-channel architecture indicator | P3 | Documentative |

**Recommended order:** T-1V03 > T-162 > T-143 > T-145 > T-1V07 > T-147

---

## 3. Phase 2: In-Process TWIN Integration (24 tasks, 0 done)

### 3.0 Architecture Decision: ADR-001 (Strategy C Hybrid)

Analysis of the `twin-etd-poc` codebase (TWIN Foundation's own ETD PoC, authored by Alberto Oliveri at IOTA Stiftung) revealed that it does NOT connect to a remote TWIN Node via HTTP. It imports the TWIN connector stack directly as npm packages and runs everything in-process using WASM bindings.

**Decision:** Use in-process connectors for Phase 2, behind an adapter interface (`ITwinAdapter`) that enables a transparent swap to TWIN Node REST client in Phase 3.

Full rationale: `docs/adr/ADR-001-twin-integration-strategy.md`

### 3.1 What Phase 2 replaces

| Current (simulated) | Target (in-process) |
|---------------------|---------------------|
| `did:iota:0x` + random hex | Real `did:iota:testnet:0x...` via `@twin.org/identity-connector-iota` |
| Random SHA-256 hash | Real SHA-256 + `Notarization` Move object via `@iota/notarization` WASM |
| In-memory `store.documents` base64 | File-based entity storage (`.data/` directory) |
| Boolean `verified` flag | Real Ed25519 DataIntegrityProof via DID signing key |
| WebSocket P2P sharing | WebSocket P2P (unchanged in Phase 2, DSP in Phase 3) |
| In-memory permissions | In-memory + ODRL stub generation (real enforcement in Phase 3) |

### 3.2 Architecture: In-Process Connectors + Adapter Interface

```
React SPA (Alpha)  -->  Demo Server Alpha (port 4000)
                         |-- server/adapter/index.js (ADAPTER_MODE switch)
                         |     |-- adapter/simulated.js (current demo logic)
                         |     |-- adapter/in-process.js (TWIN connectors via npm)
                         |     |-- adapter/twin-node.js (Phase 3: REST client)
                         |-- server/twin/connectors.ts (adapted from twin-etd-poc)
                         |-- server/twin/notarization.ts (adapted from twin-etd-poc)
                         |-- .data/ (file-based entity storage)
                         --> IOTA Testnet (RPC, in-process)

React SPA (Beta)   -->  Demo Server Beta (port 4001)
                         (same packages, different IOTA_MNEMONIC)
                         --> IOTA Testnet (RPC, in-process)
```

`ADAPTER_MODE=simulated|in-process|twin-node` selects the backend:
- `simulated`: current demo behavior (zero dependencies, offline capable)
- `in-process`: real IOTA ops via npm packages (Phase 2)
- `twin-node`: REST client to deployed TWIN Node (Phase 3+, for DSP)

### 3.3 Phase 2 tasks (revised per ADR-001)

#### Cancelled (9 tasks, replaced by in-process pattern)

| Task | Title | Reason |
|------|-------|--------|
| ~~T-201~~ | Request TWIN Node access | No external TWIN Node needed |
| ~~T-202~~ | Deploy TWIN Node Alpha | In-process connectors replace Docker deployment |
| ~~T-203~~ | Deploy TWIN Node Beta | Same |
| ~~T-204~~ | Fund testnet wallets | Auto-handled by `walletConnector.ensureBalance()` |
| ~~T-206~~ | REST client wrapper | Direct function calls replace REST client |
| ~~T-207~~ | JWT middleware | In-memory controller identities replace JWT sessions |
| ~~T-208~~ | Error translation | Native JS errors, no HTTP-to-HTTP translation |
| ~~T-224~~ | Gas Station config | Faucet auto-funding for testnet |
| ~~T-225~~ | Multi-tenant evaluation | N/A with in-process approach |

#### New (4 tasks, TWIN connector setup)

| Task | Title | Priority | Effort |
|------|-------|----------|--------|
| T-226 | TypeScript build pipeline for `server/twin/` | P0 | S |
| T-227 | Adapt `setupTwinConnectors` from twin-etd-poc | P0 | M |
| T-228 | Adapt notarization helper from twin-etd-poc | P0 | S |
| T-229 | WASM compatibility validation | P0 | S |

#### Modified (8 tasks, simplified)

| Task | Title | Change |
|------|-------|--------|
| T-163 | TWIN Nodes setup | Rescoped: Docker for Phase 3. Phase 2 uses in-process |
| T-205 | Adapter scaffold | Renamed: `ITwinAdapter` interface + `InProcessAdapter` |
| T-209 | ADAPTER_MODE toggle | Modes: `simulated|in-process|twin-node` |
| T-210 | Auth routes | Simplified: no TWIN Node auth mapping, demo login stays |
| T-211 | Identity routes | Simplified: call `adapter.createDid()` directly |
| T-214 | Notarization routes | Simplified: call `adapter.createNotarization()` directly |
| T-215 | Document routes | Simplified: hash > adapter > store result |
| T-222 | E2E test | Renamed: in-process mode E2E test |

#### Unchanged (11 tasks)

T-212 (org routes), T-213 (DID verify), T-216 (hash verify), T-217 (consignment routes), T-218 (permissions), T-219 (finance), T-220 (hybrid ledger), T-221 (simulated parity), T-223 (Docker Compose), T-2V01-T-2V07 (Vietnam-specific)

---

## 4. Phase 3: Full Real Node Integration (12 tasks, 0 done)

### 4.1 What Phase 3 replaces

| Current (Phase 2 end state) | Target (Phase 3) |
|-----------------------------|------------------|
| WebSocket P2P | Eclipse Dataspace Protocol (DSP) over HTTPS |
| Hybrid ledger (real + simulated) | Auditable Item Graph (AIG) + on-chain anchoring |
| In-memory permissions + ODRL stubs | Real W3C ODRL policy enforcement (PEP/PDP) |
| Custom consignment model | UNECE D23B `ISupplyChainAppConsignment` |
| WebSocket `ORG_DIRECTORY` | DSP Federated Catalogue |

### 4.2 Task coherence with current knowledge

| Task | Coherence Notes |
|------|-----------------|
| **T-301** DSC protocol research | **Significantly de-risked.** DSP is now documented in twin-node-reference.mdx section 11. Key env vars: `TWIN_FEDERATED_CATALOGUE_ENABLED`, `TWIN_DATASPACE_ENABLED`, `TWIN_DATASPACE_DATA_PLANE_PATH`. Transfer flow documented: catalog/request > transfers/request > start > data-plane > complete. Still needs hands-on configuration with Ian Clark (TWIN team) for supply-chain-specific setup |
| **T-302** DSC cross-border exchange | Valid. Map WebSocket messages: `HANDSHAKE`/`ORG_DIRECTORY` > federated catalogue discovery; `SHARE_CONSIGNMENT` > DSP data transfer with ODRL agreement; `REVOKE_CONSIGNMENT` > DSP policy update. Push transfers use W3C Linked Data Notifications (webhook POST) |
| **T-303** AIG for ledger | Valid. `GET /aig` lists audit graphs. Each entry is an AIG vertex with on-chain anchoring |
| **T-304** Real ODRL enforcement | **Concrete reference available.** `EcosystemPolicy` type documented. PEP is optional in supply chain service (enabled via `pepComponentType`). ISN Notify Template provides a working ODRL template with geographic targeting. `TWIN_RIGHTS_MANAGEMENT_ENABLED=true` activates the service |
| **T-305** UNECE D23B migration | **Update: IConsignmentView documented.** Fields: `id`, `status`, `consignmentNumber`, `departurePort`, `arrivalPort`, `carrier`, `departureDate`. Events Manager publishes typed events (MATCH, UNMATCHED). Consignment detail page route: `/consignment/:id` |
| **T-306** Federated catalogue | Valid. `TWIN_FEDERATED_CATALOGUE_ENABLED=true`. DSP-compliant dataset discovery replaces WebSocket `ORG_DIRECTORY` |
| **T-308** Phase 3 E2E testing | Valid |
| **T-3V01** IOriginComposition | Valid. Needs coordination with TWIN core team for formal model extension |
| **T-3V02** Data sovereignty enforcement | Blocked by T8 output (Vietnam Cybersecurity Law). ODRL auto-enforcement via PEP |
| **T-3V03** Multi-destination ISN | Valid. ISN Notify Template supports per-country targeting |
| **T-3V04** NDATrace assessment | Blocked by T9 output |

### 4.3 Identified gaps in Phase 3 tasks

1. **TWIN Adaptor pattern not explicitly tasked.** The TWIN whitepaper defines three adaptor options (external, in-node, hybrid). For eCoSys and VNACCS, the adaptor architecture should be decided in Phase 2 and formalized in Phase 3. Consider adding: "Design TWIN Adaptor deployment model for Vietnam government systems."

2. **W3C Activity Streams not addressed.** The DSP data plane uses W3C Activity Streams (JSON-LD), W3C ActivityPub (inbox/outbox), and W3C Linked Data Notifications. Phase 3 tasks should reference these protocols explicitly.

3. **Synchronised Storage not considered.** `TWIN_SYNCHRONISED_STORAGE_ENABLED=true` allows one node to sync entity storage from a trusted peer. This could simplify Beta's data ingestion.

---

## 5. Phase 4: Production Readiness (10 tasks, 0 done)

Tasks T-401 through T-408, T-4V01, T-4V02 remain valid. Key knowledge updates:

- **T-402 (PostgreSQL persistence):** TWIN Node supports multiple backends: MySQL, PostgreSQL, MongoDB, DynamoDB, CosmosDB, Firestore, ScyllaDB. MySQL 8.4 is the default in tutorials.101. PostgreSQL is an option via `TWIN_ENTITY_STORAGE_CONNECTOR=postgresql`
- **T-404 (Key management):** TWIN Node supports HashiCorp Vault via `TWIN_VAULT_CONNECTOR=hashicorp`. Aligns with task requirements
- **T-4V01 (Vietnam hosting):** Viettel Cloud, VNPT, FPT evaluated. Hybrid option (Alpha in Vietnam, Beta in destination) is architecturally clean

---

## 6. Critical Path (Revised per ADR-001)

```
          Phase 1 Blockers (parallel tracks)
                     |
    +----------------+----------------+
    |                                 |
    T-1V03 (origin composition)  T-162 (Vitest)
    |                                 |
    T-143 (Cambodia config)           |
    |                                 |
    T-145 (E2E config test) ----------+
                     |
          Phase 2 Starts
                     |
    +----------------+----------------+
    |                                 |
    T-226 (TypeScript pipeline)  T-229 (WASM test)
    |                                 |
    T-227 (connectors.ts)       T-228 (notarization.ts)
    |                                 |
    +----------------+----------------+
                     |
               T-205 (ITwinAdapter + InProcessAdapter)
                     |
               T-209 (ADAPTER_MODE toggle)
                     |
    +----------------+----------------+
    |                                 |
    T-210 (auth routes)          T-214 (notarization)
    |                                 |
    T-211 (real DID)             T-215 (docs + notarize)
    |                                 |
    T-213 (DID verify)           T-216 (hash verify)
    |                                 |
    +----------------+----------------+
                     |
               T-221 (simulated parity)
                     |
               T-222 (in-process E2E)
                     |
          Phase 3 Starts
                     |
    +----------+----------+----------+----------+
    |          |          |          |          |
    T-163    T-301      T-302     T-309    T-310
    (Docker) (DSC)      (DSC)    (Adaptor) (ActivityStreams)
    |          |          |          |          |
    +----------+----------+----------+----------+
                     |
               T-308 (Phase 3 E2E)
```

**Critical path:** T-1V03 > T-143 > T-145 > T-226 > T-227 > T-205 > T-209 > T-211 > T-212 > T-221 > T-222

**"Wow moment" fast track:** T-226 > T-227 > manual `createDid()` test (Day 4-5)

---

## 7. Task Board Corrections

### Applied 2026-05-19

| Task | Correction | Status |
|------|-----------|--------|
| **T-160** | Moved to `done/`, board regenerated | Done |
| **T-144** | Dependency on T-143 waived (fallbacks removed without Cambodia config) | Acknowledged |
| **T-206** | Added REST API mapping table (9 endpoints) | Done |
| **T-209** | Added `entity-storage` mode, connector architecture reference | Done |
| **T-2V07** | Added EcosystemPolicy type, ISN Notify Template, port codes | Done |
| **T-301** | Risk downgraded, DSP env vars and transfer flow documented | Done |
| **T-305** | Added IConsignmentView fields and demo-to-UNECE mapping table | Done |

### Applied 2026-05-12 (ADR-001 Strategy C)

| Action | Tasks | Rationale |
|--------|-------|-----------|
| **Cancelled** | T-201, T-202, T-203, T-204, T-206, T-207, T-208, T-224, T-225 | Replaced by in-process connector pattern (no Docker, no REST client, no JWT) |
| **Created** | T-226 (TS pipeline), T-227 (connectors.ts), T-228 (notarization.ts), T-229 (WASM test) | TWIN connector setup from twin-etd-poc reference |
| **Modified** | T-163 (deferred to Phase 3), T-205, T-209, T-210, T-211, T-214, T-215, T-222 | Simplified for in-process pattern |
| **Source** | `twin-etd-poc/apps/etd-rest-server/src/` | `setupTwinConnectors.ts` (714 lines), `iotaNotarizationHelper.ts` (191 lines) |

---

## 9. Knowledge Sources

| Document | Location | Relevance |
|----------|----------|-----------|
| **ADR-001** | `docs/adr/ADR-001-twin-integration-strategy.md` | Architecture decision: in-process connectors, adapter interface, task impact |
| **TWIN ETD PoC** (source) | `twin-etd-poc/apps/etd-rest-server/src/` | Reference implementation: `setupTwinConnectors.ts`, `iotaNotarizationHelper.ts` |
| TWIN ETD PoC Reference | `docs/technical/twin-community/twin-etd-poc-reference.mdx` | API surface, NFT lifecycle, DSP, UNVTD VCs |
| TWIN Node Reference | `docs/technical/twin-node/twin-node-reference.mdx` | Env vars, connectors, DSP, multi-tenant |
| TWIN Supply Chain Reference | `docs/technical/twin-node/twin-supply-chain-reference.mdx` | IConsignmentView, ODRL, Events Manager |
| Tutorials 101 Reference | `docs/technical/twin-community/tutorials.101-reference.mdx` | Docker deployment, local dev env |
| MOIT Demo Reference | `docs/technical/kchain-projects/moit-demo-reference.mdx` | Current architecture, API surface |
| Demo Evolution Plan | `docs/technical/partners/twin-vietnam/demo-evolution-plan.md` | Phase roadmap, feature mapping table |
| TWIN Whitepaper Architecture | `docs/technical/twin-node/twin-whitepaper-reference-architecture.md` | DSP, Adaptor pattern, ODRL enforcement |
| Topology Tracker | `docs/technical/partners/twin-vietnam/topology-tracker.md` | Open questions Q6 (eCoSys), Q7 (VNACCS) |
