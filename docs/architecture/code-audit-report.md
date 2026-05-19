# Code Architecture Audit Report

**Date:** 2026-05-19
**Auditor:** Solution Architect Agent
**Repository:** `kchain-solutions/moit-demo`
**Branch:** `develop`
**Version:** 2.0.0

---

## 1. Executive Summary

The TWIN Demo is a well-structured demonstration platform that has successfully delivered Phase 1: a config-driven, mobile-responsive two-node trade corridor simulation. The config system is well-designed and the overall architecture is clean for a demo-stage project. However, the codebase has accumulated significant technical debt that will impede Phase 2 (adapter layer integration). The primary concerns are: (1) a 1054-line monolithic server file that mixes routing, business logic, data access, PDF generation, and WebSocket handling; (2) extensive code duplication across frontend components (~607 inline style occurrences and multiple copies of utility functions like `fmtValue`, `StatusPill`, `DocsPill`, `DOC_COLORS`); and (3) zero automated test coverage. These issues are manageable now but will become blocking as the adapter layer adds another 1000+ lines of route logic.

---

## 2. Strengths

### 2.1 Config-Driven Architecture (Excellent)
- Clean separation between corridor data and application logic
- JSON Schema (`configs/demo-config.schema.json`) is thorough with examples and descriptions
- `server/config.js` is minimal and correct: 40 lines, single responsibility
- Frontend `ConfigContext` cleanly applies theme overrides and provides config to all components
- `data/countries.js` properly delegates to config with no hardcoded fallbacks

### 2.2 WebSocket P2P Peering (Good)
- Bidirectional peer connection with handshake protocol
- Clean message type routing (`HANDSHAKE`, `ORG_UPDATE`, `SHARE_CONSIGNMENT`, `REVOKE_CONSIGNMENT`, `LEDGER_ENTRY`)
- Graceful degradation for Vercel serverless (polling fallback)
- Data sovereignty enforced: revoke propagates to peer and deletes data

### 2.3 API Client Layer (Good)
- `client/src/utils/api.js` is concise (46 lines), provides a clean facade over REST endpoints
- Single `req()` helper with consistent error handling
- All API methods are named semantically

### 2.4 Proxy Server (Good)
- `server/proxy.js` is a clean, focused 110-line file
- Cookie-based node routing is simple and effective
- WebSocket upgrade proxying works correctly

### 2.5 Mobile Responsiveness (Good)
- CSS breakpoints at 1023px, 767px, 479px cover tablet, phone, and small phone
- Desktop table / mobile card pattern is consistent across all components
- Touch target compliance (44px minimum) for WCAG 2.1 AA
- Bottom tab bar and sidebar drawer are well-implemented

### 2.6 Config Schema Quality (Excellent)
- `demo-config.schema.json` uses `additionalProperties: false` to catch typos
- Examples embedded in schema descriptions serve as documentation
- Comprehensive: covers corridor metadata, branding, theme, nodes, credentials, consignments, documents, templates, finance, geography

### 2.7 Docker Compose (Adequate)
- Three-service setup (alpha, beta, proxy) is correct
- CONFIG_FILE env var support in place
- Services use internal DNS names for peer connections

---

## 3. Areas of Improvement

### 3.1 Server Monolith (1054 Lines)

**Current state:** `server/index.js` is a single 1054-line file containing:
- CLI argument parsing (lines 16-23)
- Data persistence helpers (lines 28-40)
- ID/hash generators (lines 42-45)
- Credential validation logic (lines 48-64)
- Organization initialization (lines 67-71)
- In-memory store definition (lines 73-79)
- Ledger log management (lines 81-96)
- PDF generation (lines 98-212)
- XML generation (lines 214-394)
- Consignment seeding (lines 397-496)
- Express app setup (lines 498-503)
- 18 API route handlers (lines 506-877)
- WebSocket server setup (lines 879-953)
- Finance data seeding (lines 956-1042)
- Server startup (lines 1044-1054)

**Impact:** HIGH -- Phase 2 adapter layer will need to proxy every route. Refactoring into modules first makes the adapter pattern straightforward.

**Recommended improvement:** Extract into modules:
- `server/routes/auth.js` - login
- `server/routes/orgs.js` - org CRUD and DID registration
- `server/routes/consignments.js` - consignment CRUD
- `server/routes/documents.js` - document CRUD, upload, download, XML
- `server/routes/permissions.js` - share, revoke
- `server/routes/finance.js` - payments, LC, smart contracts, finance permissions
- `server/routes/ledger.js` - ledger read
- `server/routes/node.js` - node info, discovery, connect/disconnect
- `server/store.js` - in-memory store with accessor methods
- `server/generators/pdf.js` - PDF generation
- `server/generators/xml.js` - XML generation
- `server/seed.js` - consignment and finance seeding
- `server/ws.js` - WebSocket + P2P logic

**Effort:** L
**Files affected:** `server/index.js` (split into ~12 files)
**Dependencies:** None, but should be done before Phase 2 adapter work (T-205)

---

### 3.2 Duplicated Frontend Utility Functions

**Current state:** The following functions are defined identically (or near-identically) in multiple component files:

| Function | Files |
|----------|-------|
| `fmtValue()` / `fmtVal()` | Dashboard.jsx, Consignments.jsx, Payments.jsx, TradeFinance.jsx |
| `StatusPill` | Dashboard.jsx, Consignments.jsx |
| `DocsPill` | Dashboard.jsx, Consignments.jsx |
| `DOC_COLORS` | Dashboard.jsx, Consignments.jsx |
| `DocTypeIcon` | Dashboard.jsx, Consignments.jsx |

The `fmtValue` function in Dashboard/Consignments differs slightly from the `fmtVal` in TradeFinance/Payments (different naming, minor formatting differences).

**Impact:** MEDIUM -- Any change to formatting logic requires updating 4 files. Risk of formatting inconsistency.

**Recommended improvement:** Create `client/src/utils/format.js` for value formatting and `client/src/components/shared/Pills.jsx` (or similar) for shared UI primitives.

**Effort:** S
**Files affected:** Dashboard.jsx, Consignments.jsx, Payments.jsx, TradeFinance.jsx, new `utils/format.js`, new `components/shared/` directory
**Dependencies:** None

---

### 3.3 Excessive Inline Styles

**Current state:** 607 inline `style={{...}}` occurrences across 12 component files. Examples:

- Dashboard.jsx: 87 inline styles
- TradeFinance.jsx: 161 inline styles
- Identity.jsx: 83 inline styles
- Payments.jsx: 64 inline styles

Many are repeated patterns like `{ fontSize: 12, fontWeight: 600, color: '#64748b' }` (label styling) or `{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }` (table cell styling).

**Impact:** MEDIUM -- Makes visual consistency difficult, increases bundle size, prevents CSS caching, and will make theming changes painful.

**Recommended improvement:** Extract repeated style patterns into CSS classes in `index.css` or new component-specific CSS files. Priority targets:
1. Label styles (`fontSize: 11-12, fontWeight: 600-700, color: '#64748b', textTransform: 'uppercase'`) -- appears ~50 times
2. Modal containers (repeated in TradeFinance, Payments, Consignments) -- `position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)'`
3. Table cell padding patterns
4. Card header patterns

**Effort:** M
**Files affected:** All component files, `index.css`
**Dependencies:** None

---

### 3.4 Inconsistent Modal Patterns

**Current state:** Two different modal implementation patterns exist:

1. **CSS class-based** (used in Dashboard, Consignments, Identity, Network):
   ```jsx
   <div className="modal-bg" onClick={onClose}>
     <div className="modal" onClick={e => e.stopPropagation()}>
   ```

2. **Inline style-based** (used in TradeFinance, Payments):
   ```jsx
   <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', ... }}>
     <div className="card modal-card" style={{ width: 520, ... }}>
   ```

The CSS `modal-bg` class already has responsive behavior (bottom sheet on mobile). The inline-style modals bypass this.

**Impact:** MEDIUM -- The inline-style modals in TradeFinance and Payments do not get the mobile bottom-sheet behavior that `modal-bg` provides. This is a UX inconsistency on mobile devices.

**Recommended improvement:** Standardize all modals to use the `modal-bg` / `modal` CSS class pattern. Consider extracting a `<Modal>` wrapper component.

**Effort:** S
**Files affected:** TradeFinance.jsx, Payments.jsx
**Dependencies:** None

---

### 3.5 Zero Automated Test Coverage

**Current state:** No test files exist in the project. No test runner is configured (no Jest, Vitest, or Playwright in dependencies). The only test-related task (T-145, T-146) refers to end-to-end testing, but T-146 was marked done without evidence of test infrastructure.

**Impact:** HIGH -- Regressions are caught only by manual testing. The Phase 2 adapter layer (T-221: simulated mode parity, T-222: real mode end-to-end) explicitly requires tests. Without a test framework, those tasks cannot start.

**Recommended improvement:**
1. Add Vitest for unit testing (already using Vite, so Vitest is zero-config)
2. Add at minimum: server route tests for all API endpoints
3. Add frontend component tests for shared utilities
4. Add Playwright for E2E testing of critical flows

**Effort:** L (framework setup: S, writing tests: L)
**Files affected:** `package.json`, new `tests/` directory
**Dependencies:** Should be done before Phase 2

---

### 3.6 Silent Error Swallowing

**Current state:** 22 occurrences of `.catch(() => {})` across 9 files. Every API call in component `useEffect` hooks silently discards errors:

```javascript
api.getOrgs().then(setOrgs).catch(() => {});
api.getConsignments(user.id).then(setConsignments).catch(() => {});
```

On the server side, error handlers are also minimal:
```javascript
ws.on('error', () => {});
} catch (e) {}
```

**Impact:** MEDIUM -- When API calls fail, the user sees no feedback. During demo presentations, a silent failure could leave the presenter confused with stale or empty data and no indication of what went wrong.

**Recommended improvement:**
1. Create a centralized error handling utility (`client/src/utils/errorHandler.js`)
2. Add a toast/notification system for transient errors
3. On the server, add structured error logging (at minimum `console.error`)
4. Replace `catch(() => {})` with `catch(err => handleError(err))` or `catch(console.error)`

**Effort:** M
**Files affected:** All component files, NodeContext.jsx, ConfigContext.jsx
**Dependencies:** None

---

### 3.7 Missing Loading States

**Current state:** Most components fetch data in `useEffect` and render empty states while loading. Only `Payments.jsx` has a proper loading state (`if (loading) return <div>Loading payments...</div>`). Other components show empty data containers briefly before data arrives, causing a visual flash.

Examples of missing loading states:
- Dashboard: stats show "---" briefly before data loads
- Consignments: table shows "No consignments" flash
- Identity: org cards flash empty
- Permissions: matrix shows "No consignments" then populates
- LedgerExplorer: shows "No events yet" then populates

**Impact:** LOW -- Acceptable for a demo, but creates an unprofessional impression during presentations, especially on slower connections.

**Recommended improvement:** Add skeleton loading states or loading spinners to Dashboard, Consignments, Identity, and Permissions. Can use a shared `<LoadingState>` component.

**Effort:** S
**Files affected:** Dashboard.jsx, Consignments.jsx, Identity.jsx, Permissions.jsx
**Dependencies:** None

---

### 3.8 Large Component Files

**Current state:** Several components are excessively large for single-file components:

| File | Lines | Concern |
|------|-------|---------|
| TradeFinance.jsx | 789 | Contains 3 major sub-components (LCTab, ContractsTab, main), 2 modal dialogs |
| TradeNetworkPanel.jsx | 823 | 15+ internal functions/components, complex SVG rendering logic |
| Consignments.jsx | 505 | Main component + 3 modal sub-components |
| Payments.jsx | 372 | Main component + 2 modal sub-components |
| Identity.jsx | 400 | Main component + inline OrgCard, verification modal, credential modal |
| Dashboard.jsx | 443 | Main component with inline document panel, XML viewer routing |

**Impact:** MEDIUM -- Large files are harder to navigate, review, and maintain. The TradeNetworkPanel (823 lines) is especially complex because it mixes data aggregation, SVG geometry calculations, and React component rendering.

**Recommended improvement:**
- Extract modal components from Consignments, TradeFinance, Payments, and Identity into separate files
- Split TradeNetworkPanel into: data layer (`useTradeNetwork` hook), map layer components, and side panel components
- Extract inline sub-components (OrgCard, StatCard, etc.) into shared components

**Effort:** M
**Files affected:** TradeFinance.jsx, TradeNetworkPanel.jsx, Consignments.jsx, Payments.jsx, Identity.jsx
**Dependencies:** 3.2 (shared components)

---

### 3.9 Monolithic CSS File

**Current state:** `client/src/index.css` is a single 493-line file containing all styles for the entire application. While CSS custom properties are used well for theming, the file is organized only by rough section comments. There is no scoping mechanism -- all class names are global.

Concerns:
- No CSS modules or scoped styles -- naming collisions possible as codebase grows
- Abbreviated class names (`.sb-nav`, `.sb-ft`, `.hdr`, `.cnt`, `.fg`, `.g2`, `.g3`, `.g4`, `.te`, `.vs`) hurt readability
- TradeNetworkPanel styles occupy ~100 lines of the global file
- Some styles are embedded inline (607 occurrences) rather than in this file

**Impact:** LOW for now (493 lines is manageable), but will become MEDIUM as Phase 2 adds new components.

**Recommended improvement:** Not urgent. When splitting components (3.8), consider:
1. CSS Modules per component (Vite supports them out of the box)
2. Or at minimum, longer descriptive class names with BEM-like conventions
3. Move component-specific blocks (TradeNetworkPanel, XmlViewer) to co-located CSS files

**Effort:** L (if doing full CSS modules migration), S (if just reorganizing current file)
**Files affected:** `index.css`, all component files
**Dependencies:** 3.8 (component splitting)

---

### 3.10 Security Concerns

**Current state:**
1. **Passwords stored in plain text in config JSON** -- All org passwords are `"demo"` and transmitted in plain text
2. **No authentication middleware** -- Any request to any API endpoint succeeds; there is no session or token validation
3. **No input validation** -- POST/PUT body fields are used directly without sanitization
4. **No rate limiting** -- Any endpoint can be called at any frequency
5. **CORS is fully open** -- `app.use(cors())` allows all origins
6. **File uploads stored in memory as base64** -- Large files can cause memory exhaustion

**Impact:** LOW for a demo platform (all by design for Phase 1), but HIGH if any of this reaches production. Phase 4 tasks (T-401, T-407) cover this.

**Recommended improvement:** No immediate action needed (this is a demo). Document these as known limitations. Phase 4 tasks already cover:
- T-401: Replace demo credentials with proper auth
- T-407: Security audit and hardening

**Effort:** Already planned in Phase 4
**Dependencies:** Phase 4 tasks

---

### 3.11 In-Memory Data Store Fragility

**Current state:** All application state lives in a plain JavaScript object (`store`). The only persisted data is the ledger log (saved to `data/ledger-{nodeId}.json`). All consignments, documents, permissions, payments, LCs, smart contracts, and org data are regenerated from config on every server restart.

Specific concerns:
- **No data integrity constraints** -- Duplicate IDs, orphan documents, or inconsistent permissions can occur
- **Array scanning for lookups** -- `store.consignments.find(c => c.id === ...)` is O(n) for every request
- **No transactional updates** -- A crash during a multi-step operation (e.g., share consignment + sync to peer) leaves inconsistent state
- **Document files (base64) stored in same array** -- No separation between metadata and file content; large documents bloat memory

**Impact:** LOW for demo (data is ephemeral by design). MEDIUM for Phase 2+ where real data will flow through the adapter.

**Recommended improvement:**
1. Short-term: Extract store into `server/store.js` with methods like `store.findConsignment(id)`, `store.addDocument(doc)`, etc. Use Maps instead of arrays for O(1) lookups.
2. Long-term: Phase 4 task T-402 (PostgreSQL persistence) covers the real solution.

**Effort:** S (extract store module), L (add persistence -- already planned)
**Files affected:** `server/index.js` -> `server/store.js`
**Dependencies:** 3.1 (server refactor)

---

### 3.12 Hardcoded Magic Numbers and Strings

**Current state:** Various hardcoded values scattered throughout:

Server:
- Trust score hardcoded to `87` in Dashboard.jsx (line 170)
- `DocsPill` hardcoded total of `6` documents (Dashboard line 236, Consignments line 206)
- Polling interval `4000`ms in NodeContext.jsx
- `timeout(2500)` in connect endpoint
- PDF page dimensions `612 792` repeated twice

Frontend:
- Hardcoded colors like `#11224E`, `#FF7200`, `#16a34a` in DOC_COLORS and stat cards instead of CSS variables
- Hardcoded currency symbols in `fmtValue` (only supports USD, EUR, KES)
- `COMPASS_POINTS` / `ORG_COMPASS_OVERRIDE` with hardcoded org IDs (`org1`, `org2`, `org3`)

**Impact:** LOW -- Most are demo-specific values. The trust score (87) and document total (6) are presentation artifacts.

**Recommended improvement:** Move demo-specific presentation values to config or constants files. Replace hardcoded colors with CSS custom properties where possible.

**Effort:** S
**Files affected:** Dashboard.jsx, Consignments.jsx, NodeContext.jsx, TradeNetworkPanel.jsx
**Dependencies:** None

---

### 3.13 Missing TypeScript (Noted, Not Recommended)

**Current state:** The project uses plain JSX with no type checking. The CLAUDE.md explicitly states "No TypeScript (plain JSX)".

**Impact:** LOW for current scope. Type errors are caught at runtime only.

**Note:** This is a deliberate project decision. TypeScript migration would be a large effort for a demo platform and is not recommended at this phase. If the project evolves to production (Phase 4), TypeScript migration should be reconsidered.

---

### 3.14 Build and Deployment Gaps

**Current state:**
- Docker Compose works but uses `build: .` for all three services (builds the full image three times)
- No `.dockerignore` file found
- No health check endpoints (`/health` or `/ready`)
- No environment-specific configuration (dev vs staging vs production)
- `WS_PORT` env var in server/index.js is never used in Docker Compose (both nodes use the same HTTP port for WebSocket via upgrade)
- `concurrently` is in `dependencies` instead of `devDependencies`

**Impact:** LOW -- Docker Compose is functional. These are polish items.

**Recommended improvement:**
- Add `.dockerignore` (exclude `node_modules`, `.git`, `docs`, `.claude`)
- Move `concurrently` to devDependencies
- Add health check endpoint (already tracked as T-405)

**Effort:** S
**Files affected:** `docker-compose.yml`, `package.json`, `.dockerignore` (new)
**Dependencies:** None

---

### 3.15 Unused Vercel Configuration

**Current state:** `server/index.js` includes Vercel-specific logic (`IS_VERCEL`, conditional WebSocket disable, `export default app`). However, there is no `vercel.json` configuration file in the repository, and the Docker Compose setup is the primary deployment target.

**Impact:** LOW -- The Vercel code path is harmless but adds cognitive overhead.

**Recommended improvement:** Either remove Vercel support or add proper `vercel.json` configuration. If Vercel deployment is not planned, removing the Vercel-specific code (~10 lines) simplifies the server.

**Effort:** S
**Files affected:** `server/index.js`
**Dependencies:** None

---

## 4. Architecture Diagrams

### 4.1 Current Server Structure (Monolith)

```
server/index.js (1054 lines)
|
+-- CLI args & config loading (lines 1-23)
+-- Utility functions: genId, genHash, genDID, now (lines 42-45)
+-- Credential validation (lines 48-64)
+-- Store initialization (lines 67-79)
+-- Ledger management (lines 81-96)
+-- PDF generation (lines 98-212)
+-- XML generation (lines 214-394)
+-- Seed data (lines 397-496)
+-- Express routes:
|   +-- GET  /api/config
|   +-- POST /api/login
|   +-- GET  /api/node, /api/node/discover
|   +-- POST /api/node/connect, /api/node/disconnect
|   +-- GET  /api/orgs, /api/orgs/all
|   +-- PUT  /api/orgs/:id
|   +-- POST /api/orgs/:id/register, /api/orgs/validate-credential
|   +-- GET  /api/consignments
|   +-- POST /api/consignments
|   +-- GET  /api/documents
|   +-- POST /api/documents (multipart)
|   +-- GET  /api/documents/:id/download, /api/documents/:id/xml
|   +-- GET  /api/permissions/:consignmentId
|   +-- POST /api/permissions/share, /api/permissions/revoke
|   +-- GET  /api/finance-permissions/:consignmentId
|   +-- POST /api/finance-permissions/share
|   +-- GET  /api/payments
|   +-- POST /api/payments
|   +-- PUT  /api/payments/:id/status
|   +-- GET  /api/lc
|   +-- POST /api/lc
|   +-- PUT  /api/lc/:id/status
|   +-- GET  /api/contracts
|   +-- POST /api/contracts
|   +-- PUT  /api/contracts/:id/condition/:condId
|   +-- PUT  /api/contracts/:id/status
|   +-- GET  /api/ledger
|   +-- GET  /api/peer/orgs
|   +-- GET  * (SPA fallback)
+-- WebSocket server (lines 879-953)
+-- Finance seeding (lines 956-1042)
+-- Server start (lines 1044-1054)
```

### 4.2 Proposed Server Structure (Modular)

```
server/
  index.js              # App assembly: load config, create app, start server (~50 lines)
  config.js             # Config loader (unchanged)
  store.js              # In-memory store with accessor methods
  proxy.js              # Routing proxy (unchanged)
  middleware/
    error.js            # Centralized error handler
  routes/
    auth.js             # POST /api/login
    config.js           # GET /api/config
    node.js             # GET /api/node, discover, connect, disconnect
    orgs.js             # GET/PUT /api/orgs, register, validate
    consignments.js     # GET/POST /api/consignments
    documents.js        # GET/POST /api/documents, download, xml
    permissions.js      # GET/POST /api/permissions
    finance.js          # payments, LC, smart contracts, finance permissions
    ledger.js           # GET /api/ledger, GET /api/peer/orgs
  generators/
    pdf.js              # PDF document generation
    xml.js              # XML document generation
  seed.js               # Consignment and finance seeding
  ws.js                 # WebSocket server + P2P peer logic
```

### 4.3 Frontend Component Dependency Map

```
App.jsx
  +-- NodeContext (auth, WS, peer status)
  +-- ConfigContext (config, theme)
  +-- Login.jsx
  +-- Dashboard.jsx
  |     +-- XmlViewer.jsx
  +-- Network.jsx
  |     +-- TradeNetworkPanel.jsx
  +-- Consignments.jsx
  |     +-- XmlViewer.jsx
  |     +-- CreateModal (inline)
  |     +-- UploadModal (inline)
  |     +-- ShareModal (inline)
  +-- Payments.jsx
  +-- TradeFinance.jsx
  |     +-- LCTab (inline)
  |     +-- ContractsTab (inline)
  +-- Identity.jsx
  +-- Permissions.jsx
  +-- LedgerExplorer.jsx
```

### 4.4 Duplicated Code Map

```
fmtValue()  -----> Dashboard.jsx (lines 11-23)
            -----> Consignments.jsx (lines 7-19)         [identical copy]
fmtVal()    -----> TradeFinance.jsx (lines 8-12)          [different name, similar logic]
            -----> Payments.jsx (lines 7-14)              [different name, similar logic]

StatusPill  -----> Dashboard.jsx (lines 25-36)
            -----> Consignments.jsx (lines 21-32)          [identical copy]

DocsPill    -----> Dashboard.jsx (lines 38-41)
            -----> Consignments.jsx (lines 34-37)          [identical copy]

DOC_COLORS  -----> Dashboard.jsx (lines 43-50)
            -----> Consignments.jsx (lines 39-46)          [identical copy]

DocTypeIcon -----> Dashboard.jsx (lines 52-59)
            -----> Consignments.jsx (lines 48-55)          [identical copy]

Modal pattern (inline) -----> TradeFinance.jsx (3 modals)
                       -----> Payments.jsx (2 modals)
Modal pattern (CSS)    -----> Dashboard.jsx, Consignments.jsx, Identity.jsx, Network.jsx
```

---

## 5. Suggested Task List

### Phase 1 Cleanup (Should be done before Phase 2)

```
# T-160 | Extract server/index.js into modular route files

- **Phase:** 1
- **Priority:** P0
- **Category:** server
- **Effort:** L
- **Dependencies:** none
- **Description:** Split the 1054-line server/index.js monolith into modular files:
  server/store.js (in-memory store with Maps for O(1) lookups),
  server/routes/{auth,config,node,orgs,consignments,documents,permissions,finance,ledger}.js,
  server/generators/{pdf,xml}.js, server/seed.js, server/ws.js.
  Keep server/index.js as the assembly point (~50 lines).
  All existing API behavior must be preserved (no functional changes).
  This is prerequisite for Phase 2 adapter layer (T-205).
```

```
# T-161 | Extract shared frontend utilities and components

- **Phase:** 1
- **Priority:** P1
- **Category:** frontend
- **Effort:** S
- **Dependencies:** none
- **Description:** Create client/src/utils/format.js with unified fmtValue() and
  fmtCurrency() functions. Create client/src/components/shared/Pills.jsx with
  StatusPill, DocsPill, DocTypeIcon. Create client/src/components/shared/Modal.jsx
  wrapper component using the existing CSS modal-bg/modal classes.
  Update Dashboard, Consignments, Payments, TradeFinance, Identity to import
  from shared modules. Remove all duplicate definitions.
```

```
# T-162 | Add Vitest and baseline server API tests

- **Phase:** 1
- **Priority:** P0
- **Category:** infra
- **Effort:** M
- **Dependencies:** T-160
- **Description:** Add Vitest to devDependencies. Create tests/server/ directory.
  Write tests for all API routes covering: auth (login success/failure),
  org CRUD, consignment CRUD, document upload/download, permission share/revoke,
  payment lifecycle, LC lifecycle, smart contract lifecycle, ledger read.
  Target: every route handler has at least one success and one error test.
  This is prerequisite for T-221 (adapter simulated mode parity).
```

```
# T-163 | Replace silent error catches with proper error handling

- **Phase:** 1
- **Priority:** P2
- **Category:** frontend
- **Effort:** S
- **Dependencies:** none
- **Description:** Create client/src/utils/errorHandler.js with a handleApiError()
  function that logs errors and optionally displays a non-intrusive notification.
  Replace all 22 instances of .catch(() => {}) across 9 frontend files with
  .catch(handleApiError). On the server, replace catch blocks that swallow
  errors (ws.on('error', () => {})) with at minimum console.error logging.
```

```
# T-164 | Standardize modal patterns across all components

- **Phase:** 1
- **Priority:** P2
- **Category:** frontend
- **Effort:** S
- **Dependencies:** T-161
- **Description:** Convert all inline-style modals in TradeFinance.jsx (3 modals)
  and Payments.jsx (2 modals) to use the shared Modal component from T-161.
  Ensure all modals get the mobile bottom-sheet behavior from the existing
  CSS .modal-bg class. Verify on mobile viewport that all modals render
  correctly as bottom sheets.
```

```
# T-165 | Extract inline styles to CSS classes (high-frequency patterns)

- **Phase:** 1
- **Priority:** P3
- **Category:** frontend
- **Effort:** M
- **Dependencies:** T-161
- **Description:** Audit and extract the top 10 most-repeated inline style patterns
  into CSS classes in index.css. Priority patterns:
  1. Section label style (uppercase, small font, muted color) - ~50 uses
  2. Card header flex layout - ~20 uses
  3. Table cell padding patterns - ~30 uses
  4. Detail row key-value pairs - ~25 uses
  5. Form field group layout - ~15 uses
  Target: reduce inline style count from 607 to under 350.
```

```
# T-166 | Add .dockerignore and fix package.json dependencies

- **Phase:** 1
- **Priority:** P3
- **Category:** infra
- **Effort:** S
- **Dependencies:** none
- **Description:** Create .dockerignore excluding node_modules, .git, docs,
  .claude, data/, tests/. Move concurrently from dependencies to
  devDependencies in package.json (it is only used for npm run demo).
  Verify docker-compose build still works after change.
```

```
# T-167 | Add loading states to data-fetching components

- **Phase:** 1
- **Priority:** P3
- **Category:** frontend
- **Effort:** S
- **Dependencies:** none
- **Description:** Add loading state (spinner or skeleton) to Dashboard,
  Consignments, Identity, and Permissions components. Use the same pattern
  as Payments.jsx (loading boolean from Promise.all). Prevent the flash of
  "No data" content on initial page load. Create a shared LoadingState
  component if warranted.
```

### Phase 2 Preparation

```
# T-168 | Split large frontend components into smaller files

- **Phase:** 2
- **Priority:** P2
- **Category:** frontend
- **Effort:** M
- **Dependencies:** T-161, T-164
- **Description:** Split oversized components:
  - TradeFinance.jsx (789 lines) -> LCTab.jsx, ContractsTab.jsx, TradeFinance.jsx
  - Consignments.jsx (505 lines) -> CreateConsignmentModal.jsx, UploadDocumentModal.jsx, ShareModal.jsx, Consignments.jsx
  - TradeNetworkPanel.jsx (823 lines) -> useTradeNetwork.js (data hook), MapLayers.jsx (SVG components), CountryDetailPanel.jsx, NodeDetailPanel.jsx
  - Identity.jsx (400 lines) -> VerificationModal.jsx, CredentialModal.jsx, OrgCard.jsx
  Each extracted file should be under 200 lines.
```

```
# T-169 | Remove or formalize Vercel deployment support

- **Phase:** 2
- **Priority:** P3
- **Category:** infra
- **Effort:** S
- **Dependencies:** none
- **Description:** Decide whether Vercel deployment is supported. If yes, add
  vercel.json and document the limitations (no WebSocket, polling only).
  If no, remove IS_VERCEL checks and the default export from server/index.js
  (~10 lines of code). Document the decision in an ADR.
```

---

## 6. Priority Matrix

| Priority | Task | Impact | Effort | Blocks Phase 2? |
|----------|------|--------|--------|-----------------|
| P0 | T-160 Server modularization | HIGH | L | Yes (T-205) |
| P0 | T-162 Add Vitest + API tests | HIGH | M | Yes (T-221) |
| P1 | T-161 Shared frontend utilities | MEDIUM | S | No |
| P2 | T-163 Error handling | MEDIUM | S | No |
| P2 | T-164 Modal standardization | MEDIUM | S | No |
| P2 | T-168 Component splitting | MEDIUM | M | No |
| P3 | T-165 Inline style extraction | MEDIUM | M | No |
| P3 | T-166 Docker/package fixes | LOW | S | No |
| P3 | T-167 Loading states | LOW | S | No |
| P3 | T-169 Vercel cleanup | LOW | S | No |

**Critical path for Phase 2:** T-160 (server refactor) --> T-162 (tests) --> T-205 (adapter scaffold)

---

## 7. Metrics Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Server lines (index.js) | 1,054 | Too large for single file |
| Frontend components | 12 files | Appropriate count |
| Largest component | TradeNetworkPanel.jsx (823 lines) | Should be split |
| CSS file | 493 lines (single file) | Manageable but monolithic |
| Inline styles | 607 occurrences | Excessive |
| Duplicated utilities | 5 functions in 4 files | Should extract |
| Silent error catches | 22 occurrences in 9 files | Should fix |
| Test files | 0 | Critical gap |
| API endpoints | 27 routes | Well-organized |
| Config schema completeness | 10/10 required sections | Excellent |
| Mobile breakpoints | 4 tiers | Comprehensive |
| CSS custom properties | 22 variables | Good theming foundation |

---

## 8. Recommendations for Phase 2 Readiness

1. **Do T-160 first.** The server modularization is the single most impactful improvement and the prerequisite for the adapter layer. Estimated effort: 1-2 days.

2. **Do T-162 second.** The test infrastructure must exist before the adapter layer can have parity tests. Estimated effort: 1-2 days.

3. **T-161 and T-163 can be done in parallel** by a different developer or agent. These improve code quality but do not block Phase 2.

4. **Defer T-165, T-167, T-168, T-169** until after Phase 2 core tasks are underway. They are quality improvements, not blockers.

5. **Do not attempt TypeScript migration.** The effort-to-benefit ratio is too low for a demo platform.

---

*Report generated by Solution Architect Agent. All findings are based on direct code review of files in the repository, not speculation.*
