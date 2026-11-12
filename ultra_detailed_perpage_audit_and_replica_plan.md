# Ultra-Detailed Per-Page Audit & World-Class Replica Blueprint
## Qmova Bidding Platform — Senior Frontend SaaS Design Audit
### Benchmarked Against: Minaions.com + ContraVault.com + Linear.app

---

> **Status:** Research-complete. Sources reviewed: minaions.com (full HTML source), contravault.com (full HTML + CSS design tokens), Linear.app design system docs, + 4 web research passes.
> **Date:** 2026-11-03

---

## PART I: BENCHMARK ANALYSIS — HOW WORLD-CLASS PLATFORMS WORK

### A. Minaions.com — Extracted Design System

**Typography:**
- Font: `Inter 18pt` (preloaded via woff2), weights 400/500/600/700
- Headings use tight `line-height: 1.1`, negative letter-spacing on hero
- Accent color: `#f97316` (orange), navigation text: `#fff` / `#111`
- No cursive, no decorative fonts whatsoever

**Color Architecture (Dark Nav + Light Body):**
```
Nav bg:      #1a1a1a (near-black)
Nav text:    #ffffff / links #f97316 (orange accent)
Body bg:     #ffffff
Body text:   #111111
Cards:       white, 1px #eee border, no heavy shadows
Accent:      #f97316 (CTA orange), #8b5cf6 (search focus purple)
Status:      Green ✓, Red ✗, Amber ⚠
```

**Navigation Structure (Minaions):**
```
Logo | Solutions▼ | Top Tenders▼ | Clients | Blog | Contact | [Register/Login]
```
- Dropdown: mega-menu with 5 solution columns + stats panel
- Stats bar in mega-menu: 1500+ MSMEs | 50K+ Active Tenders | 60% More Wins | 10 Min AI Bid | 100% Secure
- Navbar search: 250px pill input, suggestions dropdown w/ purple focus ring
- CTA button: `btn-dark-gray btn-round-edge` → dark background, 10px 20px padding, 12px font

**Hero Section (Minaions — exact copy):**
```
Badge:     "AI POWERED" (orange pill)
H1:        "Smarter Bids. Better Wins."  (short, punchy)
Sub:       "AI tools to find, analyse and win more tenders."
Cards:     AI Bid Preparation | AI Compliance Check | Price Intelligence
Stats:     1500+ MSMEs | 50K+ Tenders | 60% More Won | 10 Min Bid | 100% Secure
CTA:       [Explore Platform]
```

**Page Structure:**
1. Nav (sticky glass)
2. Hero (H1 + sub + 3 AI feature cards + stats strip)
3. Social proof logos (MSME clients)
4. Feature showcase (alternating text+screenshot)
5. How it works (3-step numbered)
6. Testimonials
7. Pricing (3 tiers)
8. FAQ accordion
9. Footer

---

### B. ContraVault.com — Extracted Design System

**Typography:**
- Primary font: `Satoshi` (self-hosted, woff2), CSS var `--font-satoshi`
- Font weights: 400 (body), 500 (headings `--lp-heading-font-weight`), 600-700 (CTAs)
- H1: `62px / 68px` desktop, `42px / 46px` mobile
- H2: `42px / 48px` desktop, `32px / 38px` mobile
- Letter spacing: `-0.02em` (tight, authoritative)
- Border-radius: `4px` everywhere (sharp, enterprise)

**Color Tokens (extracted from inline `<style>`):**
```css
--text-highlight: #19d67c;        /* emerald green accent */
--background-primary: #ffffff;
--background-inverse: #000000;
--gray-1000: #2f2f2f;             /* near-black text */
--gray-900: #3c3c3c;              /* secondary text */
--gray-400: #858585;              /* muted */
--border-subtle: #d9d9d9;
--border-strong: #858585;
--radius-button: 4px;
--radius-card: 4px;
```

**Navigation (ContraVault):**
```
Logo | Platform▼ | Industry▼ | Discover▼ | Company▼ | [Request Demo]
```
- `bg-white shadow-sm` on scroll, transparent at top
- H: `74px` mobile, `82px` desktop
- CTA: `h-[46px] w-[154px]` black button, `rounded-[4px]`
- Clients: Voltas, Adani, Bajel, ITC, ThyssenKrupp, Afcons

**Hero (ContraVault — exact):**
```
H1: "AI for Winning RFPs"
Sub: "ContraVault AI helps AEC, GovCon and enterprise bid teams analyze 
     RFPs, run Go/No-Go checks, flag risks, draft proposals and win more 
     work with confidence."
CTA: [Request Demo] [See how it works →]
Social proof: Trusted by Voltas · Adani · ITC · ThyssenKrupp
```

**Key Design Decisions:**
- Zero border-radius on cards (4px = functionally sharp)
- Black primary CTA (`#000000`), emerald highlight for accents (`#19d67c`)
- Satoshi font = warmer, humanist sans vs Linear's cold Inter
- Max content width `1440px` with `px-[80px]` at 2xl

---

### C. Linear.app — Design System (Research)

**Canonical tokens:**
```css
Canvas:       #08090a (near-black, not true black)
Surface-1:    #0f1011
Surface-2:    #141516
Surface-3:    #18191a
Border:       rgba(255,255,255,0.06)  /* hairline */
Accent:       #5e6ad2 (lavender-indigo BG), #7170ff (interactive)
Text-primary: #f3f4f6
Text-muted:   #9ca3af
Font:         Inter Variable, weight 510 (custom between 500-600)
Spacing:      4px grid system
Radius-sm:    6px, Radius-md: 8px, Radius-lg: 12px
Transition:   150ms ease-out
```

**Pattern:** Command palette (`Cmd+K`), sidebar left navigation, master-detail layout, inline editing, keyboard-first design.

---

## PART II: PER-PAGE AUDIT — CURRENT PLATFORM

---

### PAGE 1: Landing Page (`/`) — `LandingPage.jsx` (52KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 4/10 | Glow background clashes with cards; too many competing elements |
| Typography | 3/10 | Cursive fonts (Caveat, Alex Brush) destroy professional credibility |
| Copy / Intent Clarity | 3/10 | "Intelligent Compliance Automation" is vague; no immediate value prop |
| Button Clarity | 4/10 | "Try Free" is ok; other CTAs unclear intent |
| Information Hierarchy | 3/10 | Too many sections compete for attention simultaneously |
| Mobile Responsiveness | 5/10 | Basic breakpoints exist |
| Backend Connectivity | N/A | Marketing page, no backend calls |
| Overall UX Score | **3.7/10** | Needs full rebuild |

#### Problems (Exact Issues)

1. **Hero H1:** "Intelligent Compliance Automation" — zero connection to real user pain. A bid manager doesn't think in "compliance automation."
2. **Cursive Fonts:** `font-family: 'Caveat', 'Alex Brush'` used in section headings — looks like a wedding invite, not an enterprise tender tool.
3. **Glow Canvas:** `GeminiGlowBackground` draws user attention to itself, not the content.
4. **Stats strip:** "200+ Tenders" numbers look fake/small vs Minaions "50K+ Active Tenders"
5. **Interactive "auditor":** The AI demo in the landing page is poorly framed — user doesn't know what to type.
6. **No testimonials:** Zero social proof on the page.
7. **Nav:** No mega-menu, weak CTA hierarchy.

#### What World-Class Looks Like (1:1 Target)

```
NAV:  Logo | Solutions▼ | Tenders▼ | Clients | Pricing | Blog | [Sign In] [Get Demo →]

HERO (Minaions-inspired, adapted for Qmova):
  Badge: "AI-POWERED TENDER INTELLIGENCE"
  H1:   "Smarter Bids.
         Bigger Wins."
  Sub:  "Qmova analyzes NIT documents, maps GCC clauses, checks EMD 
         exemptions and generates compliant bid packages — in under 
         10 minutes."
  CTAs: [Get Free Analysis →]  [See a Live Demo]
  Cards: 
    📄 AI Bid Preparation     "Build compliant bids 10x faster"
    🛡 Clause Risk Analyzer   "Flag NIT traps before you bid"
    📊 Pricing Intelligence   "Track L1 trends & winning rates"
  Stats: 
    1,200+ Bids Filed | 50K+ Tenders Indexed | 60% Win Rate Uplift | 
    10 Min Avg Bid | 100% Clause Coverage

SOCIAL PROOF: Logo bar (CPWD contractors, PSU vendors, MSME firms)

FEATURES (alternating text + UI screenshot, 3 sections):
  1. "Find the Right Tenders — Before Your Competitors Do"
  2. "Read 400-Page NITs in 60 Seconds"
  3. "Generate Submission-Ready Bid Packages"

HOW IT WORKS (3 numbered steps):
  1. Upload NIT / Tender Document
  2. AI Audits Eligibility, GCC, BOQ & Risks
  3. Download Compliant Bid Package

PRICING (3 tiers):
  Starter ₹1,499/mo | Professional ₹3,999/mo | Enterprise Custom

TESTIMONIALS (2–3 real-looking quotes)

FAQ (6 questions)

FOOTER:
  Logo | Solutions | Tenders | Clients | Blog | Contact
  © 2025 Qmova · Privacy · Terms
```

---

### PAGE 2: Auth (`/auth`) — `Auth.jsx` (36KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 5/10 | Acceptable dark card; lacks polish |
| Copy / Intent | 4/10 | "Create Account" is clear; sub-text weak |
| Form UX | 5/10 | Standard inputs; no inline validation feedback |
| Error States | 3/10 | Errors appear but styling is inconsistent |
| Social Login | 2/10 | Google login unclear visual hierarchy |
| Backend Connectivity | 7/10 | Auth endpoint wired |
| Trust Signals | 1/10 | Zero trust signals on auth page |
| Overall UX Score | **3.9/10** | |

#### Problems

1. No value prop on the auth page — user who lands from ad sees nothing that reminds them why they signed up.
2. Password field has no strength indicator.
3. "Register / Login" toggle is visually buried.
4. No "200+ companies trust Qmova" sidebar social proof.

#### 1:1 Target (ContraVault Auth Style)

```
LEFT PANEL (dark, 45%):
  Large Qmova logo
  H2: "Win More Government Tenders"
  3 bullet benefits:
    ✓ NIT analysis in under 10 minutes
    ✓ Auto-generate GCC compliance sheets
    ✓ Track 50,000+ live tenders
  Testimonial quote (1 small card at bottom)

RIGHT PANEL (white/light, 55%):
  "Create your free account" (H3)
  Sub: "No credit card required. Start analyzing tenders immediately."
  Form: Full Name | Work Email | Password | Company Name
  [Create Account →] (black button, full width)
  ─────── or ───────
  [Continue with Google]
  "Already have an account? Sign in"
  
  Fine print: "By signing up you agree to our Terms and Privacy Policy"
```

---

### PAGE 3: Dashboard (`/dashboard`) — `Dashboard.jsx` (18KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 5/10 | Cards exist but too many borders within borders |
| Information Density | 4/10 | Too sparse — wastes screen real estate |
| Navigation Clarity | 5/10 | Sidebar works but icons lack labels at collapsed state |
| Data Tables | 3/10 | Tender list has too many columns with poor hierarchy |
| Action Clarity | 3/10 | What does "Analyze" vs "Open" vs "Review" do? |
| Backend Connectivity | 7/10 | Pulls real tender list |
| Empty State | 2/10 | No guidance when user has 0 tenders |
| Overall UX Score | **4.1/10** | |

#### Problems

1. **Card-in-card anti-pattern:** `bg-surface` div → inside a `bg-elevated` section → inside a `card` = 3 nested borders.
2. **Tender list:** Shows 8 columns simultaneously — status, date, org, NIT#, value, deadline, score, action. Cognitive overload.
3. **No quick actions:** User can't see "upload new tender" prominently from dashboard.
4. **No telemetry:** No "3 tenders expiring this week" alert.
5. **Stats widgets:** "Total Analyzed: 4" looks amateur.

#### 1:1 Target (Linear-style Dashboard)

```
LAYOUT: Fixed sidebar (220px) + main content area

SIDEBAR:
  Qmova logo (top)
  ─────────────
  📊 Dashboard         (active)
  📁 My Tenders
  🔍 Discover Tenders
  🏢 Company Vault
  💰 Wallet
  ─────────────
  ⚙ Settings
  👤 Profile
  [+ Upload Tender]   ← sticky at bottom of sidebar

HEADER BAR:
  "Dashboard"                    [Q: Search tenders...]  [👤 Abhimanyu ▼]
  
TELEMETRY STRIP (4 metrics, horizontal):
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │  12          │ │  3           │ │  78%         │ │  ₹2.4 Cr     │
  │  Total Bids  │ │  Expiring    │ │  Win Rate    │ │  Pipeline    │
  │              │ │  This Week   │ │              │ │  Value       │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

TENDER TABLE (compact, high-density):
  Cols: NIT # | Tender Name | Dept | Value | Deadline | Status | Action
  Row: hover highlight, click to open workspace
  Status badge: Analyzing | Ready | Expired | Won | Lost
  Action: [Open] (primary)

QUICK ACTIONS (top right):
  [+ Upload New Tender]
  [🔍 Find Tenders]

EMPTY STATE (when 0 tenders):
  Illustration + "Upload your first NIT to get started"
  [Upload Tender →]
```

---

### PAGE 4: Workspace (`/workspace`) — `Workspace.jsx` (81KB — largest file)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 4/10 | Split pane works but tab labels are vague |
| Tab Navigation | 3/10 | "Overview", "Copilot", "Compliance", "BOQ", "Docs" — unclear ordering |
| PDF Viewer | 5/10 | Present but no highlighting/annotation |
| AI Chat UX | 5/10 | Chat works but no citation linking |
| Compliance View | 4/10 | Table exists but sorting/filtering absent |
| BOQ Tab | 3/10 | Numbers present but no export CTA clarity |
| Generation Tab | 4/10 | Document types unclear |
| Backend Connectivity | 8/10 | Best-connected page |
| Overall UX Score | **4.5/10** | Highest-potential page |

#### Problems

1. **Tab labels:** "Overview" (what overview?), "Copilot" (generic AI slop word)
2. **No clause-to-PDF linking:** Compliance flags don't jump to the clause in the PDF.
3. **BOQ tab:** Just a table — no "Export to Excel" button prominently visible.
4. **Generation tab:** "Generate Document" with a dropdown of types is ambiguous.
5. **Chat input:** Placeholder "Ask anything..." — too vague for first-time users.

#### 1:1 Target (ContraVault Workspace Style)

```
LAYOUT: Header bar + left PDF panel (45%) + right tool panel (55%)

HEADER:
  ← Dashboard | NIT-2024-CPWD-1234 | CPWD Road Works | ₹4.2 Cr | ⏰ 3 days left
  
  Tab strip (top of right panel):
  [📋 Synopsis] [✅ Eligibility] [⚠ Risks] [📊 BOQ] [💬 Ask AI] [📄 Generate]

LEFT PANEL — PDF Viewer:
  PDF with AI highlights:
    🟡 Yellow = mandatory clauses
    🔴 Red = risk clauses  
    🟢 Green = met requirements
  Page nav, zoom, search within PDF

RIGHT PANEL — Tab content:

  SYNOPSIS tab:
    One-page executive summary
    Scope | Key Dates | EMD | PQ Criteria | Top Risks
    [Export Summary PDF]

  ELIGIBILITY tab:
    Table: Requirement | Threshold | Your Profile | Status
    Row example: "Avg Annual Turnover" | "₹5 Cr" | "₹8.2 Cr" | ✅ MET
    Row example: "Similar Work (last 5yr)" | "1 work ≥ ₹2Cr" | "2 works" | ✅ MET
    Row example: "MSME Cert" | "Required" | "Not uploaded" | ❌ MISSING
    [Upload Missing Documents]

  RISKS tab:
    Risk cards grouped by severity:
    CRITICAL: Clause 14.2 — Arbitration excludes disputes > ₹1Cr
    HIGH: Clause 7.1 — 2% penalty per week delay, max 10%
    MEDIUM: Corrigendum #2 changes BOQ item 4.3
    [Generate Risk Brief]

  BOQ tab:
    Spreadsheet-style table
    [Export to Excel] [Export to CSV]
    Summary: Total items: 48 | Estimated value: ₹4.2 Cr

  ASK AI tab:
    Chat interface with suggested queries:
    "What is the EMD amount?"
    "Are there MSME exemptions?"
    "What is the submission deadline?"
    Input: "Ask about this tender..."
    Responses cite clause numbers with [Clause 7.1 ↗] links

  GENERATE tab:
    Document types:
    📄 Pre-Bid Query Letter → [Generate]
    📄 Bid Covering Letter → [Generate]
    📄 Compliance Statement → [Generate]
    📄 Technical Bid Package → [Generate]
    📄 Financial Bid Format → [Generate]
    Generated files appear as downloads below
```

---

### PAGE 5: Tender Discovery (`/discovery`) — `TenderDiscovery.jsx` (34KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 4/10 | Functional but plain |
| Search UX | 4/10 | Keyword search works; filters are hidden |
| Filter Sidebar | 3/10 | Too many filter options, no priority ordering |
| Result Cards | 4/10 | Show basic info but no match-score |
| Copy | 3/10 | No suggested searches, no state/category browse |
| Backend Connectivity | 6/10 | Search works but slow |
| Empty/Loading States | 3/10 | Generic spinner |
| Overall UX Score | **3.9/10** | |

#### 1:1 Target (Minaions Discovery Style)

```
LAYOUT: Filter sidebar (280px) + results area

HEADER:
  "Discover Tenders"
  Search bar (full width): [🔍 Search by keyword, dept, or location...  ]
  Filters below search: [Location▼] [Department▼] [Value Range▼] [Deadline▼] [Sort▼]

FILTER SIDEBAR (collapsible):
  Browse by Location (state list)
  Browse by Department 
  Browse by Product/Service category
  Value Range slider
  Deadline: [Today] [This Week] [This Month]

RESULTS GRID:
  Each card:
    ┌────────────────────────────────────────────┐
    │ NIT-2024-UPJN-4521          ⏰ 5 days left │
    │ Supply of Water Meters — 500 Nos           │
    │ Jal Nigam, Lucknow                         │
    │ ₹28.5 Lakhs           [95% Match ✓]        │
    │ [View Details]  [Quick Check Eligibility]  │
    └────────────────────────────────────────────┘

TOP STATS BAR:
  "Showing 1,247 tenders · Updated 4 mins ago"
  [GeM] [CPPP] [State Portals] source badges
```

---

### PAGE 6: Company Vault (`/vault`) — `CompanyVault.jsx` (23KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 5/10 | Cards exist but section headers are unclear |
| Copy | 3/10 | "Company Intelligence" doesn't explain what to upload |
| Upload UX | 4/10 | Drag-drop exists but lacks progress feedback |
| Document Categories | 3/10 | Categories not clearly mapped to NIT requirements |
| Backend Connectivity | 7/10 | CRUD works |
| Guidance | 1/10 | No "what to upload" onboarding |
| Overall UX Score | **3.8/10** | |

#### 1:1 Target (ContraVault Knowledge Base Style)

```
HEADER: "Company Knowledge Base"
Sub: "Upload your credentials once. Qmova uses them automatically when 
      checking eligibility and generating bid documents."

SECTIONS (accordion or tabs):
  📋 Registration & Legal
    [+ Upload] GST Certificate | PAN Card | CIN | MSME Udyam
    
  💰 Financial Documents  
    [+ Upload] ITR FY2023 | ITR FY2024 | CA Balance Sheet | Turnover Cert
    
  🏗 Experience Certificates
    [+ Upload] Completion Certificates (with value, scope, client)
    
  👥 Team & Resources
    [+ Upload] Key Personnel CVs | Equipment List
    
  🏆 Certifications
    [+ Upload] ISO | BIS | NABL | Any others

COVERAGE METER:
  "Profile Completeness: 68%"
  Progress bar
  "Upload 3 more documents to enable auto-fill for all tenders"

EACH DOCUMENT CARD:
  Filename | Expiry date (if applicable) | [✏ Edit] [🗑 Delete]
  Status: ✅ Valid | ⚠ Expires in 30 days | ❌ Expired
```

---

### PAGE 7: Settings (`/settings`) — `Settings.jsx` (15KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 4/10 | Adequate |
| Organization | 4/10 | Settings categories exist but ordering is odd |
| Copy | 3/10 | "Configuration" headers instead of plain English |
| Backend Connectivity | 6/10 | Saves work |
| Overall UX Score | **4.2/10** | |

#### 1:1 Target

```
SIDEBAR MENU:
  👤 Account
  🔔 Notifications
  🏢 Company Profile  
  🔑 API & Integrations
  💳 Billing & Usage
  👥 Team Members
  🛡 Security

EACH SECTION: Clean form layout, [Save Changes] button at bottom
BILLING: Usage meter (credits used / total), [Upgrade Plan] CTA
NOTIFICATIONS: Toggle switches for alert types (new tender match, deadline warning, etc.)
```

---

### PAGE 8: Guest Trial (`/try`) — `GuestTrial.jsx` (28KB)

#### Current Ratings

| Parameter | Score | Notes |
|-----------|-------|-------|
| Visual Design | 4/10 | Functional |
| Onboarding Copy | 2/10 | "Try the AI" is too generic |
| Demo Experience | 5/10 | Upload works but result presentation weak |
| Conversion CTA | 2/10 | "Sign up to see more" buried at bottom |
| Overall UX Score | **3.3/10** | Lowest-rated page |

#### 1:1 Target

```
HEADER: "Analyze Your First Tender — Free"
Sub: "Upload any NIT document. Get eligibility check, clause risks, and 
      BOQ extraction in 60 seconds. No signup needed."

Upload area (large, drag-drop):
  "Drop your NIT PDF here"
  [Or browse files] [Or try a sample NIT]

After upload — live progress:
  ⏳ Reading document...
  ⏳ Extracting clauses...
  ⏳ Checking eligibility...
  ✅ Analysis complete!

Results preview (blurred bottom 50%):
  Eligibility: 3/5 criteria met
  Top Risk: Clause 12.4 — Penalty exceeds industry standard
  BOQ: 24 line items found
  
[Create Free Account to Download Full Report →]
(This is the conversion CTA — prominent, full-width, can't be missed)
```

---

## PART III: EXACT IMPLEMENTATION PLAN — 1:1 WORLD-CLASS REPLICA

### Design System Foundation (index.css overhaul)

**Fonts to implement (exact Minaions/Linear stack):**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;510;600;700;800&display=swap');

:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Berkeley Mono', 'Fira Code', ui-monospace, monospace;
  /* REMOVE: Caveat, Alex Brush, any cursive font */
}
```

**Color tokens (hybrid Minaions orange + ContraVault precision):**
```css
:root {
  /* Dark theme (default) */
  --canvas:          #08090a;
  --surface-1:       #0f1011;
  --surface-2:       #141516;
  --surface-3:       #18191a;
  --border-hairline: rgba(255,255,255,0.06);
  --border-subtle:   rgba(255,255,255,0.10);
  --border-strong:   rgba(255,255,255,0.18);
  --text-primary:    #f3f4f6;
  --text-secondary:  #9ca3af;
  --text-muted:      #6b7280;
  --accent-orange:   #f97316;    /* Minaions primary */
  --accent-indigo:   #5e6ad2;    /* Linear/workspace accent */
  --accent-emerald:  #19d67c;    /* ContraVault highlight */
  --status-pass:     #10b981;
  --status-warn:     #f59e0b;
  --status-fail:     #ef4444;
  --radius-sm:       4px;        /* ContraVault sharp */
  --radius-md:       8px;
  --radius-lg:       12px;
  --radius-pill:     999px;
  --transition-fast: 150ms ease-out;
}

[data-theme="light"] {
  --canvas:          #ffffff;
  --surface-1:       #f9f9f9;
  --surface-2:       #f3f3f3;
  --surface-3:       #ededed;
  --border-hairline: #ededed;
  --border-subtle:   #d9d9d9;
  --border-strong:   #858585;
  --text-primary:    #2f2f2f;
  --text-secondary:  #3c3c3c;
  --text-muted:      #646464;
}
```

---

### Phase 1 — CSS Design System (Day 1)
**Files:** `src/index.css`

- [ ] Remove all `Caveat`, `Alex Brush`, `Dancing Script` font imports
- [ ] Add Inter Variable from Google Fonts
- [ ] Replace all color tokens with above system
- [ ] Replace all `border-radius: 18px` cards with `4px` (ContraVault) or `8px` (Linear)
- [ ] Remove nested card shadows — use single-level surfaces
- [ ] Add tabular-nums to all number displays
- [ ] Standardize button variants: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`
- [ ] Remove all `box-shadow: 0 0 40px rgba(...)` glow effects from light mode

---

### Phase 2 — Landing Page Rebuild (Day 2–3)
**Files:** `src/pages/LandingPage.jsx`

**Section-by-section implementation:**

1. **Navbar** — sticky, glass blur on scroll, orange accent, mega-dropdown for Solutions
2. **Hero** — "Smarter Bids. Bigger Wins." H1 with `-0.03em` tracking, 3 feature mini-cards, stats bar
3. **Logo strip** — monochrome client logos (CPWD, GeM, IREPS, etc.)
4. **Feature sections** — 3 alternating `text | screenshot` sections
5. **How it works** — 3-step numbered with connecting line
6. **Pricing** — 3 tier cards, middle one highlighted with orange border
7. **Testimonials** — 2-column quote cards
8. **FAQ** — accordion, 6 common questions
9. **Footer** — 4-column grid, orange logo

---

### Phase 3 — App Pages Overhaul (Day 4–6)

**Layout component rebuild:**
- Sidebar: `220px` fixed, collapsible to `60px` (icon-only), orange `+` button at bottom
- Top bar: Breadcrumb + global search + user avatar dropdown
- Content area: `calc(100vw - 220px)`, `padding: 24px`

**Dashboard:**
- Telemetry strip (4 KPI cards, no borders between them, subtle dividers)
- Tender list: high-density table, compact rows (40px height), hover state
- Quick upload button: floating orange FAB or prominent top-right button

**Workspace:**
- Rename tabs: Overview→Synopsis, Copilot→Ask AI, Compliance→Eligibility, keep BOQ, Docs→Generate
- Add clause-highlight syncing between PDF viewer and right panel
- Prominent export buttons on every tab

**Company Vault:**
- Grouped sections with progress meter
- Document status badges (valid/expiring/expired)
- "Upload Missing" prompt tied to real eligibility gaps

**Auth:**
- Split-panel design (dark left / light right)
- Benefits list on left
- Clean form on right, black CTA button

**Guest Trial:**
- Bigger upload zone
- Live progress steps
- Results preview with blur gate → conversion CTA

---

### Phase 4 — Content/Copy Replacement (Day 7)

**Every page — exact copy replacements:**

| Old (AI Slop) | New (Enterprise Tender) |
|---------------|------------------------|
| "Intelligent Compliance Automation" | "Smarter Bids. Bigger Wins." |
| "AI-powered document intelligence" | "Read 400-page NITs in 60 seconds" |
| "Enhance your workflow" | "File compliant bids 10x faster" |
| "Ask anything..." | "Ask about EMD, GCC clauses, deadlines..." |
| "Generate document" | "Generate Pre-Bid Query Letter" |
| "Upload file" | "Upload NIT / Tender Document" |
| "Analysis complete" | "Eligibility checked. 3 risks flagged." |
| "Company Vault" | "Company Knowledge Base" |
| "Copilot" | "Ask AI" |
| "Processing..." | "Reading NIT · Extracting clauses · Checking GCC..." |

---

### Phase 5 — QA & Polish (Day 8)

- [ ] Light mode pass — all surfaces readable, no black canvas bleed
- [ ] Mobile breakpoints — sidebar collapses to bottom nav on mobile
- [ ] Font loading — Inter preloaded, no FOUT
- [ ] Empty states on every page
- [ ] Error states with actionable text (not "Something went wrong")
- [ ] Loading skeletons instead of spinners
- [ ] `tabular-nums` on all monetary values
- [ ] Build verification: `npm run build` passes
- [ ] Test suite: `npm test` 16/16 pass

---

## PART IV: IMPLEMENTATION PRIORITY ORDER

```
Priority 1 (NOW):  index.css — design tokens, fonts, remove cursive
Priority 2:        LandingPage.jsx — full hero + sections rebuild  
Priority 3:        Layout component — sidebar + topbar
Priority 4:        Dashboard.jsx — telemetry + table overhaul
Priority 5:        Workspace.jsx — tab rename + PDF/panel sync
Priority 6:        Auth.jsx — split panel
Priority 7:        CompanyVault.jsx — sections + progress
Priority 8:        GuestTrial.jsx — conversion optimization
Priority 9:        Copy pass — all pages
Priority 10:       QA + mobile + build check
```

---

## PART V: COMPOSITE AUDIT SCORECARD

| Page | Design | Copy | UX | Backend | Mobile | Total |
|------|--------|------|----|---------|--------|-------|
| Landing | 4/10 | 3/10 | 3/10 | N/A | 5/10 | **3.7/10** |
| Auth | 5/10 | 4/10 | 4/10 | 7/10 | 5/10 | **3.9/10** |
| Dashboard | 5/10 | 4/10 | 4/10 | 7/10 | 4/10 | **4.1/10** |
| Workspace | 4/10 | 3/10 | 5/10 | 8/10 | 3/10 | **4.5/10** |
| Discovery | 4/10 | 3/10 | 4/10 | 6/10 | 4/10 | **3.9/10** |
| Company Vault | 5/10 | 3/10 | 4/10 | 7/10 | 5/10 | **3.8/10** |
| Settings | 4/10 | 3/10 | 4/10 | 6/10 | 5/10 | **4.2/10** |
| Guest Trial | 4/10 | 2/10 | 3/10 | 6/10 | 4/10 | **3.3/10** |
| **PLATFORM AVG** | | | | | | **3.9/10** |

**Target after implementation: 8.5+/10 across all pages.**

---

*Benchmark sources: minaions.com (full source analyzed), contravault.com (design tokens extracted), Linear.app (design system research), ContraVault UX patterns research.*
