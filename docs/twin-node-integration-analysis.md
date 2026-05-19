# TWIN Node Integration Analysis

**Date:** 2026-05-19
**Status:** Phase 1 substantially complete (48/62), Phase 2+ in backlog
**Architecture decision:** Two independent TWIN Nodes (Alpha + Beta) from day one
**Sources:** moit-demo task board, twin-node-reference.mdx, twin-supply-chain-reference.mdx, tutorials.101-reference.mdx, demo-evolution-plan.md

## How to start Phase 2

1. **Resolve Phase 1 blockers** (4 tasks): T-1V03 (origin composition) > T-143 (Cambodia config) > T-145 (E2E test) > T-162 (Vitest)
2. **Deploy two local TWIN Nodes**: T-163 (Docker Compose with Alpha :3000 + Beta :3001)
3. **Build adapter layer**: T-205 (scaffold) > T-209 (mode toggle) > T-206 (REST client) > T-207 (JWT)
4. **Integrate real features**: T-210/T-211 (DID) + T-214/T-215 (notarization) in parallel
5. **Validate**: T-221 (simulated parity) > T-222 (real E2E)

Key env var: `TWIN_NODE_URL=http://localhost:3000` (Alpha) or `:3001` (Beta)
Key env var: `ADAPTER_MODE=simulated|entity-storage|real`

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

## 3. Phase 2: Real Node Integration (33 tasks, 0 done)

### 3.1 What Phase 2 replaces

| Current (simulated) | Target (real) |
|---------------------|--------------|
| `did:iota:0x` + random hex | Real `did:iota:testnet:0x...` via IOTA Identity on-chain |
| Random SHA-256 hash | Real SHA-256 + `Notarization` Move object on IOTA testnet |
| In-memory `store.documents` base64 | Encrypted TWIN Blob Storage (ChaCha20Poly1305) |
| Boolean `verified` flag | W3C Verifiable Credential issuance |
| WebSocket P2P sharing | WebSocket P2P (unchanged in Phase 2, DSC in Phase 3) |
| In-memory permissions | In-memory + ODRL stub generation (real enforcement in Phase 3) |

### 3.2 Architecture: Two TWIN Nodes + API Adapter Layer

**Decision (2026-05-19):** Deploy two independent TWIN Nodes from day one for demo realism. Each country operates its own node with its own DID identity, database, and storage.

```
React SPA (Alpha)  -->  Demo Server Alpha  -->  TWIN Node Alpha (:3000)
                         (port 4000)              (db-alpha, twin_data_alpha)
                         ADAPTER_MODE=real

React SPA (Beta)   -->  Demo Server Beta   -->  TWIN Node Beta (:3001)
                         (port 4001)              (db-beta, twin_data_beta)
                         ADAPTER_MODE=real

                         Proxy (:4002)
```

Each demo server connects to its own TWIN Node via `TWIN_NODE_URL` env var. `ADAPTER_MODE=real|simulated|entity-storage` toggles between real TWIN Node calls and pass-through to demo server logic.

### 3.3 Task coherence with current knowledge

Cross-referencing each Phase 2 task against the latest TWIN Node (v0.0.3-next.37) and TWIN Supply Chain documentation:

| Task | Status | Coherence Notes |
|------|--------|-----------------|
| **T-201** Request TWIN Node access | Valid | `tutorials.101` now provides a Docker-based alternative via `twinfoundation/twin-node:0.0.3-next.20`. Can bootstrap locally without waiting for staging access. Consider splitting: (a) local Docker for dev, (b) staging request for shared testing |
| **T-202** Deploy TWIN Node Alpha | Valid | Docker image available. Env vars documented: `TWIN_IDENTITY_CONNECTOR=iota`, `TWIN_NOTARIZATION_CONNECTOR=iota`, `TWIN_NETWORK=testnet`. Gas Station optional but recommended (`TWIN_IOTA_GAS_STATION_ENDPOINT`) |
| **T-203** Deploy TWIN Node Beta | Valid | Same Docker image, different config. Consider multi-tenant option (`TWIN_TENANT_ENABLED=true`) for single-node testing, then split for realistic scenarios |
| **T-204** Fund testnet wallets | Valid | IOTA testnet faucet publicly available. ~0.005 IOTA per transaction |
| **T-205** Scaffold adapter | Valid | Should mirror existing `server/routes/` structure rather than create a separate server. The modular route architecture (T-160 done) supports plugging in adapter routes alongside simulated ones |
| **T-206** TWIN Node REST client | **Update needed.** API surface is now well-documented. Key endpoints: `/authentication/login/create`, `/identity`, `/identity/{did}/credentials`, `/notarization`, `/blob-storage`, `/aig`, `/supply-chain/consignments`. Should use `@twin.org/supply-chain-rest-client` if available, otherwise raw fetch |
| **T-207** Session/JWT middleware | Valid | TWIN Node uses JWT cookies (`access_token`). Login returns JWT, stored in httpOnly cookie |
| **T-208** Error translation | Valid | Map TWIN Node HTTP errors to demo's simpler format |
| **T-209** ADAPTER_MODE toggle | **Update suggested.** The TWIN Node itself has an equivalent concept: `entity-storage` connectors simulate capabilities, `iota` connectors use real DLT. Consider aligning modes: `simulated` = current demo server, `entity-storage` = TWIN Node with mock connectors, `iota` = TWIN Node with real DLT connectors |
| **T-210** Adapter auth routes | Valid | Map `POST /api/login {username, password}` to `POST /authentication/login/create {identity, password}` |
| **T-211** Identity routes (real DID) | Valid | `POST /identity` creates real `did:iota:testnet:0x...`. `POST /identity/{did}/credentials` issues W3C VC. 5-step animated verification stays in frontend, adapter returns real DID |
| **T-213** DID resolvability | Valid | `GET /identity/{did}` resolves DID document. Target < 8 seconds |
| **T-214** Notarization routes | Valid | `POST /notarization` creates SHA-256 hash as Move object on IOTA. Connector: `TWIN_NOTARIZATION_CONNECTOR=iota` |
| **T-215** Document routes + notarization | Valid | Sequence: SHA-256 hash > blob storage > UNECE document record > notarization |
| **T-216** On-chain hash verification | Valid | Verify SHA-256 matches on-chain object. Target < 5 seconds |
| **T-217** Consignment routes | **Update needed.** `IConsignmentView` type is now documented with fields: `id`, `status`, `consignmentNumber`, `departurePort`, `arrivalPort`, `carrier`, `departureDate`. Events Manager Service publishes MATCH/UNMATCHED event types. Adapter should map demo consignment fields to this type |
| **T-2V01** eCoSys adapter stub | Valid | Aligns with TWIN Adaptor pattern (external or in-node). High risk: eCoSys API availability. Design as manual upload with webhook simulation |
| **T-2V02** VNACCS adapter stub | Valid | Same adaptor pattern. Asycuda/VNACCS integration via webhook |
| **T-2V03** Origin composition calculator | Valid | Should produce `IOriginComposition` output. Configuration per HS code with value/weight calculation methods |
| **T-2V07** ODRL templates for Vietnam | **Update: concrete reference available.** The `EcosystemPolicy` type and ISN Notify Template from twin-supply-chain-reference.mdx section 9 provide a working ODRL template. The template uses `PartyCollection` with JSONPath refinement and geographic targeting. Adapt for Vietnam-specific policy types |

### 3.4 Gaps addressed

All identified gaps have been resolved:

1. **T-163 created:** Two local TWIN Nodes via tutorials.101 Docker (Alpha :3000 + Beta :3001)
2. **T-206 updated:** REST API mapping table added with 9 documented endpoints
3. **T-224 created:** Gas Station configuration for testnet transactions
4. **T-209 updated:** Added `entity-storage` mode aligned with TWIN Node connector architecture
5. **T-2V07 updated:** EcosystemPolicy type and ISN Notify Template reference added
6. **T-301 updated:** Risk de-risked, DSP env vars and transfer flow documented
7. **T-305 updated:** IConsignmentView field mapping table added

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

## 6. Critical Path to Real TWIN Node Integration

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
    T-163 (2 TWIN Nodes Docker)  T-205 (adapter scaffold)
    |                                 |
    T-224 (Gas Station)          T-209 (mode toggle)
    |                                 |
    +----------------+----------------+
                     |
               T-206 (REST client)
                     |
               T-207 (JWT middleware)
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
               T-222 (real E2E)
                     |
          Phase 3 Starts
                     |
               T-301 (DSC research)
                     |
    +----------+----------+----------+
    |          |          |          |
    T-302    T-303      T-304    T-309
    (DSC)    (AIG)     (ODRL)   (Adaptor)
    |          |          |          |
    +----------+----------+----------+
                     |
               T-308 (Phase 3 E2E)
```

---

## 7. Task Board Corrections (applied 2026-05-19)

All corrections have been applied:

| Task | Correction | Status |
|------|-----------|--------|
| **T-160** | Moved to `done/`, board regenerated | Done |
| **T-144** | Dependency on T-143 waived (fallbacks removed without Cambodia config) | Acknowledged |
| **T-206** | Added REST API mapping table (9 endpoints) | Done |
| **T-209** | Added `entity-storage` mode, connector architecture reference | Done |
| **T-2V07** | Added EcosystemPolicy type, ISN Notify Template, port codes | Done |
| **T-301** | Risk downgraded, DSP env vars and transfer flow documented | Done |
| **T-305** | Added IConsignmentView fields and demo-to-UNECE mapping table | Done |

---

## 8. Suggested New Tasks

| ID | Title | Priority | Phase | Rationale |
|----|-------|----------|-------|-----------|
| T-163 | Set up two local TWIN Nodes via tutorials.101 Docker | P0 | 2 | Two independent nodes (Alpha + Beta) for realistic two-country demo. Unblocks adapter development without waiting for staging |
| T-224 | Configure Gas Station for testnet | P1 | 2 | Transactions require IOTA gas. `TWIN_IOTA_GAS_STATION_ENDPOINT` needed |
| T-225 | Evaluate multi-tenant TWIN Node for dev/test | P3 | 2 | Deprioritized: decision taken to use two separate nodes for realism |
| T-309 | Design TWIN Adaptor deployment model for government systems | P1 | 3 | Choose external/in-node/hybrid pattern for eCoSys and VNACCS |
| T-310 | Implement W3C Activity Streams data plane | P1 | 3 | DSP data plane uses ActivityPub inbox/outbox for push transfers |

---

## 9. Knowledge Sources

| Document | Location | Relevance |
|----------|----------|-----------|
| TWIN Node Reference | `docs/technical/twin-node/twin-node-reference.mdx` | Env vars, connectors, DSP, multi-tenant |
| TWIN Supply Chain Reference | `docs/technical/twin-node/twin-supply-chain-reference.mdx` | IConsignmentView, ODRL, Events Manager |
| Tutorials 101 Reference | `docs/technical/twin-community/tutorials.101-reference.mdx` | Docker deployment, local dev env |
| MOIT Demo Reference | `docs/technical/kchain-projects/moit-demo-reference.mdx` | Current architecture, API surface |
| Demo Evolution Plan | `docs/technical/partners/twin-vietnam/demo-evolution-plan.md` | Phase roadmap, feature mapping table |
| TWIN Whitepaper Architecture | `docs/technical/twin-node/twin-whitepaper-reference-architecture.md` | DSP, Adaptor pattern, ODRL enforcement |
| Topology Tracker | `docs/technical/partners/twin-vietnam/topology-tracker.md` | Open questions Q6 (eCoSys), Q7 (VNACCS) |
