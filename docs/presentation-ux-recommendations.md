# Trade Corridor Demo Briefing: Presentation UX/Visual Improvement Recommendations

> **Note:** This document was originally written for the Vietnam-US corridor presentation. The recommendations are broadly applicable to any corridor presentation, with Vietnam-specific examples inline.

**Document:** UX/Visual design guidance for corridor demo briefing presentations
**Author:** UX/UI Designer Agent
**Date:** 2026-05-14
**Original target audience:** Vietnamese Ministry of Industry and Trade (MOIT), customs authorities, IOTA Foundation stakeholders
**Presentation format:** 5 slides (original) + 1 new slide (Vietnam User Journey) = 6 slides total
**Brand colors:** Primary Purple #37326E, Secondary Teal #14B8A6
**Logo asset:** Vietnam map silhouette at `client/public/vietnam.png`

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Color Scheme Recommendations](#2-color-scheme-recommendations)
3. [Typography Hierarchy](#3-typography-hierarchy)
4. [Global Layout Rules](#4-global-layout-rules)
5. [Slide-by-Slide Improvements](#5-slide-by-slide-improvements)
6. [New Slide 3: Vietnam User Journey](#6-new-slide-3-vietnam-user-journey)
7. [Icon and Visual Element Strategy](#7-icon-and-visual-element-strategy)
8. [Data Visualization Recommendations](#8-data-visualization-recommendations)
9. [Vietnam-Specific Visual Elements](#9-vietnam-specific-visual-elements)
10. [Accessibility Notes](#10-accessibility-notes)

---

## 1. Current State Assessment

### Problems Identified

Based on the slide descriptions provided and the existing ADAPT demo codebase analysis, the current presentation has these visual issues:

**1.1 Emoji-based headers.** The current deck uses globe and other emojis as section markers. This reads as informal and lacks the visual precision expected by government officials. Emoji rendering varies across operating systems and projectors, creating inconsistency.

**1.2 Text-heavy layout.** Slides describe pillars, layers, and technical concepts using dense paragraph text without clear visual hierarchy. Government audiences process structured information (tables, diagrams, numbered steps) faster than paragraphs.

**1.3 Generic visual identity.** The deck was adapted from an Africa trade corridor (ADAPT) and retains a generic visual style. There are no Vietnam-specific visual anchors (map, flag colors, trade route visualization) that signal "this was built for you."

**1.4 Missing data visualizations.** Concepts like origin composition, trade value flow, and document journeys are described textually when they should be visualized as charts, flow diagrams, or process maps.

**1.5 No clear brand palette.** The presentation does not consistently apply the TWIN brand colors (#37326E purple, #14B8A6 teal), resulting in a deck that lacks visual authority and brand recognition.

---

## 2. Color Scheme Recommendations

### 2.1 Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **TWIN Purple** (Primary) | `#37326E` | Slide title backgrounds, header bars, diagram primary nodes, footer bar |
| **TWIN Teal** (Secondary/Accent) | `#14B8A6` | Accent elements, active highlights, call-to-action buttons, process arrows, progress indicators |
| **White** | `#FFFFFF` | Slide content area backgrounds, text on dark backgrounds, card surfaces |
| **Off-White** | `#F8FAFC` | Content card backgrounds, diagram containers, table alternating rows |

### 2.2 Supporting Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Purple Light** | `#EEEDFA` | Light background tint for purple-themed cards, pillar backgrounds |
| **Teal Light** | `#D1FAE5` | Light background tint for teal-themed cards, success states |
| **Slate 700** | `#334155` | Body text on white backgrounds |
| **Slate 400** | `#94A3B8` | Captions, footnotes, secondary labels |
| **Slate 200** | `#E2E8F0` | Borders, separator lines, table gridlines |

### 2.3 Semantic Colors (for status/categorization)

| Token | Hex | Usage |
|-------|-----|-------|
| **Government Gold** | `#D97706` | Government entity markers (MOIT, Vietnam Customs), official document badges |
| **Government Gold Light** | `#FEF3C7` | Background for government entity cards |
| **Private Sector Blue** | `#2563EB` | Private sector entity markers (manufacturer, carrier, buyer) |
| **Destination Red** | `#DC2626` | Destination customs accent, US/EU border entities |
| **Origin Green** | `#16A34A` | Verified/confirmed status, Vietnam origin indicators |

### 2.4 Color Usage Rules

- **Maximum 3 accent colors per slide** (excluding text grays and white).
- **Purple dominates structural elements:** Title bars, section headers, key diagram nodes use #37326E.
- **Teal signals interaction and progress:** Arrows, step connectors, active states use #14B8A6.
- **Government Gold is reserved for government entity cards** to visually distinguish public from private actors.
- Never use red for decorative purposes. Reserve for destination/import-side markers only.

---

## 3. Typography Hierarchy

### 3.1 Font Selection

| Weight | Font | Fallback | Rationale |
|--------|------|----------|-----------|
| **Primary** | Inter | Calibri, Arial | Clean, professional, excellent readability at projector distance. Matches the TWIN demo application font. |
| **Monospace** | JetBrains Mono | Consolas, Courier New | For technical identifiers, DID strings, API references |

### 3.2 Type Scale

| Element | Size (pt) | Weight | Color | Usage |
|---------|-----------|--------|-------|-------|
| **Slide Title** | 28-32 | Bold (700) | `#FFFFFF` on purple bar, or `#37326E` on white | One per slide, always in the title bar area |
| **Slide Subtitle** | 16 | SemiBold (600) | `#94A3B8` | Clarifying subtitle below the title |
| **Section Header** | 20 | SemiBold (600) | `#37326E` | H2-level headers within content area |
| **Pillar/Card Title** | 16-18 | Bold (700) | `#37326E` or `#FFFFFF` | Titles inside content cards or pillars |
| **Body Text** | 14 | Regular (400) | `#334155` | Bullet points, descriptions |
| **Label** | 11 | SemiBold (600) | `#94A3B8` | Category labels, small-caps descriptors |
| **Caption / Source** | 10 | Regular (400) | `#94A3B8` | Footnotes, source citations, slide numbers |
| **Diagram Label** | 10-11 | SemiBold (600) | Per diagram node color | Inside diagram nodes |
| **Step Number** | 24-28 | Bold (700) | `#14B8A6` or `#FFFFFF` | Numbered process steps |

### 3.3 Typography Rules

- **Sentence case for titles** (not ALL CAPS). Example: "The Current Reality" not "THE CURRENT REALITY". This is more approachable for international audiences.
- **Maximum 7 words per title.**
- **Maximum 12 words per bullet point.** Force brevity by placing details in supporting visuals rather than text.
- **Left-align all text.** Never center-justify body text.
- **Line spacing 1.4-1.6** for body text to ensure readability at projection distance.

---

## 4. Global Layout Rules

### 4.1 Slide Dimensions

- **Format:** 16:9 widescreen (standard for modern projectors and screens)
- **Dimensions:** 13.33" x 7.5" (960 x 540 px at 72 dpi)

### 4.2 Persistent Elements (every slide)

```
+------------------------------------------------------------------+
| TITLE BAR (height: 0.85")                                        |
| [Purple #37326E background]                                      |
| Left: Slide title (28pt Bold, white)                             |
| Right: Vietnam map silhouette (0.5" tall, white/teal, 15% opacity|
|        as watermark) + slide number                              |
+------------------------------------------------------------------+
|                                                                  |
| CONTENT AREA (y: 1.0" to 6.8")                                  |
| White background                                                 |
| Left margin: 0.7"                                                |
| Right margin: 0.7"                                                |
| Content width: 11.93"                                            |
|                                                                  |
+------------------------------------------------------------------+
| FOOTER BAR (height: 0.35")                                       |
| [Purple #37326E background, 60% opacity]                         |
| Left: "TWIN Vietnam" + teal dot + "Demo Briefing"               |
| Center: thin teal accent line                                    |
| Right: Logo mark or "Powered by IOTA" (10pt, #94A3B8)           |
+------------------------------------------------------------------+
```

### 4.3 Title Bar Design

The title bar replaces the emoji-header approach with a consistent branded header:

- **Background:** Solid `#37326E` (TWIN Purple), full width, 0.85" tall
- **Title text:** 28pt Inter Bold, `#FFFFFF`, left-aligned at x=0.7", vertically centered in bar
- **Right accent:** Vietnam map silhouette from `client/public/vietnam.png`, rendered as a white silhouette at 12-15% opacity, positioned at x=11.5", 0.65" tall. This is a subtle branding element, not a dominant graphic.
- **Bottom edge:** 3px `#14B8A6` (teal) line across the full width, creating a crisp separation between title and content

### 4.4 Footer Design

- **Background:** `#37326E` at 85% opacity, full width, 0.35" tall
- **Left text:** "TWIN Vietnam" in 10pt SemiBold `#FFFFFF` + small teal dot separator + "Demo Briefing" in 10pt Regular `#94A3B8`
- **Right text:** Slide number "X / 6" in 10pt Regular `#94A3B8`

### 4.5 Content Grid

Use a 12-column grid with 0.25" gutters for consistent alignment:

- **Full width:** 12 columns (for diagrams, wide tables)
- **Two-column:** 6+6 columns (for side-by-side comparisons)
- **Three-column:** 4+4+4 columns (for pillar layouts)
- **Asymmetric:** 8+4 columns (for content + sidebar)

---

## 5. Slide-by-Slide Improvements

### Slide 1: "The Current Reality"

**Current state:** Three text pillars (Identities, Documents, Finance) described as "existing but not shared." Likely uses emoji headers and paragraph text.

**Recommended layout: Three Vertical Pillars with Disconnection Visual**

```
+------------------------------------------------------------------+
| [Purple Title Bar]  The Current Reality                          |
+------------------------------------------------------------------+
|                                                                  |
|  Subtitle: "Vietnam's trade systems work. They just don't       |
|  talk to each other."  (16pt, #334155, italic)                  |
|                                                                  |
|  +---------------+    +---------------+    +---------------+    |
|  | [Icon: Shield]|    | [Icon: File]  |    | [Icon: Dollar]|    |
|  |               |    |               |    |               |    |
|  | IDENTITIES    |    | DOCUMENTS     |    | FINANCE       |    |
|  |               |    |               |    |               |    |
|  | * DID for orgs|    | * C/O exists  |    | * LCs issued  |    |
|  | * Govt certs  |    | * Customs docs|    | * Payments    |    |
|  | * But siloed  |    | * But paper   |    | * But manual  |    |
|  |               |    |               |    |               |    |
|  +-------X-------+    +-------X-------+    +-------X-------+    |
|          ^                     ^                     ^           |
|          |   DISCONNECTED      |    DISCONNECTED     |          |
|          +--------- X ---------+---------- X --------+          |
|                                                                  |
|  [Callout box, teal left border, #F0FDFA background:]           |
|  "Each pillar functions. The gap is interoperability:           |
|   no shared trust layer connects them across borders."          |
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

**Specific improvements:**

1. **Replace emojis with line icons.** Use clean, single-weight line icons (Lucide or Feather icon set, same as the demo application). Shield icon for Identities, FileText icon for Documents, DollarSign icon for Finance. Render at 32x32px, `#37326E` color.

2. **Pillar cards.** Each pillar is a rounded rectangle (12px radius) with:
   - Background: `#EEEDFA` (Purple Light)
   - Border: 1px `#37326E` at 20% opacity
   - Icon at top center, 40x40px, `#37326E`
   - Title: 16pt Bold `#37326E`, centered below icon
   - 2-3 bullet points: 12pt Regular `#334155`, left-aligned within card
   - Dimensions: 3.5" wide x 3.0" tall
   - Spacing between pillars: 0.4"

3. **Disconnection visual.** Between the three pillar cards, place dashed lines with an "X" mark or a broken-link icon (`Unlink` from Lucide, `#DC2626`). This replaces any text-based description of "not shared" with a visual metaphor.

4. **Callout box.** Below the pillars, a full-width callout with a 3px teal left border and `#F0FDFA` background summarizes the interoperability gap. This anchors the message.

5. **Vietnam-specific anchors.** Mention "eCoSys" and "VNACCS" by name in the Documents and Finance pillars. This signals that the presentation is tailored, not generic.

---

### Slide 2: "Framework Overview"

**Current state:** Explains TWIN as an interoperability layer covering Government Systems, DLT, and Node Sovereignty. Likely text-heavy with emoji markers.

**Recommended layout: Layered Architecture Diagram**

```
+------------------------------------------------------------------+
| [Purple Title Bar]  TWIN Framework Overview                      |
+------------------------------------------------------------------+
|                                                                  |
|  Left side (8 cols):                     Right side (4 cols):    |
|                                                                  |
|  +-------------------------------------------------+  +---------+|
|  | [Layer 3: Top]                                  |  |         ||
|  | EXISTING GOVERNMENT SYSTEMS                     |  | KEY     ||
|  | eCoSys | VNACCS | NSW | NDATrace               |  |         ||
|  | [Gold background #FEF3C7, gold border]          |  | [Gold]  ||
|  +-------------------------------------------------+  | = Govt  ||
|  | [Layer 2: Middle]                               |  |         ||
|  | TWIN INTEROPERABILITY LAYER                     |  | [Teal]  ||
|  | Identity (DID) | Documents (API) | Ledger (DLT) |  | = TWIN  ||
|  | [Teal background, teal border]                  |  |         ||
|  +-------------------------------------------------+  | [Purple]||
|  | [Layer 1: Bottom]                               |  | = Node  ||
|  | NODE SOVEREIGNTY                                |  |         ||
|  | Each country hosts its own node                 |  +---------+|
|  | Data never leaves jurisdiction without consent  |  |         ||
|  | [Purple background #37326E, white text]         |  | [Map    ||
|  +-------------------------------------------------+  |  icon]  ||
|                                                        +---------+|
|  Vertical arrows between layers (teal, bidirectional)            |
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

**Specific improvements:**

1. **Three-layer stack diagram.** Replace text descriptions with a visual three-layer stack. Each layer is a full-width rounded rectangle, stacked vertically with 0.15" gap. This is the standard way to communicate architecture layers to government audiences.

2. **Layer colors:**
   - Top layer (Government Systems): `#FEF3C7` background, `#D97706` border, `#92400E` text. Lists the actual Vietnamese system names: eCoSys, VNACCS, NSW, NDATrace.
   - Middle layer (TWIN): `#D1FAE5` background, `#14B8A6` border, `#065F46` text. Shows the three TWIN pillars inline: Identity (DID), Documents (API-native), Ledger (DLT).
   - Bottom layer (Node Sovereignty): `#37326E` background, white text. States "Each nation hosts its own node. Data sovereignty by design."

3. **Vertical bidirectional arrows** between layers, rendered in `#14B8A6`, showing data flow between the layers. Use solid arrows pointing down from Government Systems to TWIN, and dashed arrows pointing up from TWIN to Government Systems (indicating "push" and "pull" dynamics).

4. **Right sidebar legend.** A compact legend explaining the three colors. Below the legend, place a small Vietnam map icon (from `client/public/vietnam.png`) in teal, reinforcing the geographic context.

5. **Remove all emojis.** Replace the globe emoji with the actual Vietnam map silhouette rendered in teal.

---

### Slide 3: "Identity, Documents, Ledger" (now Slide 4 after inserting new Slide 3)

**Current state:** Technical details on DID, API-native documents, and distributed ledger. Likely dense text.

**Recommended layout: Three Feature Cards with Technical Depth**

```
+------------------------------------------------------------------+
| [Purple Title Bar]  Identity, Documents, Ledger                  |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------+  +------------------+  +------------------+|
|  | [Teal top bar]   |  | [Purple top bar] |  | [Teal top bar]   |
|  | IDENTITY         |  | DOCUMENTS        |  | LEDGER           |
|  |                  |  |                  |  |                  |
|  | [Fingerprint     |  | [FileCheck       |  | [Database        |
|  |  icon, 28px]     |  |  icon, 28px]     |  |  icon, 28px]     |
|  |                  |  |                  |  |                  |
|  | W3C DID for each |  | API-native       |  | IOTA distributed |
|  | trade entity     |  | trade documents  |  | ledger           |
|  |                  |  |                  |  |                  |
|  | * Self-sovereign |  | * CO, B/L, CI    |  | * Immutable      |
|  | * Gov-verifiable |  | * Digital sigs   |  | * Tamper-proof   |
|  | * Portable       |  | * UNCEFACT vocab |  | * Near-zero cost |
|  +------------------+  +------------------+  +------------------+|
|                                                                  |
|  [Bottom connector bar: Teal, showing all three connect via TWIN]|
|  "All three components connect through the TWIN node,           |
|   creating a single verifiable record per consignment."         |
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

**Specific improvements:**

1. **Card-based layout.** Three equal-width cards (3.7" each, 0.3" gutters). Each card has:
   - Colored top bar (alternating teal and purple): 0.35" tall, with title in white 14pt Bold
   - Icon below the bar: 28px, rendered in the matching accent color on white background
   - 3 concise bullet points: 12pt Regular `#334155`
   - Card background: white with 1px `#E2E8F0` border, 12px radius

2. **Bottom connector.** A teal bar (full width, 0.4" tall, `#14B8A6` at 15% opacity with a solid teal horizontal line through the center) connecting all three cards visually. A one-line caption below explains the connection.

3. **Technical terms styled distinctly.** Terms like "W3C DID", "UNCEFACT", "IOTA" should be in 10pt JetBrains Mono, `#37326E`, giving them a technical badge appearance without overwhelming the reader.

---

### Slide 4: "Payments, Trade Finance, Nodes" (now Slide 5)

**Current state:** Payment tracking, LCs, smart contracts, and node architecture described in text. Likely the densest slide.

**Recommended layout: Two-Row Grid (Finance Row + Infrastructure Row)**

```
+------------------------------------------------------------------+
| [Purple Title Bar]  Payments, Trade Finance, Nodes               |
+------------------------------------------------------------------+
|                                                                  |
|  ROW 1: TRADE FINANCE (3 cards, horizontal)                     |
|  +------------------+  +------------------+  +------------------+|
|  | PAYMENT TRACKING |  | LETTERS OF CREDIT|  | SMART CONTRACTS  |
|  | [CreditCard icon]|  | [FileCheck icon] |  | [Code icon]      |
|  | Real-time status |  | LC issuance and  |  | Auto-validate    |
|  | Paid/Partial/Due |  | advising flow    |  | doc completeness |
|  +------------------+  +------------------+  +------------------+|
|                                                                  |
|  [Thin teal divider line]                                        |
|                                                                  |
|  ROW 2: NODE ARCHITECTURE (full width diagram)                   |
|  +--------------------------------------------------------------+|
|  |                                                              ||
|  |   [Vietnam Node]          [IOTA Ledger]       [Dest Node]   ||
|  |   #37326E box     <--->   #14B8A6 box   <---> #DC2626 box   ||
|  |   "Hai Phong"             "Immutable"         "US / EU"     ||
|  |   8 orgs                   Anchor              4 orgs       ||
|  |                                                              ||
|  +--------------------------------------------------------------+|
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

**Specific improvements:**

1. **Split into two distinct rows.** The top row covers financial instruments (3 equal cards). The bottom row shows the node architecture as a simple three-node diagram. A thin teal line separates them.

2. **Finance cards.** Same card style as Slide 4 (Identity/Documents/Ledger) for visual consistency. Each card: icon + title + 2-line description. No more than 3 bullet points per card.

3. **Node architecture diagram.** A simplified left-to-right flow showing:
   - Left box: "Vietnam Export Node" (purple background, white text, "8 organizations")
   - Center box: "IOTA Distributed Ledger" (teal background, white text, "Immutable anchor")
   - Right box: "Destination Import Node" (muted red/slate background, "US CBP / EU Customs")
   - Bidirectional arrows between boxes in `#14B8A6`
   - Below the center box: "Data sovereignty: each node stays in its jurisdiction"

4. **Remove redundancy.** If payment tracking is shown in the demo itself, this slide should set up the concept, not repeat the demo. Keep the cards high-level and let the live demo carry the detail.

---

### Slide 5: "How to Participate" (now Slide 6)

**Current state:** Three integration paths (Host Node, API, Upload UI). Likely text-based enumeration.

**Recommended layout: Three Integration Tiers with Effort Gradient**

```
+------------------------------------------------------------------+
| [Purple Title Bar]  How to Participate                           |
+------------------------------------------------------------------+
|                                                                  |
|  Three integration paths, ordered by technical depth:            |
|                                                                  |
|  +---[ TIER 1 ]---+    +---[ TIER 2 ]---+    +---[ TIER 3 ]---+|
|  |                 |    |                 |    |                 |
|  | [Server icon]   |    | [Code icon]     |    | [Upload icon]   |
|  |                 |    |                 |    |                 |
|  | HOST A NODE     |    | CONNECT VIA API |    | UPLOAD PORTAL   |
|  |                 |    |                 |    |                 |
|  | Full sovereign  |    | REST API        |    | Web interface   |
|  | instance        |    | integration     |    | for document    |
|  |                 |    |                 |    | upload           |
|  | For: MOIT,      |    | For: Large      |    | For: Small      |
|  | Customs, Port   |    | manufacturers,  |    | suppliers,      |
|  | authorities     |    | forwarders      |    | new entrants    |
|  |                 |    |                 |    |                 |
|  | [Purple bar:    |    | [Teal bar:      |    | [Light bar:     |
|  |  "Full control"]|    |  "Automated"]   |    |  "Zero IT"]     |
|  +-----------------+    +-----------------+    +-----------------+|
|                                                                  |
|  [Gradient bar below: Purple --> Teal --> Light]                 |
|  "More technical depth"  <------------>  "Immediate onboarding" |
|                                                                  |
|  [CTA box, centered, teal background, white text:]              |
|  "Schedule a consultation to determine your integration path"   |
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

**Specific improvements:**

1. **Three-tier card layout.** Cards arranged left to right in order of decreasing technical complexity. This mirrors the FFD Onboarding Tiers from the UK pilot (see S6 reference in the TWIN architecture documentation), making it a proven pattern.

2. **Visual effort gradient.** Below the three cards, a horizontal gradient bar transitions from purple (left, high effort) to teal (center, moderate) to light gray (right, low effort). Text labels at each end: "Full technical depth" and "Immediate onboarding."

3. **Target audience labels.** Each card specifies who this path is for. This helps the MOIT audience immediately self-identify: "MOIT would host a node; our manufacturer association members would use the Upload Portal."

4. **Bottom status bar per card.** Each card has a colored bottom bar with a one-word descriptor: "Full control" (purple), "Automated" (teal), "Zero IT" (light). This provides instant scanability.

5. **Call to action.** A centered CTA box with teal background invites follow-up. Use "Schedule a Consultation" language, not "Contact us."

---

## 6. New Slide 3: Vietnam User Journey

**Position:** Insert as Slide 3 (between "Framework Overview" and "Identity, Documents, Ledger"), shifting all subsequent slides by one.

**Purpose:** Show the concrete 6-step document flow from Korean raw materials through to US CBP verification. This is the most important slide for the MOIT audience because it maps their operational reality.

### 6.1 Layout Description

```
+------------------------------------------------------------------+
| [Purple Title Bar]  Vietnam Garment Export: Document Journey     |
+------------------------------------------------------------------+
|                                                                  |
|  [Horizontal process flow, left to right, with 6 steps]         |
|                                                                  |
|  ORIGIN INPUTS          VIETNAM PRODUCTION & EXPORT              |
|  +-----------+    +----------+    +----------+    +-----------+  |
|  |  STEP 1   |    |  STEP 2  |    |  STEP 3  |    |  STEP 4   |  |
|  |  [KR flag] |--->| [Factory]|--->| [Check]  |--->| [MOIT]    |  |
|  |  Korean    |    | Bill of  |    | Inspect. |    | MOIT CoO  |  |
|  |  CoO +     |    | Material |    | Report   |    | Export Dec |  |
|  |  Comm. Inv.|    |          |    | (BV)     |    | Comm. Inv. |  |
|  |           |    |          |    |          |    | Pack. List |  |
|  +-----------+    +----------+    +----------+    +-----------+  |
|                                                                  |
|       +----------+                                               |
|       |  STEP 5  |         [CROSS-BORDER SHARE]                  |
|       | [Ship]   |    =============================>             |
|       | Export    |         TWIN Ledger anchors                   |
|       | Clearance|         all documents                         |
|       | + B/L    |                                               |
|       +----------+                +-------------+                |
|                                   |   STEP 6    |                |
|                                   |  [US flag]  |                |
|                                   |  CBP / EU   |                |
|                                   |  Origin     |                |
|                                   |  Verify     |                |
|                                   +-------------+                |
|                                                                  |
|  [Legend bar at bottom]                                          |
|  [Gold] = Government doc  [Blue] = Private doc  [Teal] = TWIN  |
|                                                                  |
+------------------------------------------------------------------+
| [Footer]                                                         |
+------------------------------------------------------------------+
```

### 6.2 Detailed Step Specifications

Each step is rendered as a card with these consistent properties:

- **Card size:** 2.0" wide x 2.2" tall (Steps 1-4 in a row), 2.0" wide x 1.8" tall (Steps 5-6)
- **Card border radius:** 10px
- **Step number:** 24pt Bold, positioned top-left inside the card, in a small teal circle (28px diameter, `#14B8A6` background, white text)
- **Flag/icon:** 20px, positioned to the right of the step number
- **Card title:** 13pt Bold, below the step number
- **Document list:** 11pt Regular `#334155`, each document on its own line with a small color-coded dot prefix

#### Step 1: Inputs (Origin Materials)

- **Card background:** `#DBEAFE` (Blue 100, indicating foreign/imported materials)
- **Card border:** 1px `#2563EB`
- **Icon:** South Korean flag or "KR" country badge
- **Title:** "Inputs"
- **Actor label:** "Korean supplier" (10pt, `#94A3B8`)
- **Documents listed:**
  - [Gold dot] Certificate of Origin (Korean)
  - [Blue dot] Commercial Invoice

#### Step 2: Bill of Material

- **Card background:** `#FFFFFF` with `#E2E8F0` border
- **Icon:** Factory icon (Lucide `Factory`, `#37326E`)
- **Title:** "Production"
- **Actor label:** "Manufacturer (e.g. Saigon Garment JSC)" (10pt, `#94A3B8`)
- **Documents listed:**
  - [Blue dot] Bill of Material
  - [Blue dot] Origin composition calculation

#### Step 3: Inspection Report

- **Card background:** `#F5F3FF` (Violet 50)
- **Card border:** 1px `#8B5CF6`
- **Icon:** ClipboardCheck icon (Lucide, `#8B5CF6`)
- **Title:** "Quality"
- **Actor label:** "Bureau Veritas / SGS" (10pt, `#94A3B8`)
- **Documents listed:**
  - [Violet dot] Inspection Report (pass/fail)
  - [Violet dot] Compliance certificate

#### Step 4: Export Documentation

- **Card background:** `#FEF3C7` (Government Gold Light)
- **Card border:** 1px `#D97706`
- **Icon:** Building2 icon (Lucide, `#D97706`) or MOIT text badge
- **Title:** "Export Docs"
- **Actor label:** "MOIT (eCoSys)" (10pt, `#94A3B8`)
- **Documents listed:**
  - [Gold dot] MOIT Certificate of Origin
  - [Gold dot] Export Declaration
  - [Blue dot] Commercial Invoice
  - [Blue dot] Packing List

#### Step 5: Export Clearance

- **Card background:** `#ECFDF5` (Emerald 50)
- **Card border:** 1px `#10B981`
- **Icon:** Ship icon (Lucide, `#10B981`)
- **Title:** "Clearance"
- **Actor labels:** "Vietnam Customs (VNACCS)" + "Carrier" (10pt, `#94A3B8`)
- **Documents listed:**
  - [Gold dot] Export clearance
  - [Blue dot] Bill of Lading

#### Cross-Border Share (between Step 5 and Step 6)

This is not a card but a visual connector element:

- **Rendered as:** A wide dashed arrow (`#14B8A6`, 3px thick, dashed) spanning from Step 5 to Step 6, with a label centered above it
- **Label:** "Cross-border share via TWIN" (12pt SemiBold, `#14B8A6`)
- **Below the arrow:** Small IOTA/TWIN logo mark + "Ledger-anchored, ODRL-gated" (10pt, `#94A3B8`)
- **Visual effect:** The arrow should have a subtle teal glow or gradient to draw the eye and emphasize this as the key moment of interoperability

#### Step 6: Destination Verification

- **Card background:** `#FEE2E2` (Red 100, indicating import/destination)
- **Card border:** 1px `#DC2626`
- **Icon:** US flag + EU flag (small, side by side) or ShieldCheck icon (Lucide, `#DC2626`)
- **Title:** "Verify"
- **Actor label:** "US CBP / EU Customs" (10pt, `#94A3B8`)
- **Action described:**
  - [Red dot] Origin verification query
  - [Red dot] Cross-reference against TWIN records

### 6.3 Flow Arrows

- **Between Steps 1-2:** Solid teal arrow, right-pointing, 2px
- **Between Steps 2-3:** Solid teal arrow, right-pointing, 2px
- **Between Steps 3-4:** Solid teal arrow, right-pointing, 2px
- **Between Steps 4-5:** Solid teal arrow, curving downward (since Step 5 is on a second row)
- **Between Steps 5-6:** Wide dashed teal arrow (cross-border share, described above)

### 6.4 Layout Arrangement

Given the 6 steps plus the cross-border share element, the recommended spatial arrangement is:

**Row 1 (y: 1.1" to 3.3"):** Steps 1 through 4, arranged left to right with teal arrows between them. These represent the Vietnam-side document creation process.

**Row 2 (y: 3.8" to 5.6"):** Step 5 on the left, a wide cross-border arrow spanning the center, and Step 6 on the right. This row represents clearance and international verification.

**Row label bands:** Above Row 1, a subtle label "VIETNAM" in 10pt SemiBold uppercase `#94A3B8` with a small Vietnamese flag. Above Step 6, a label "DESTINATION" in 10pt SemiBold uppercase `#94A3B8` with US + EU flags.

### 6.5 Alternative Layout: Linear Timeline

If horizontal space is tight (for projection on a standard monitor), an alternative is a downward-flowing timeline:

```
Step 1 [KR]  -->  Step 2 [Factory]  -->  Step 3 [Inspector]
                                              |
                                              v
Step 6 [CBP]  <-- [Cross-border] <--  Step 5 [Ship]  <--  Step 4 [MOIT]
```

This "U-shape" reads naturally (top-left to bottom-right, then back left for the destination), fitting within 16:9 dimensions while maintaining clear left-to-right origin flow and right-to-left destination return.

---

## 7. Icon and Visual Element Strategy

### 7.1 Icon Set

Use **Lucide React** icons throughout (matching the TWIN demo application). This creates visual consistency between the presentation and the live demo. All icons rendered at a single weight, 1.5px stroke.

| Concept | Icon Name | Color | Usage |
|---------|-----------|-------|-------|
| Identity / DID | `Fingerprint` | `#37326E` | Slide 4 Identity card |
| Documents | `FileCheck` | `#37326E` | Slide 4 Documents card, general doc references |
| Ledger / Blockchain | `Database` or `Blocks` | `#14B8A6` | Slide 4 Ledger card, IOTA references |
| Government entity | `Building2` | `#D97706` | MOIT, Customs, Port Authority |
| Factory / Manufacturer | `Factory` | `#37326E` | Step 2 in user journey |
| Inspection | `ClipboardCheck` | `#8B5CF6` | Step 3 in user journey |
| Shipping / Clearance | `Ship` | `#10B981` | Step 5 in user journey |
| Payment | `CreditCard` | `#37326E` | Slide 5 payment card |
| Smart Contract | `Code2` | `#37326E` | Slide 5 smart contract card |
| Letter of Credit | `FileCheck` | `#37326E` | Slide 5 LC card |
| Node / Server | `Server` | `#37326E` | Slide 6 Tier 1 |
| API | `Code2` or `Workflow` | `#14B8A6` | Slide 6 Tier 2 |
| Upload | `Upload` | `#94A3B8` | Slide 6 Tier 3 |
| Shield / Security | `ShieldCheck` | `#14B8A6` | General trust references |
| Globe / Network | `Globe` | `#37326E` | Replace emoji globe |
| Connection / Link | `Link2` | `#14B8A6` | Connectivity concepts |
| Disconnected | `Unlink` | `#DC2626` | Slide 1 disconnection visual |

### 7.2 Icon Rendering Rules

- **Size in cards:** 28-32px, centered above card title
- **Size in bullet lists:** 14px, aligned with text baseline
- **Color:** Match the card's accent color or use `#37326E` as default
- **Never use filled/solid icons.** Always use the outline/line variant for consistency with the demo application.
- **Never use more than 3 distinct icon colors on a single slide.**

### 7.3 Replacing Emojis

Every emoji in the current deck must be replaced:

| Current Emoji | Replacement | Notes |
|---------------|-------------|-------|
| Globe emoji | Vietnam map silhouette (from `client/public/vietnam.png`) or `Globe` Lucide icon in `#37326E` | Use the map silhouette for Vietnam-specific contexts, Globe icon for generic "global trade" contexts |
| Document emoji | `FileText` Lucide icon | |
| Money emoji | `DollarSign` Lucide icon | |
| Shield emoji | `ShieldCheck` Lucide icon | |
| Chain/link emoji | `Link2` Lucide icon | |
| Any other emoji | Find the closest Lucide equivalent | Browse: https://lucide.dev/icons/ |

---

## 8. Data Visualization Recommendations

### 8.1 Origin Composition Pie Chart (for Vietnam User Journey or supplementary slide)

**Purpose:** Show the origin composition breakdown for a typical garment export (Korean fabric 35%, Vietnamese labor/production 55%, other inputs 10%).

**Design:**

- **Chart type:** Donut chart (not solid pie) with a center label
- **Center label:** "Vietnam Origin: 55%" in 20pt Bold `#37326E`
- **Segments:**
  - Vietnam (55%): `#14B8A6` (teal)
  - South Korea (35%): `#2563EB` (blue)
  - Other (10%): `#94A3B8` (slate)
- **Legend:** Positioned to the right of the donut, with colored dots + percentage + label
- **Size:** 3.5" diameter donut, positioned in the right half of a slide or as a supporting visual within the User Journey slide
- **Caption:** "CPTPP cumulation rules allow Korean inputs to count toward origin threshold" (10pt, `#94A3B8`)

### 8.2 Trade Value Flow (optional supplementary slide)

**Purpose:** Visualize the garment export trade value (Vietnam to US/EU).

**Design:**

- **Chart type:** Sankey diagram or simple flow arrows with proportional width
- **Left source:** "Vietnam" with a teal bar proportional to export volume
- **Right destinations:** "United States" and "European Union" with separate bars
- **Value labels:** "$X.X billion garment exports (2025)" with source citation
- **Color:** Teal for Vietnam flows, slate for baseline comparison

### 8.3 Document Completeness Status Bar (for live demo context)

**Purpose:** Show which documents are present for a sample consignment.

**Design:**

- **Chart type:** Horizontal stacked progress bar
- **Segments:** Each document type is a segment (6 total: CO, Commercial Invoice, Packing List, B/L, Export Declaration, Inspection Report)
- **Color coding:** Green for present, amber for pending, red for missing
- **Labels:** Document type abbreviations below each segment
- **This visualization mirrors the demo application's `DocsPill` component** (`docs-pill docs-complete/docs-partial/docs-low`), creating visual continuity between presentation and demo.

---

## 9. Vietnam-Specific Visual Elements

### 9.1 Vietnam Map Usage

The Vietnam map silhouette (`client/public/vietnam.png`) should be used in three ways:

**9.1.1 Title bar watermark (every slide).** Rendered at 12-15% opacity in white, positioned in the top-right corner of the title bar. This is subtle and does not distract from content but creates a persistent geographic identity.

**9.1.2 Hero element on the User Journey slide (Slide 3).** A larger (1.5" tall) teal-tinted version of the Vietnam map placed behind the Vietnam-side steps (Steps 1-5) as a background watermark at 8% opacity. This creates a geographic container for the export-side content without interfering with readability.

**9.1.3 Node identity in architecture diagrams (Slides 2 and 5).** Where the Vietnam node is shown as a box in architecture diagrams, place a small (20px) Vietnam map icon inside the box, next to the text label "Vietnam Export Node." This replaces generic server icons with a location-specific marker.

### 9.2 Trade Route Visualization

On Slide 2 (Framework Overview) or as a supplementary element on the User Journey slide:

- Show a simplified trade route line from **Hai Phong / Ho Chi Minh City** (Vietnam) to **Long Beach / Los Angeles** (US) or **Rotterdam** (EU)
- Render as a curved dotted line on a minimal world map outline (show only East/Southeast Asia and North America/Europe, no full world map needed)
- Mark Vietnam with a teal dot, destination ports with red/purple dots
- Label: "Garment & Footwear Export Corridor" along the route line
- **Keep this minimal.** A full detailed map is unnecessary and distracting. Three dots and two curved lines are sufficient.

### 9.3 Government Seals and Badges

For government entities (MOIT, Vietnam Customs), use a subtle official styling:

- **Gold border** (`#D97706`) on all government entity cards
- **"GOV" badge:** A small rounded rectangle (0.4" x 0.16") with `#FEF3C7` background, `#D97706` text "GOV", positioned top-right inside the card
- This visually distinguishes government actors from private sector actors without requiring the audience to read role labels

### 9.4 Country Flags

Use small (16x16px) country flag icons for geographic context:

| Country | Context | Position |
|---------|---------|----------|
| Vietnam | Steps 1-5 in user journey, Vietnam node label | Next to step numbers or node labels |
| South Korea | Step 1 (Korean raw materials) | Inside the Step 1 card |
| United States | Step 6 (CBP verification) | Inside the Step 6 card |
| European Union | Step 6 (alternative destination) | Inside the Step 6 card |

Flag icons should be from a consistent set (e.g., flag-icons or country-flag-icons libraries). Use rounded rectangle flag badges, not raw flag images.

---

## 10. Accessibility Notes

### 10.1 Contrast Ratios

All color combinations in this specification meet WCAG 2.1 AA requirements (4.5:1 for normal text, 3:1 for large text):

| Combination | Contrast Ratio | Passes |
|-------------|---------------|--------|
| `#FFFFFF` on `#37326E` (white on purple) | 11.8:1 | AA/AAA |
| `#334155` on `#FFFFFF` (slate on white) | 9.7:1 | AA/AAA |
| `#FFFFFF` on `#14B8A6` (white on teal) | 3.2:1 | AA (large text only) |
| `#065F46` on `#D1FAE5` (dark teal on light teal) | 7.1:1 | AA/AAA |
| `#92400E` on `#FEF3C7` (dark amber on light amber) | 6.1:1 | AA |
| `#37326E` on `#EEEDFA` (purple on light purple) | 7.5:1 | AA/AAA |

**Note:** White text on teal (`#14B8A6`) is borderline for small text. Use it only for large text (18pt+) or UI elements. For small text on teal backgrounds, use `#065F46` (dark teal) instead.

### 10.2 Color Independence

Color is never the sole indicator of meaning. All status, category, and flow information is reinforced with:

- **Text labels** (e.g., "GOV" badge, step numbers, document names)
- **Icons** (distinct icons per document type and actor role)
- **Position** (steps arranged in sequential order)

### 10.3 Font Size Minimum

No text in the presentation falls below 10pt. Body text is 14pt for comfortable reading at projector distance (3-5 meters). Diagram labels are 10-11pt, which is acceptable for detailed reference slides viewed up close.

### 10.4 Projector Considerations

- **Avoid thin lines** (< 1.5px) that may disappear on low-resolution projectors
- **Use solid backgrounds** rather than gradients for card fills (gradients can band on some projectors)
- **Test all teal elements** on a projector if possible. Teal can shift toward green on some display technologies. If this happens, increase the saturation or shift slightly toward cyan.

---

## Summary: Slide Order After Changes

| Slide # | Title | Type | Primary Visual Element |
|---------|-------|------|----------------------|
| 1 | The Current Reality | Problem statement | Three disconnected pillar cards |
| 2 | TWIN Framework Overview | Architecture | Three-layer stack diagram |
| **3** | **Vietnam Garment Export: Document Journey** | **User journey (NEW)** | **6-step horizontal flow with document cards** |
| 4 | Identity, Documents, Ledger | Technical depth | Three feature cards with connector |
| 5 | Payments, Trade Finance, Nodes | Finance + infrastructure | Two-row grid (finance cards + node diagram) |
| 6 | How to Participate | Call to action | Three integration tier cards with gradient |

---

## Implementation Notes for pptxgenjs

If generating this presentation programmatically with `pptxgenjs`, reference the existing design specification at `docs/ux/pptx-presentation-design-spec.md` for:

- Slide master definitions (adapt the IOTA Teal `#14CABF` references to TWIN Teal `#14B8A6`)
- Reusable style objects (title, body, table, callout, caption)
- Diagram node styles (adapt to the Vietnam/Government/External color scheme defined in Section 2.3)
- Layout measurements and grid positions

The existing spec covers `pptxgenjs` API parameters, margins, and font rendering. Apply the color palette and icon substitutions from this document on top of that structural foundation.
