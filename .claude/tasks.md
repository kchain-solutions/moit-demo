# TWIN Vietnam Demo: Task Board

**Last updated:** 2026-05-18

## Summary

| Phase | Total | Backlog | In Progress | Blocked | Done |
|-------|-------|---------|-------------|---------|------|
| 1     | 54    | 54      | 0           | 0       | 0    |
| 2     | 30    | 30      | 0           | 0       | 0    |
| 3     | 12    | 12      | 0           | 0       | 0    |
| 4     | 10    | 10      | 0           | 0       | 0    |
| **Total** | **106** | **106** | **0** | **0** | **0** |

---

## Phase 1: Configuration System + Mobile Optimization

### 1A. Configuration Schema and Infrastructure

---

### T-101 | Create JSON Schema for demo config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** config
- **Effort:** M
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Author `configs/demo-config.schema.json` with all constraints: unique org IDs, valid org references in consignments, slug format for `corridor.id`, at least 1 org per node.

---

### T-102 | Extract Vietnam corridor data into config JSON
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** config
- **Effort:** L
- **Dependencies:** T-101
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Use actual stakeholder names from S7/S12. TNG is placeholder pending GATF/VITAS confirmation. Use UN/LOCODE for ports: VNSGN (Cat Lai), VNHPH (Hai Phong).

Extract all hardcoded data from `server/index.js` into `configs/vietnam-us.json`: 10 Alpha orgs (L63-73), 4 Beta orgs (L74-79), 8 Alpha consignments (L446-455), 3 Beta consignments (L457-461), credential validation (L45-59), attesting authorities (L624-630), finance seed data (L1014-1116), geography from `countries.js`.

---

### T-103 | Create configs directory and branding assets
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** config
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Create `configs/` directory. Move `vietnam.png` to `public/corridors/vietnam/`. Set up convention `public/corridors/{corridor-id}/`.

---

### T-1V03 | Add origin composition fields to config schema
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Core Vietnam differentiator. Without origin data, demo is indistinguishable from generic trade corridor.

Add `originComposition` block to consignment config: `totalVietnamContentPercent`, `inputMaterials[]` (materialType, supplierCountry, cptppMember, valueOrWeight), `calculationMethod`, `cptppCumulationApplied`. Dashboard and Consignments pages must render this data.

---

### T-1V01 | Add Vietnam government actor types to config schema
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Extend org schema with `regulatoryAuthority`, `governmentSystem` (eCoSys, VNACCS), `digitalSignatureCapability`. Distinguishes government regulatory actors from commercial actors.

---

### T-1V02 | Add document type registry to config schema
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** vietnam-specific
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Add top-level `documentTypes` registry defining valid document types per corridor with UNECE codes, source system, issuing authority, and Source of Truth vs Immutable Snapshot designation (per ADR-004).

---

### T-1V05 | Add regulatory metadata to config schema
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** regulatory
- **Effort:** S
- **Dependencies:** T-1V03
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Add `regulations` array to corridor config: UFLPA (US-bound), EVFTA (EU-bound), CPTPP with `applicableToDestinations`, `displayLabel`, `complianceFieldMapping`.

---

### T-1V06 | Add two-channel architecture indicator to config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P3
- **Category:** vietnam-specific
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Important for MOIT demos: shows TWIN complements NSW/ASW, does not replace it.

Add `channels` section declaring Channel A (Government NSW/ASW) and Channel B (TWIN) with which documents flow through each. Network page can visually distinguish the two channels.

---

### 1B. Server-Side Config Integration

---

### T-104 | Implement server/config.js config loader
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** M
- **Dependencies:** T-102
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Create `server/config.js`: reads JSON from `CONFIG_FILE` env var, validates structure, resolves org references, builds lookup maps. Returns `null` if file not found (hardcoded fallback).

---

### T-105 | Refactor server orgs to read from config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** M
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace hardcoded `store.orgs` arrays (L62-84) with `config.organizations.filter(o => o.node === nodeId)`. Preserve hardcoded fallback when `config === null`.

---

### T-106 | Refactor server consignments and documents to read from config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** M
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace `ALPHA_CONSIGNMENTS` / `BETA_CONSIGNMENTS` (L446-461) and `docsForConsignment()` (L463-484) with config-driven reads.

---

### T-107 | Refactor credential validation to read from config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** server
- **Effort:** S
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace blacklist/expired/suspended arrays (L45-58) and `getAttestingAuthority()` (L624-630) with config reads.

---

### T-108 | Refactor finance seed data to read from config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** server
- **Effort:** S
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace hardcoded payments, LCs, smart contracts (L1014-1116) with `config.finance`.

---

### T-109 | Add GET /api/config endpoint
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** S
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Must NOT expose credentials, passwords, or validation blacklists. Should include `corridor.tradeAgreements` and regulatory metadata for government stakeholder demos.

Serve corridor metadata, branding, node info, geography to frontend.

---

### T-110 | Add or refactor GET /api/orgs endpoint
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** S
- **Dependencies:** T-105
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Ensure org list endpoint returns orgs from config (username, name, role, category, country) without passwords. Login.jsx will use this instead of hardcoded arrays.

---

### 1C. Frontend Config Integration

---

### T-111 | Create ConfigContext and ConfigProvider
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** frontend
- **Effort:** M
- **Dependencies:** T-109
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Create `client/src/context/ConfigContext.jsx`. Fetches from `GET /api/config`, provides via React context. Loading state while fetching. Sensible defaults on failure.

---

### T-112 | Add getConfig() and getOrgs() to api.js
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** frontend
- **Effort:** S
- **Dependencies:** T-109, T-110
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Add API client methods for the new endpoints.

---

### T-113 | Wrap App with ConfigProvider
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** frontend
- **Effort:** S
- **Dependencies:** T-111
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Wrap application tree with `<ConfigProvider>` in App.jsx or main.jsx.

---

### T-114 | Refactor Login.jsx to use config-driven orgs
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** frontend
- **Effort:** M
- **Dependencies:** T-111, T-112
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Remove `ALPHA_CREDS` (L5-16) and `BETA_CREDS` (L18-23). Fetch from `GET /api/orgs`. Replace node badge, title, logo with config values.

---

### T-115 | Implement adaptive login credential list layout
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** frontend
- **Effort:** M
- **Dependencies:** T-114
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Actor-count-based layout: single list (1-4), scrollable (9-12), grouped by category with collapsible sections (13+).

---

### T-116 | Refactor App.jsx sidebar branding to use config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** frontend
- **Effort:** S
- **Dependencies:** T-111
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace hardcoded "TWIN Vietnam" and `vietnam.png` (L44-48) with `useConfig().branding`. TWIN prefix + corridor name pattern.

---

### T-117 | Refactor countries.js to accept config overrides
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** frontend
- **Effort:** S
- **Dependencies:** T-111
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Export function that merges defaults with `config.geography.countries`.

---

### 1D. Configurable Theming System

---

### T-118 | Expand CSS custom properties for corridor theming
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** theming
- **Effort:** M
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace `:root` variables (L1-22) with structured theming: `--corridor-accent`, `--corridor-secondary`, semantic colors, node colors, login gradient.

---

### T-119 | Implement runtime theme application from config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** theming
- **Effort:** M
- **Dependencies:** T-118, T-111
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Create `applyTheme(config)` that sets CSS custom properties from config branding. Include `darken()`/`lighten()` utilities. Call from ConfigProvider.

---

### T-120 | Replace hardcoded hex colors in components
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** theming
- **Effort:** M
- **Dependencies:** T-118
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace ~15 instances of `#11224E` and `#FF7200` in inline styles across Dashboard.jsx, TradeNetworkPanel.jsx, TradeFinance.jsx with CSS variable references.

---

### 1E. Inline Style Extraction (Mobile Prerequisite)

---

### T-121 | Extract Dashboard.jsx inline grid to CSS class
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace `gridTemplateColumns: '1fr 360px'` (L185) with CSS class `.dash-grid`. Required for responsive media queries.

---

### T-122 | Extract TradeFinance.jsx inline styles to CSS classes
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** M
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Extract LCTab grid (L155), ContractsTab grid (L424), LCStepper layout (L45-64) to `.tf-grid`, `.lc-stepper`, `.lc-step`, `.lc-connector`.

---

### T-123 | Extract Payments.jsx inline styles to CSS classes
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Extract grid styles (L142, L267) to `.pay-grid`, `.pay-grid--detail`, `.pay-form-amount`.

---

### T-124 | Extract TangleExplorer.jsx inline grid to CSS class
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Extract `gridTemplateColumns: 'repeat(5, 1fr)'` (L42) to `.analytics-filters`.

---

### 1F. Responsive Breakpoints and Core Navigation

---

### T-125 | Add base responsive breakpoint media queries
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-121, T-122, T-123, T-124
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Three-tier breakpoints in `index.css`: tablet (1023px), mobile (767px), small mobile (480px). Base grid overrides for `.g4`, `.g3`, `.g2`.

---

### T-126 | Implement sidebar drawer for tablet
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Hide sidebar below 1024px. `sidebarOpen` state in App.jsx. Slide-out drawer (260px, fixed, z-50, shadow) with overlay. Close on nav item click or overlay tap.

---

### T-127 | Add hamburger menu button to header
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-126
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`.hdr-menu` button, left-aligned before org name. Visible only below 1024px. Wired to `setSidebarOpen`.

---

### T-128 | Implement mobile header adaptation
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-127
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Mobile: search collapses to icon with expandable overlay, hide user info text (avatar only), truncate org name. Tablet: search flex-shrinks.

---

### T-129 | Implement bottom tab bar for phones
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-126
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Fixed bottom bar (56px) for < 768px. 5 tabs: Dashboard, Consignments, Payments, Trade Finance, Network. Active tab highlighted. Content gets padding-bottom.

---

### 1G. Component-Level Mobile Adaptations

---

### T-130 | Dashboard mobile: stat cards and grid
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-121, T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`.g4` becomes 2x2 below 768px, 1-column below 480px. `.dash-grid` becomes single column below 1024px.

---

### T-131 | Dashboard mobile: consignment table to card list
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-130
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Card-based view for consignment table. Each card: UCR, status, route, product. Table hidden below 768px.

---

### T-132 | Consignments page: table-to-card conversion
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`.csg-card-list` mobile view. Card: UCR, status, route, product, docs count, value. Tap expands detail. Meta grid 2-column on mobile.

---

### T-133 | Payments page: responsive grid and table-to-card
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-123, T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Single-column below 1024px. Card list below 768px. Detail inline instead of side-by-side.

---

### T-134 | Network page: map height and responsive grids
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Map 480px -> 280px on mobile. Hero stats 2x2 wrap. Bottom grid single column.

---

### T-135 | Network page: country detail as bottom sheet
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-134
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

TradeNetworkPanel detail panel becomes bottom sheet on mobile (full-width, max 55%, border-radius 12px top).

---

### T-136 | TradeFinance: stepper vertical conversion
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-122, T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

6-step LC stepper vertical on < 768px. Connector becomes vertical. Grid single column. Tables to card lists.

---

### T-137 | Identity page: responsive grids and peer table cards
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`.g3` single column. Peer table to card list on mobile.

---

### T-138 | TangleExplorer: filter grid responsive
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-124, T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

5-column `.analytics-filters` to 2-column on mobile.

---

### T-139 | Permissions page: matrix to card list
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Hide permission matrix table on mobile. Per-consignment card list showing each org's access status.

---

### 1H. Touch and Accessibility

---

### T-140 | Wrap hover states in @media (hover: hover)
- **Status:** backlog
- **Phase:** 1
- **Priority:** P3
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Prevent sticky hover on touch devices. All `:hover` rules wrapped in `@media (hover: hover)`.

---

### T-141 | Increase touch targets to WCAG 2.1 AA (44x44px)
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** M
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Targets: `.sb-nav button`, `.btn-sm`, `.hdr-bell`, `.tn-zoom-btn`, table rows, `.cred-row`.

---

### T-142 | Convert modals to bottom sheets on mobile
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** mobile
- **Effort:** S
- **Dependencies:** T-125
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Modals on < 768px: `width: 100%`, `max-height: 90vh`, `border-radius: 16px 16px 0 0`.

---

### T-1V07 | Support Vietnamese diacritics in config and UI
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** S
- **Dependencies:** none
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Low effort but high embarrassment risk. A demo shown to MOIT must correctly render Vietnamese names.

Verify UTF-8 Vietnamese characters across the pipeline: config JSON parsing, Express API, React rendering, PDF templates, XML templates. Test with real names.

---

### 1I. Validation and Cleanup

---

### T-143 | Create Cambodia-EU corridor config for validation
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** config
- **Effort:** L
- **Dependencies:** T-101, T-116, T-114
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Cambodia uses ASYCUDA (not VNACCS) and different business registration formats than Vietnam's MST system.

Create `configs/cambodia-eu.json` with different orgs, countries, branding colors, geography. Validates config system works without code changes.

---

### T-1V04 | Create vietnam-eu.json corridor config
- **Status:** backlog
- **Phase:** 1
- **Priority:** P2
- **Category:** vietnam-specific
- **Effort:** S
- **Dependencies:** T-1V03, T-143
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Same origin actors but European destination orgs (Nike EU, EU Customs Rotterdam), EVFTA instead of CPTPP, Port of Rotterdam. Tests same-origin/different-destination scenario.

---

### T-144 | Remove hardcoded fallback arrays from server
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** server
- **Effort:** M
- **Dependencies:** T-143
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** This is the only breaking change. Config file becomes required.

Remove hardcoded data from `server/index.js`. Server exits with clear error if config file missing.

---

### T-145 | End-to-end testing: config system
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** testing
- **Effort:** M
- **Dependencies:** T-143, T-144
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Test both configs end-to-end. Vietnam-US: verify identical to current demo. Cambodia-EU: verify different branding, orgs, consignments. Login works on both nodes for both.

---

### T-146 | End-to-end testing: mobile responsiveness
- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** testing
- **Effort:** M
- **Dependencies:** T-128, T-129, T-131, T-132
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Test iPad (1024x768) and iPhone (375x812). Verify: no horizontal scroll, drawer works, hamburger visible, bottom nav functional, card lists render, modals as bottom sheets, 44px+ targets.

---

### T-147 | Update Docker Compose for CONFIG_FILE env var
- **Status:** backlog
- **Phase:** 1
- **Priority:** P1
- **Category:** infrastructure
- **Effort:** S
- **Dependencies:** T-104
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Accept `CONFIG_FILE` env var per service. Default to `./configs/vietnam-us.json`.

---

## Phase 2: API Adapter Layer + Real Node Integration

### 2A. Infrastructure and Node Setup

---

### T-201 | Request TWIN Node staging/testnet access
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** S
- **Dependencies:** none (can start during Phase 1)
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** PRIMARY EXTERNAL DEPENDENCY. Vietnam-specific risk: TWIN team may not have experience with Vietnam data model extensions.

Coordinate with IOTA Foundation / TWIN team for Docker images, registry credentials, testnet configuration.

---

### T-202 | Deploy TWIN Node Alpha on testnet
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** L
- **Dependencies:** T-201
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Bootstrap with Vietnam corridor actor identities. Include origin composition test data.

Set up `supply-chain-node` (Alpha) with identity, notarization, blob storage. Document config, ports, health checks.

---

### T-203 | Deploy TWIN Node Beta on testnet
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** M
- **Dependencies:** T-201
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Second `supply-chain-node` (Beta) with identity and notarization.

---

### T-204 | Fund testnet wallets via IOTA faucet
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** S
- **Dependencies:** T-202, T-203
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Obtain testnet IOTA tokens for both wallets. Document faucet process and addresses.

---

### 2B. Adapter Layer Scaffolding

---

### T-205 | Scaffold adapter Express server
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-145
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Create `server/adapter/index.js` mirroring all `/api/*` routes. Initially pass-through to existing demo server.

---

### T-206 | Implement TWIN Node REST client wrapper
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-202
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`server/adapter/twin-client.js` with typed methods: `login()`, `createIdentity()`, `issueCredential()`, `createNotarization()`, `uploadBlob()`, `getAuditTrail()`.

---

### T-207 | Implement adapter session/JWT middleware
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-206
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`server/adapter/middleware/session.js`: JWT token management, refresh, mapping from demo auth to TWIN Node auth.

---

### T-208 | Implement adapter error translation middleware
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** adapter
- **Effort:** S
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`server/adapter/middleware/error.js`: translate TWIN Node errors to demo's expected format.

---

### T-209 | Implement ADAPTER_MODE env var toggle
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** S
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Extend with `GOV_INTEGRATION_MODE=mock|stub|live` for government system toggles (eCoSys, VNACCS available much later than IOTA testnet).

`ADAPTER_MODE=real|simulated`. Simulated = fallback to demo server logic. Real = call TWIN Node.

---

### 2C. Real DID and Identity Integration

---

### T-210 | Implement adapter auth routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-207, T-209
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`POST /api/login`, `GET /api/node`. Real mode: call TWIN Node authentication. Simulated: current behavior.

---

### T-211 | Implement adapter identity routes (real DID)
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-206, T-210
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`POST /api/orgs/:id/register`: real IOTA Identity `did:iota:testnet:0x...` + W3C VC issuance with regNumber claim.

---

### T-212 | Implement adapter org routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-211
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`GET /api/orgs`, `GET /api/orgs/:id`. Enriches config orgs with real DID status from TWIN identity service.

---

### T-213 | Verify DID resolvability on IOTA Explorer
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** testing
- **Effort:** S
- **Dependencies:** T-211
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

End-to-end: created DIDs resolve on IOTA Explorer. Target round-trip < 8 seconds.

---

### 2D. Real Notarization Integration

---

### T-214 | Implement adapter notarization routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-206, T-210
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Tangle log writes via `POST /notarization` (SHA-256 as Move object). Reads from `GET /notarization`.

---

### T-215 | Implement adapter document routes with real notarization
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-214
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`POST /api/documents`: hash file, upload to Blob Storage, create UNECE record, notarize on-chain.

---

### T-216 | Verify notarization on-chain hash matching
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** testing
- **Effort:** S
- **Dependencies:** T-215
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Upload doc, verify SHA-256 matches on-chain. Target round-trip < 5 seconds.

---

### 2E. Vietnam-Specific Integrations

---

### T-2V01 | Design eCoSys integration adapter stub
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** eCoSys API format unknown (Q6 topology-tracker.md). HIGH risk of unavailability (RV-01).

Stub simulating MOIT C/O data flow. Three integration modes: push (webhook), poll (query), manual (upload). Designed for replaceability.

---

### T-2V02 | Design VNACCS integration adapter stub
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** VNACCS API likely restricted (Q7 topology-tracker.md). Based on Japan's NACCS (S15). HIGH risk (RV-02).

Stub simulating customs clearance data flow. Clearance status webhook pattern (pending -> cleared -> departed).

---

### T-2V03 | Implement origin composition calculator
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-1V03, T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Thresholds depend on T8 output. Make fully configurable.

Calculator: input materials -> `IOriginComposition` output. Configurable per HS code (different rules for HS61 vs HS62). Value-based and weight-based methods.

---

### T-2V04 | Implement Vietnam-specific ISN signal types
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-205, T-214
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Signal types: `origin-verified-despatch`, `origin-pre-notification`, `co-issued`, `export-cleared`. Dummy endpoints for Phase 2.

---

### T-2V05 | Add UFLPA attestation field to consignment model
- **Status:** backlog
- **Phase:** 2
- **Priority:** P2
- **Category:** regulatory
- **Effort:** S
- **Dependencies:** T-1V03, T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Boolean `uflpaAttestation` for US-bound consignments. Compliance indicator in UI. Include in ISN payloads to US CBP.

---

### T-2V06 | Test cross-border data flow: Alpha to Beta
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** testing
- **Effort:** M
- **Dependencies:** T-215, T-1V07
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Test: (1) origin composition crosses P2P, (2) MOIT C/O as immutable snapshot, (3) ODRL field restrictions, (4) Vietnamese diacritics survive round-trip.

---

### T-2V07 | Design ODRL policy templates for Vietnam corridor
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Use Vietnamese port codes VNSGN, VNHPH.

Templates: US CBP origin verification, EU Customs read, MOIT monitoring, data sovereignty constraint (hashes only cross borders).

---

### 2F. Remaining Adapter Routes and Testing

---

### T-217 | Implement adapter consignment routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-206, T-210
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

CRUD for consignments. Maps to TWIN supply chain service. Translates demo model to UNECE `ISupplyChainAppConsignment`.

---

### T-218 | Implement adapter permission routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P2
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Permissions remain in-memory in Phase 2. Adapter generates ODRL policy stubs previewing Phase 3.

---

### T-219 | Implement adapter finance routes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P2
- **Category:** adapter
- **Effort:** S
- **Dependencies:** T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Finance fully simulated in Phase 2. Pass-through from demo server logic.

---

### T-220 | Implement hybrid Tangle log (real + simulated)
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** adapter
- **Effort:** M
- **Dependencies:** T-214
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Merge real on-chain entries with simulated events. Real entries get on-chain indicator.

---

### T-221 | Adapter test: simulated mode parity
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** testing
- **Effort:** M
- **Dependencies:** T-210, T-212, T-214, T-217, T-218, T-219
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`ADAPTER_MODE=simulated` must be identical to current demo. Test all 9 pages end-to-end.

---

### T-222 | Adapter test: real mode end-to-end
- **Status:** backlog
- **Phase:** 2
- **Priority:** P0
- **Category:** testing
- **Effort:** L
- **Dependencies:** T-221
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Full flow with real TWIN Nodes: login, register DID, upload + notarize doc, view real Tangle entries.

---

### T-223 | Update Docker Compose for adapter + TWIN Nodes
- **Status:** backlog
- **Phase:** 2
- **Priority:** P1
- **Category:** infrastructure
- **Effort:** M
- **Dependencies:** T-202, T-203, T-205
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Add adapter, TWIN Node Alpha, TWIN Node Beta services. Networking, env vars, health checks.

---

## Phase 3: Full Real Node Integration

---

### T-301 | Research and document DSC protocol configuration
- **Status:** backlog
- **Phase:** 3
- **Priority:** P0
- **Category:** documentation
- **Effort:** L
- **Dependencies:** T-222
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** HIGH risk: DSC config is complex. Two-channel architecture (ASW + TWIN) adds protocol design complexity.

Work with TWIN team (Ian Clark) on DSC setup, authentication (JWT-VC), ODRL format for Vietnam.

---

### T-302 | Implement DSC-based cross-border data exchange
- **Status:** backlog
- **Phase:** 3
- **Priority:** P0
- **Category:** integration
- **Effort:** L
- **Dependencies:** T-301
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** DSC metadata must indicate Channel B (TWIN) and include eCoSys C/O reference for cross-channel correlation.

Replace WebSocket P2P with DSC protocol (HTTPS). Map SHARE/REVOKE/HANDSHAKE to DSC equivalents.

---

### T-303 | Integrate Auditable Item Graph for Tangle log
- **Status:** backlog
- **Phase:** 3
- **Priority:** P1
- **Category:** integration
- **Effort:** L
- **Dependencies:** T-222
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace hybrid Tangle log with full AIG integration. Events as AIG entries with on-chain anchoring via AIS.

---

### T-304 | Implement real ODRL policy enforcement
- **Status:** backlog
- **Phase:** 3
- **Priority:** P1
- **Category:** integration
- **Effort:** L
- **Dependencies:** T-301
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Share/revoke create real ODRL policies. Access checks via `GET /rights/policies`. Replaces in-memory permission system.

---

### T-305 | Migrate consignment model to UNECE D23B
- **Status:** backlog
- **Phase:** 3
- **Priority:** P1
- **Category:** adapter
- **Effort:** L
- **Dependencies:** T-217
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Must preserve origin composition data. Two-level structure (transport + included consignments). IOriginComposition extension must be approved by TWIN team.

Map to `ISupplyChainAppConsignment` + `IUneceDocument`. Implement `IOriginComposition` extension.

---

### T-3V01 | Formalize IOriginComposition as TWIN model extension
- **Status:** backlog
- **Phase:** 3
- **Priority:** P0
- **Category:** vietnam-specific
- **Effort:** L
- **Dependencies:** T-305, T-2V03
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Must support multiple calculation methods (value-based for US, different EVFTA thresholds for HS61 vs HS62). Single `totalVietnamContentPercent` is insufficient.

Formal model extension: `calculationResults[]` per regulation (CPTPP, EVFTA, US tariff), each with method and determination. Coordinate with TWIN core team.

---

### T-306 | Implement federated catalogue for org discovery
- **Status:** backlog
- **Phase:** 3
- **Priority:** P2
- **Category:** integration
- **Effort:** M
- **Dependencies:** T-302
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Replace WebSocket `ORG_DIRECTORY` with DSC federated catalogue.

---

### T-3V02 | Implement data sovereignty enforcement mode
- **Status:** backlog
- **Phase:** 3
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** L
- **Dependencies:** T-302, T-304
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Blocked by T8 findings. Vietnam Cybersecurity Law may require this.

Sovereign mode: full documents stay on Alpha, only hashes/proofs/summaries cross to Beta. ODRL auto-enforces data residency.

---

### T-3V03 | Implement multi-destination ISN subscriber config
- **Status:** backlog
- **Phase:** 3
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-302, T-2V04
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Per-destination subscriber config: US CBP gets UFLPA fields, EU Customs gets EVFTA fields, Japan gets CPTPP data.

---

### T-307 | Add ISN signal notification stubs
- **Status:** backlog
- **Phase:** 3
- **Priority:** P3
- **Category:** integration
- **Effort:** M
- **Dependencies:** T-302
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Destination customs notification stubs.

---

### T-3V04 | NDATrace integration assessment
- **Status:** backlog
- **Phase:** 3
- **Priority:** P2
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T9 output
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Depends on T9 answering Q28/Q29. If NDATrace has no API, close this task.

Assess NDATrace API availability. If available, create adapter stub for traceability cross-referencing.

---

### T-308 | Phase 3 end-to-end testing
- **Status:** backlog
- **Phase:** 3
- **Priority:** P0
- **Category:** testing
- **Effort:** L
- **Dependencies:** T-302, T-303, T-304
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Full corridor flow: create consignment, share via DSC, verify ODRL, verify AIG, revoke within 10s. Both Vietnam-US and Cambodia-EU configs.

---

## Phase 4: Production Readiness

---

### T-401 | Replace demo credentials with proper auth
- **Status:** backlog
- **Phase:** 4
- **Priority:** P0
- **Category:** server
- **Effort:** L
- **Dependencies:** T-308
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

OAuth2 or PIN-based auth. Update Login.jsx if flow changes.

---

### T-4V02 | Vietnamese government SSO integration
- **Status:** backlog
- **Phase:** 4
- **Priority:** P2
- **Category:** vietnam-specific
- **Effort:** M
- **Dependencies:** T-401, T9 output
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Investigate Vietnam government SSO (SAML 2.0 / OIDC). If none exists, design PIN or certificate-based auth for MOIT/Customs users.

---

### T-402 | Implement PostgreSQL persistence layer
- **Status:** backlog
- **Phase:** 4
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** L
- **Dependencies:** T-308
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** If data sovereignty requires Vietnam hosting, PostgreSQL must be on Vietnamese cloud (Viettel Cloud, VNPT, FPT).

Migrate in-memory stores to managed PostgreSQL. Schema, migrations, adapter route updates.

---

### T-403 | Migrate document storage to cloud blob storage
- **Status:** backlog
- **Phase:** 4
- **Priority:** P1
- **Category:** infrastructure
- **Effort:** M
- **Dependencies:** T-402
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

S3 or GCS. Upload docs, store references in PostgreSQL.

---

### T-404 | Implement key management with Vault or KMS
- **Status:** backlog
- **Phase:** 4
- **Priority:** P0
- **Category:** infrastructure
- **Effort:** L
- **Dependencies:** T-401
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Private keys to HashiCorp Vault or AWS KMS. No secrets in config or logs.

---

### T-405 | Add health checks and structured logging
- **Status:** backlog
- **Phase:** 4
- **Priority:** P1
- **Category:** infrastructure
- **Effort:** M
- **Dependencies:** T-402
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

`GET /health` with component status. JSON structured logging. Request IDs for tracing.

---

### T-406 | Create Kubernetes manifests and production Docker Compose
- **Status:** backlog
- **Phase:** 4
- **Priority:** P1
- **Category:** infrastructure
- **Effort:** L
- **Dependencies:** T-405
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

K8s deployments, TLS termination, resource limits, probes, HPA.

---

### T-4V01 | Vietnam-hosted deployment option
- **Status:** backlog
- **Phase:** 4
- **Priority:** P1
- **Category:** vietnam-specific
- **Effort:** L
- **Dependencies:** T8 output, T-3V02
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:** Blocked by T8 findings on data sovereignty.

Evaluate Viettel Cloud, VNPT, FPT Cloud. Manifests for Vietnamese provider. Hybrid option: Alpha in Vietnam, Beta in EU/US cloud.

---

### T-407 | Security audit and hardening
- **Status:** backlog
- **Phase:** 4
- **Priority:** P0
- **Category:** testing
- **Effort:** L
- **Dependencies:** T-401, T-402
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Input validation, CSRF, rate limiting, CSP, SQL injection prevention. No secrets in logs.

---

### T-408 | Write operator deployment guide
- **Status:** backlog
- **Phase:** 4
- **Priority:** P1
- **Category:** documentation
- **Effort:** M
- **Dependencies:** T-406
- **Branch:**
- **Assignee:** Valerio Mellini
- **Notes:**

Operator guide: deploy, configure, monitor, troubleshoot. Target: scratch to running in < 15 minutes.

---

## Critical Path

```
Phase 1 (two parallel workstreams):

Config:  T-101 -> T-102 -> T-104 -> T-105/T-106 -> T-109 -> T-111 -> T-113/T-114/T-116 -> T-143 -> T-144 -> T-145
Mobile:  T-121/T-122/T-123/T-124 -> T-125 -> T-126 -> T-127 -> T-128 -> T-146
Theming: T-118 -> T-119 -> T-120

Phase 2:
Infra:   T-201 -> T-202/T-203 -> T-204
Adapter: T-205 -> T-206 -> T-207 -> T-210 -> T-211 -> T-213
Notarize:                          T-214 -> T-215 -> T-216
Testing:                                              T-221 -> T-222

Phase 3:
DSC:     T-301 -> T-302 -> T-308
AIG:     T-303 ----^
ODRL:    T-304 ----^

Phase 4:
Auth:    T-401 -> T-404
Persist: T-402 -> T-405 -> T-406
Audit:   T-407
```

## Risk Register (Vietnam-Specific)

| ID | Risk | Probability | Impact | Mitigation |
|----|------|------------|--------|------------|
| RV-01 | eCoSys API unavailable | HIGH | HIGH | Manual upload fallback from day one |
| RV-02 | VNACCS API unavailable | HIGH | HIGH | Manual fallback, research third-party access precedent |
| RV-03 | Vietnam Cybersecurity Law forces local hosting | MEDIUM | HIGH | Design location-agnostic adapter, evaluate Vietnamese clouds early |
| RV-04 | MOIT C/O format incompatible with UNECE D23B | MEDIUM | MEDIUM | Request sample from T9, fallback to OCR if PDF-only |
| RV-05 | Two-channel confusion at destination customs | LOW | HIGH | Document clearly, include eCoSys C/O reference in TWIN data |
| RV-06 | Named pilot manufacturer not confirmed | MEDIUM | MEDIUM | Config system makes switching a 30-minute task |
| RV-07 | Vietnamese diacritics rendering issues | LOW | MEDIUM | UTF-8 test cases in Phase 1 |
| RV-08 | MLETR not adopted in Vietnam | MEDIUM | LOW (pilot) | Display "simulation mode" indicator |
| RV-09 | Origin composition thresholds unknown | MEDIUM | MEDIUM | Make calculator fully configurable |
| RV-10 | ASW 2.0 evolves conflicting standards | LOW | MEDIUM | Monitor via Nitas Polachai, adapter pattern supports format transformation |
