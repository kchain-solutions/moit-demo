# TWIN Vietnam Demo: Task Board

> This file is the index. Tasks are organized in `.claude/tasks/{status}/{id}.md`.
> Status folders: `backlog/`, `in-progress/`, `done/`, `blocked/`, `cancelled/`.
> Agents move task files between folders to change status. Regenerate with `node scripts/regen-board.cjs`.

## Quick Summary

| Phase | Total | Backlog | In Progress | Blocked | Done |
|-------|-------|---------|-------------|---------|------|
| 1     | 62    | 0      | 0           | 0       | 62    |
| 2     | 36    | 27      | 0           | 0       | 0    |
| 3     | 15    | 15      | 0           | 0       | 0    |
| 4     | 10    | 10      | 0           | 0       | 0    |
| **Total** | **123** | **52** | **0** | **0** | **62** |

---

## Phase 1: Configuration System + Mobile Optimization

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-101](tasks/done/T-101.md) | Create JSON Schema for demo config | P0 | Done | none |
| [T-103](tasks/done/T-103.md) | Create configs directory and branding assets | P0 | Done | none |
| [T-104](tasks/done/T-104.md) | Implement server/config.js config loader | P0 | Done | T-102 |
| [T-105](tasks/done/T-105.md) | Refactor server orgs to read from config | P0 | Done | T-104 |
| [T-106](tasks/done/T-106.md) | Refactor server consignments and documents to read from config | P0 | Done | T-104 |
| [T-107](tasks/done/T-107.md) | Refactor credential validation to read from config | P1 | Done | T-104 |
| [T-108](tasks/done/T-108.md) | Refactor finance seed data to read from config | P1 | Done | T-104 |
| [T-110](tasks/done/T-110.md) | Add or refactor GET /api/orgs endpoint | P0 | Done | T-105 |
| [T-111](tasks/done/T-111.md) | Create ConfigContext and ConfigProvider | P0 | Done | T-109 |
| [T-112](tasks/done/T-112.md) | Add getConfig() and getOrgs() to api.js | P0 | Done | T-109, T-110 |
| [T-113](tasks/done/T-113.md) | Wrap App with ConfigProvider | P0 | Done | T-111 |
| [T-114](tasks/done/T-114.md) | Refactor Login.jsx to use config-driven orgs | P0 | Done | T-111, T-112 |
| [T-115](tasks/done/T-115.md) | Implement adaptive login credential list layout | P2 | done | T-114 |
| [T-116](tasks/done/T-116.md) | Refactor App.jsx sidebar branding to use config | P0 | Done | T-111 |
| [T-117](tasks/done/T-117.md) | Refactor countries.js to accept config overrides | P1 | Done | T-111 |
| [T-118](tasks/done/T-118.md) | Expand CSS custom properties for corridor theming | P0 | Done | none |
| [T-119](tasks/done/T-119.md) | Implement runtime theme application from config | P0 | Done | T-118, T-111 |
| [T-120](tasks/done/T-120.md) | Replace hardcoded hex colors in components | P1 | Done | T-118 |
| [T-121](tasks/done/T-121.md) | Extract Dashboard.jsx inline grid to CSS class | P0 | Done | none |
| [T-122](tasks/done/T-122.md) | Extract TradeFinance.jsx inline styles to CSS classes | P0 | Done | none |
| [T-123](tasks/done/T-123.md) | Extract Payments.jsx inline styles to CSS classes | P0 | Done | none |
| [T-124](tasks/done/T-124.md) | Extract TangleExplorer.jsx inline grid to CSS class | P0 | Done | none |
| [T-125](tasks/done/T-125.md) | Add base responsive breakpoint media queries | P0 | Done | T-121, T-122, T-123, T-124 |
| [T-126](tasks/done/T-126.md) | Implement sidebar drawer for tablet | P0 | Done | T-125 |
| [T-127](tasks/done/T-127.md) | Add hamburger menu button to header | P0 | Done | T-126 |
| [T-128](tasks/done/T-128.md) | Implement mobile header adaptation | P0 | Done | T-127 |
| [T-129](tasks/done/T-129.md) | Implement bottom tab bar for phones | P2 | Done | T-126 |
| [T-130](tasks/done/T-130.md) | Dashboard mobile: stat cards and grid | P1 | Done | T-121, T-125 |
| [T-131](tasks/done/T-131.md) | Dashboard mobile: consignment table to card list | P1 | Done | T-130 |
| [T-132](tasks/done/T-132.md) | Consignments page: table-to-card conversion | P1 | Done | T-125 |
| [T-133](tasks/done/T-133.md) | Payments page: responsive grid and table-to-card | P1 | Done | T-123, T-125 |
| [T-134](tasks/done/T-134.md) | Network page: map height and responsive grids | P2 | Done | T-125 |
| [T-135](tasks/done/T-135.md) | Network page: country detail as bottom sheet | P2 | Done | T-134 |
| [T-136](tasks/done/T-136.md) | TradeFinance: stepper vertical conversion | P2 | Done | T-122, T-125 |
| [T-137](tasks/done/T-137.md) | Identity page: responsive grids and peer table cards | P2 | Done | T-125 |
| [T-138](tasks/done/T-138.md) | TangleExplorer: filter grid responsive | P2 | Done | T-124, T-125 |
| [T-139](tasks/done/T-139.md) | Permissions page: matrix to card list | P2 | Done | T-125 |
| [T-140](tasks/done/T-140.md) | Wrap hover states in @media (hover: hover) | P3 | Done | T-125 |
| [T-141](tasks/done/T-141.md) | Increase touch targets to WCAG 2.1 AA (44x44px) | P1 | Done | T-125 |
| [T-142](tasks/done/T-142.md) | Convert modals to bottom sheets on mobile | P1 | Done | T-125 |
| [T-145](tasks/done/T-145.md) | End-to-end testing: config system | P0 | done | T-143, T-144 |
| [T-146](tasks/done/T-146.md) | End-to-end testing: mobile responsiveness | P0 | Done | T-128, T-129, T-131, T-132 |
| [T-147](tasks/done/T-147.md) | Update Docker Compose for CONFIG_FILE env var | P1 | done | T-104 |
| [T-148](tasks/done/T-148.md) | Fix duplicate fontSize key in Payments.jsx | P2 | done | none |
| [T-149](tasks/done/T-149.md) | Reduce Vite bundle size below 500 kB warning | P2 | done | none |
| [T-150](tasks/done/T-150.md) | Rename all "tangle" references to "IOTA Mainnet" / "ledger" | P1 | done | none |
| [T-151](tasks/done/T-151.md) | Make demo corridor-agnostic and update all documentation | P1 | done | T-150 |
| [T-1V01](tasks/done/T-1V01.md) | Add Vietnam government actor types to config schema | P1 | done | none |
| [T-1V02](tasks/done/T-1V02.md) | Add document type registry to config schema | P2 | done | none |
| [T-1V04](tasks/done/T-1V04.md) | Create vietnam-eu.json corridor config | P2 | done | T-1V03, T-143 |
| [T-1V05](tasks/done/T-1V05.md) | Add regulatory metadata to config schema | P2 | done | T-1V03 |

### 1A. Configuration Schema and Infrastructure

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-102](tasks/done/T-102.md) | Extract Vietnam corridor data into config JSON | P0 | Done | T-101 |
| [T-1V03](tasks/done/T-1V03.md) | Add origin composition fields to config schema | P0 | done | none |
| [T-1V06](tasks/done/T-1V06.md) | Add two-channel architecture indicator to config | P3 | done | none |

### 1B. Server-Side Config Integration

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-109](tasks/done/T-109.md) | Add GET /api/config endpoint | P0 | Done | T-104 |

### 1I. Validation and Cleanup

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-143](tasks/done/T-143.md) | Create Cambodia-EU corridor config for validation | P1 | done | T-101, T-116, T-114 |
| [T-144](tasks/done/T-144.md) | Remove hardcoded fallback arrays from server | P1 | Done | T-143 |

### 1J. Code Quality and Refactoring

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-160](tasks/done/T-160.md) | Extract server/index.js into modular route files | P0 | done | none |
| [T-161](tasks/done/T-161.md) | Extract shared frontend utilities and components | P1 | done | none |
| [T-162](tasks/done/T-162.md) | Add Vitest and baseline server API tests | P0 | done | T-160 |
| [T-164](tasks/done/T-164.md) | Standardize modal patterns across all components | P2 | done | T-161 |

### 1H. Touch and Accessibility

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-1V07](tasks/done/T-1V07.md) | Support Vietnamese diacritics in config and UI | P1 | done | none |

---

## Phase 2: API Adapter Layer + Real Node Integration

### 2A. Infrastructure and Node Setup

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-201](tasks/cancelled/T-201.md) | Request TWIN Node staging/testnet access | P0 | cancelled | none (can start during Phase 1) |
| [T-202](tasks/cancelled/T-202.md) | Deploy TWIN Node Alpha on testnet | P0 | cancelled | T-201 |
| [T-224](tasks/cancelled/T-224.md) | Configure Gas Station for testnet transactions | P1 | cancelled | T-202, T-203 |
| [T-225](tasks/cancelled/T-225.md) | Evaluate multi-tenant TWIN Node for dev/test | P3 | cancelled | T-163 |

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-203](tasks/cancelled/T-203.md) | Deploy TWIN Node Beta on testnet | P0 | cancelled | T-201 |
| [T-204](tasks/cancelled/T-204.md) | Fund testnet wallets via IOTA faucet | P0 | cancelled | T-202, T-203 |
| [T-206](tasks/cancelled/T-206.md) | Implement TWIN Node REST client wrapper | P0 | cancelled | T-202 |
| [T-207](tasks/cancelled/T-207.md) | Implement adapter session/JWT middleware | P0 | cancelled | T-206 |
| [T-208](tasks/cancelled/T-208.md) | Implement adapter error translation middleware | P1 | cancelled | T-205 |
| [T-212](tasks/backlog/T-212.md) | Implement adapter org routes | P1 | backlog | T-211 |
| [T-213](tasks/backlog/T-213.md) | Verify DID resolvability on IOTA Explorer | P0 | backlog | T-211 |
| [T-216](tasks/backlog/T-216.md) | Verify notarization on-chain hash matching | P0 | backlog | T-215 |
| [T-217](tasks/backlog/T-217.md) | Implement adapter consignment routes | P1 | backlog | T-206, T-210 |
| [T-218](tasks/backlog/T-218.md) | Implement adapter permission routes | P2 | backlog | T-205 |
| [T-219](tasks/backlog/T-219.md) | Implement adapter finance routes | P2 | backlog | T-205 |
| [T-220](tasks/backlog/T-220.md) | Implement hybrid Tangle log (real + simulated) | P1 | backlog | T-214 |
| [T-2V04](tasks/backlog/T-2V04.md) | Implement Vietnam-specific ISN signal types | P1 | backlog | T-205, T-214 |
| [T-2V05](tasks/backlog/T-2V05.md) | Add UFLPA attestation field to consignment model | P2 | backlog | T-1V03, T-205 |
| [T-2V06](tasks/backlog/T-2V06.md) | Test cross-border data flow: Alpha to Beta | P1 | backlog | T-215, T-1V07 |

### 2B. Adapter Layer Scaffolding

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-205](tasks/backlog/T-205.md) | Create ITwinAdapter interface and InProcessAdapter | P0 | backlog | T-227, T-228 |
| [T-209](tasks/backlog/T-209.md) | Implement ADAPTER_MODE env var toggle | P0 | backlog | T-205 |

### 2C. Real DID and Identity Integration

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-210](tasks/backlog/T-210.md) | Implement adapter auth routes | P0 | backlog | T-209 |
| [T-211](tasks/backlog/T-211.md) | Implement adapter identity routes (real DID) | P0 | backlog | T-209, T-210 |

### 2D. Real Notarization Integration

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-214](tasks/backlog/T-214.md) | Implement adapter notarization routes | P0 | backlog | T-209, T-210 |
| [T-215](tasks/backlog/T-215.md) | Implement adapter document routes with real notarization | P0 | backlog | T-214 |

### 2F. Remaining Adapter Routes and Testing

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-221](tasks/backlog/T-221.md) | Adapter test: simulated mode parity | P0 | backlog | T-210, T-212, T-214, T-217, T-218, T-219 |
| [T-222](tasks/backlog/T-222.md) | Adapter test: in-process mode end-to-end | P0 | backlog | T-221 |
| [T-223](tasks/backlog/T-223.md) | Frontend real/simulated status indicators | P1 | backlog | T-211, T-215 |

### 2A. TWIN Connector Setup

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-226](tasks/backlog/T-226.md) | Add TypeScript build pipeline for server/twin/ | P0 | backlog | none |
| [T-227](tasks/backlog/T-227.md) | Adapt setupTwinConnectors from twin-etd-poc | P0 | backlog | T-226 |
| [T-228](tasks/backlog/T-228.md) | Adapt notarization helper from twin-etd-poc | P0 | backlog | T-226, T-229 |
| [T-229](tasks/backlog/T-229.md) | WASM compatibility validation | P0 | backlog | T-226 |

### 2E. Vietnam-Specific Integrations

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-2V01](tasks/backlog/T-2V01.md) | Design eCoSys integration adapter stub | P1 | backlog | T-205 |
| [T-2V02](tasks/backlog/T-2V02.md) | Design VNACCS integration adapter stub | P1 | backlog | T-205 |
| [T-2V03](tasks/backlog/T-2V03.md) | Implement origin composition calculator | P0 | backlog | T-1V03, T-205 |
| [T-2V07](tasks/backlog/T-2V07.md) | Design ODRL policy templates for Vietnam corridor | P1 | backlog | T-205 |

---

## Phase 3: Full Real Node Integration

### 3. Full TWIN Node Integration

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-163](tasks/backlog/T-163.md) | Set up two local TWIN Nodes via tutorials.101 Docker | P1 | backlog | T-222 |

### 2F. Remaining Adapter Routes and Testing

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-301](tasks/backlog/T-301.md) | Research and document DSC protocol configuration | P0 | backlog | T-222 |
| [T-302](tasks/backlog/T-302.md) | Implement DSC-based cross-border data exchange | P0 | backlog | T-301 |
| [T-305](tasks/backlog/T-305.md) | Migrate consignment model to UNECE D23B | P1 | backlog | T-217 |
| [T-309](tasks/backlog/T-309.md) | Design TWIN Adaptor deployment model for government systems | P1 | backlog | T-301, T-2V01, T-2V02 |
| [T-310](tasks/backlog/T-310.md) | Implement W3C Activity Streams data plane | P1 | backlog | T-302 |
| [T-3V01](tasks/backlog/T-3V01.md) | Formalize IOriginComposition as TWIN model extension | P0 | backlog | T-305, T-2V03 |
| [T-3V02](tasks/backlog/T-3V02.md) | Implement data sovereignty enforcement mode | P1 | backlog | T-302, T-304 |
| [T-3V04](tasks/backlog/T-3V04.md) | NDATrace integration assessment | P2 | backlog | T9 output |

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-303](tasks/backlog/T-303.md) | Integrate Auditable Item Graph for Tangle log | P1 | backlog | T-222 |
| [T-304](tasks/backlog/T-304.md) | Implement real ODRL policy enforcement | P1 | backlog | T-301 |
| [T-306](tasks/backlog/T-306.md) | Implement federated catalogue for org discovery | P2 | backlog | T-302 |
| [T-307](tasks/backlog/T-307.md) | Add ISN signal notification stubs | P3 | backlog | T-302 |
| [T-308](tasks/backlog/T-308.md) | Phase 3 end-to-end testing | P0 | backlog | T-302, T-303, T-304 |
| [T-3V03](tasks/backlog/T-3V03.md) | Implement multi-destination ISN subscriber config | P1 | backlog | T-302, T-2V04 |

---

## Phase 4: Production Readiness

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-401](tasks/backlog/T-401.md) | Replace demo credentials with proper auth | P0 | backlog | T-308 |
| [T-403](tasks/backlog/T-403.md) | Migrate document storage to cloud blob storage | P1 | backlog | T-402 |
| [T-404](tasks/backlog/T-404.md) | Implement key management with Vault or KMS | P0 | backlog | T-401 |
| [T-405](tasks/backlog/T-405.md) | Add health checks and structured logging | P1 | backlog | T-402 |
| [T-406](tasks/backlog/T-406.md) | Create Kubernetes manifests and production Docker Compose | P1 | backlog | T-405 |
| [T-407](tasks/backlog/T-407.md) | Security audit and hardening | P0 | backlog | T-401, T-402 |
| [T-408](tasks/backlog/T-408.md) | Write operator deployment guide | P1 | backlog | T-406 |
| [T-4V02](tasks/backlog/T-4V02.md) | Vietnamese government SSO integration | P2 | backlog | T-401, T9 output |

### 2F. Remaining Adapter Routes and Testing

| ID | Title | Priority | Status | Dependencies |
|----|-------|----------|--------|--------------|
| [T-402](tasks/backlog/T-402.md) | Implement PostgreSQL persistence layer | P0 | backlog | T-308 |
| [T-4V01](tasks/backlog/T-4V01.md) | Vietnam-hosted deployment option | P1 | backlog | T8 output, T-3V02 |

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
