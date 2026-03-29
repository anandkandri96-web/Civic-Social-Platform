# Civic Social Platform — Frontend UI/UX Design Specification

Scope: This document **extracts and formalizes** the UI/UX system as implemented in the React + Vite frontend (plain CSS). It does **not** propose a redesign. All details map to current source files under `frontend/src/`.

Primary sources of truth:
- Global tokens: `frontend/src/styles/variables.css`
- Theme overrides: `frontend/src/styles/theme.css`
- Base + primitives: `frontend/src/styles/base.css`, `frontend/src/styles/layout.css`, `frontend/src/styles/utilities.css`, `frontend/src/styles/components.css`
- Routing + role gates: `frontend/src/core/AppRoutes.jsx`, `frontend/src/components/auth/ProtectedRoute.jsx`, `frontend/src/hooks/useRole.js`

---

## Project Structure (UI-Relevant)

`frontend/src/` (high-signal folders only)
- `api/` — API clients (axios wrappers) used by pages/components
- `assets/` — role icon PNGs and other assets
- `components/`
  - `auth/` — route guards (e.g., `ProtectedRoute`)
  - `common/` — reusable primitives (**Button, Loader, Skeleton, PageHeader, StateCard, ThemeToggle, SafeImage**)
  - `forms/` — form subcomponents (`AuthForm/`, `IssueForm/`)
  - `issues/` — issue domain components (cards, badges, timelines, voting)
  - `layout/` — navigation chrome (`Header/`, legacy `Navbar/`)
  - `map/` — Leaflet map renderer (`IssueLeafletMap.jsx`)
  - `notifications/` — notification dropdown panel
  - `tasks/` — worker task UI components
  - `volunteer/` — volunteer actions panel for Issue Details
- `contexts/` — `AuthContext`, `ThemeContext`
- `core/` — app entry composition + routes
- `hooks/` — `useAuth`, `useRole`, `useTheme`, `useIssuesData`
- `layouts/` — `AppLayout`, `MainLayout`, `DashboardLayout`
- `pages/` — page-level routes (Auth, Dashboard, Issues, Admin, Home, Map, Notifications, Profile, CivicWorkflow, Volunteer)
- `styles/` — global CSS token + base layers
- `utils/` — role/status helpers, mock workflow copy, media URL resolver, user display helpers

---

# 1) 🎨 DESIGN SYSTEM (GLOBAL)

## 1.1 Token Sources and Cascade

Load order in `frontend/src/main.jsx`:
1. `variables.css` (base tokens)
2. `theme.css` (theme overrides via `[data-theme='light'|'dark']`)
3. `base.css` (reset + base element styles)
4. `layout.css` (layout primitives: `.page`, `.container`, `.card`, etc.)
5. `utilities.css` (small utility classes)
6. `components.css` (shared component primitives: `.icon-button`, `.badge-pill`, `.skeleton`, etc.)

Theme application:
- `frontend/src/contexts/ThemeContext.jsx` sets `document.documentElement[data-theme]` to `light|dark`.

## 1.2 Colors

### Core Palette (tokens)

Source: `frontend/src/styles/variables.css`

| Token | Hex | Intended usage (as implemented) | Where it appears |
|---|---:|---|---|
| `--color-brand` | `#2f8398` | App chrome brand (header bg), “info/progress” accents | `Header.css`, gradients, icon/button hovers |
| `--color-primary` | `#87a83f` | Primary CTA fills (Report Issue, primary buttons) | `Button.css`, `Header.css`, many page CTAs |
| `--color-secondary` | `#c0c91e` | Secondary accent (rare) | Home page palette references this value directly |
| `--color-highlight` | `#f2b933` | Hover/secondary highlight, warning tone | `Button.css` hover, badges, warning visuals |
| `--color-danger` | `#f27c54` | Destructive actions + error surfaces | error banners, delete buttons, warnings |
| `--gradient-accent` | `linear-gradient(135deg, var(--color-brand), var(--color-secondary))` | Brand mark fills, accent buttons (notably Home) | `Header.css`, `Home.css` |

### Background / Surface Tokens

Defaults (light) from `variables.css` (also duplicated in `[data-theme='light']`):
- `--bg-main`: `#f5f7f6`
- `--bg-surface`: `#ffffff`
- `--bg-card`: `#ffffff`
- `--bg-hover`: `#eef2f1`

Dark theme overrides in `frontend/src/styles/theme.css`:
- `--bg-main`: `#0a0f16`
- `--bg-surface`: `#0f1622`
- `--bg-card`: `#141f2e`
- `--bg-hover`: `#1a2a3e`

### Text Tokens

Source: `frontend/src/styles/variables.css` (overridden in dark via `theme.css`)
- `--text-primary`: light `#122e33` → dark `#e6f1f7`
- `--text-secondary`: light `#35585e` → dark `#b7cad6`
- `--text-muted`: light `#5c7a7f` → dark `#7f99aa`

On-accent tokens:
- `--text-on-accent`: `#ffffff`
- `--text-on-highlight`: `#122e33`
- `--text-on-danger`: `#122e33`

### Borders + Focus

Source: `frontend/src/styles/variables.css` (+ dark override for borders in `theme.css`)
- `--border-color`:
  - light: `#d6e1dd`
  - dark: `rgba(230, 241, 247, 0.12)`
- `--border-bright`:
  - light: `#c0d2cc`
  - dark: `rgba(230, 241, 247, 0.22)`
- `--focus-ring`: `0 0 0 3px rgba(var(--color-brand-rgb), 0.35)`

### Status Colors (Required mapping)

There is **no explicit `--color-info` token**; “info/new issue” is effectively represented by `--color-brand` (teal) and brand-derived surfaces.

| UI status | Token(s) | Hex | Canonical usage in UI |
|---|---|---:|---|
| Success (Resolved/Closed) | `--color-success` (= `--color-primary`) | `#87a83f` | `.badge-pill--success`, `WorkflowTimeline` done markers |
| Warning (In Progress/Under Review) | `--color-warning` (= `--color-highlight`) | `#f2b933` | `.badge-pill--warning`, various “pending/progress” chips |
| Danger (Rejected/Errors/Destructive) | `--color-danger` | `#f27c54` | error banners, delete buttons, danger badges |
| Info (New/Reported) | `--color-brand` | `#2f8398` | header background, progress surfaces, “brand glow” states |

Implementation detail:
- `IssueCard` status pill maps **everything not resolved** to a warning pill (`badge-pill--warning`). Source: `frontend/src/components/issues/IssueCard/IssueCard.jsx`.
- `StatusBadge` uses a distinct mapping (reported/rejected = warning, under_review/assigned/work_in_progress = brand, resolved/closed = success). Source: `frontend/src/components/issues/StatusBadge/StatusBadge.jsx`.

## 1.3 Typography

### Global fonts (tokens)

Source: `frontend/src/styles/variables.css` + font imports in `frontend/src/styles/base.css`
- Base/body: `--font-base`: `"DM Sans", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`
- Headings: `--font-heading`: `"Syne", "Space Grotesk", "Inter", sans-serif`
- Mono: `--font-mono`: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

Base defaults:
- `body { font-family: var(--font-base); font-size: var(--font-size-md); line-height: 1.5; }` in `frontend/src/styles/base.css`.

### Home page typography (page-scoped override)

`frontend/src/pages/Home/Home.css` imports and applies:
- `--font-body`: `"Inter", sans-serif`
- `--font-display`: `"Space Grotesk", sans-serif`
and then uses `font-family: var(--font-body)` for `.home-page` overall and `var(--font-display)` for major section titles.

### Font sizes (tokens + observed usage)

Tokens in `frontend/src/styles/variables.css`:
- `--text-h1: 48px`, `--text-h2: 36px`, `--text-h3: 28px`
- `--font-size-sm: 0.875rem`, `--font-size-md: 1rem`, `--font-size-lg: 1.125rem`, `--font-size-xl: 1.5rem`

Observed patterns:
- Page headers commonly use `clamp(...)` (e.g., `PageHeader.css`, `IssueList.css`, `CivicWorkflow.css`).
- “System text” uses 0.62–0.78rem in mono for labels and badges.

## 1.4 Spacing System

Source: `frontend/src/styles/variables.css`
- `--space-xs: 4px`
- `--space-sm: 8px`
- `--space-md: 16px`
- `--space-lg: 24px`
- `--space-xl: 32px`

Global layout primitives (`frontend/src/styles/layout.css`):
- `.container`: `width: min(1240px, 100% - 2 * var(--space-lg)); margin: 0 auto;`
- `.page`: `padding: var(--space-xl) 0; min-height: calc(100vh - 58px);`

## 1.5 Border, Radius, Shadow, Motion

Border thickness conventions:
- Default border: `1px solid var(--border-color)` (dominant)
- Emphasis: `2px` (rare, e.g., CreateIssue step dots)

Radius tokens (`frontend/src/styles/variables.css`):
- `--radius-sm: 7px`
- `--radius-md: 10px`
- `--radius-lg: 12px`

Shadow tokens (`frontend/src/styles/variables.css`):
- `--shadow-sm: 0 10px 24px rgba(16, 24, 40, 0.08)`
- `--shadow-md: 0 16px 40px rgba(16, 24, 40, 0.12)`
- `--shadow-lg: 0 30px 70px rgba(16, 24, 40, 0.16)`

Motion tokens (`frontend/src/styles/variables.css`):
- `--transition-fast: 0.15s ease`
- `--transition-normal: 0.25s ease`

---

# 2) 🧱 GLOBAL COMPONENT SYSTEM (`/components/common`)

Directory: `frontend/src/components/common/`

## 2.1 Button

Source:
- Component: `frontend/src/components/common/Button/Button.jsx`
- Styles: `frontend/src/components/common/Button/Button.css`

### API
Props:
- `children`
- `onClick`
- `type` (default `"button"`)
- `variant` (default `"primary"`)
- `size` (default `"md"`)
- `disabled` (default `false`)
- `loading` (default `false`)
- `className` (default `""`)

### Variants (CSS)
- `primary`: fill `--color-primary`; hover → `--color-highlight` and text becomes `--text-on-highlight`
- `secondary`: surface button (`--bg-surface`) + `--border-color`
- `danger`: fill `--color-danger`; hover darkens via `color-mix(...)`
- `outline`: transparent; hover shifts border + text to primary

### Sizes
| Size | Padding | Font size |
|---|---|---|
| `sm` | `6px 12px` | `0.78rem` |
| `md` | `10px 16px` | `0.86rem` |
| `lg` | `12px 20px` | `0.95rem` |

### States
| State | Behavior |
|---|---|
| Default | Inline-flex, bold text, fast transitions |
| Hover | `transform: translateY(-1px)` (unless disabled) |
| Disabled | `opacity: 0.6`, `cursor: not-allowed`, no transform |
| Loading | disables button and renders literal `"Loading..."` (no spinner) |

Icon usage:
- No dedicated icon props; layout supports icons by placing an element inside children (gap is built-in).

## 2.2 Loader

Source:
- `frontend/src/components/common/Loader/Loader.jsx`
- `frontend/src/components/common/Loader/Loader.css`

API:
- `size: 'sm'|'md'|'lg'` (default `'md'`)
- `fullScreen: boolean` (default `false`)
- `className`

Visual:
- Spinner ring in `--color-primary`
- Fullscreen overlay uses a translucent dark veil + blur (`backdrop-filter: blur(2px)`)

A11y:
- Spinner uses `role="status"` and `aria-label="Loading"`.

## 2.3 Skeleton

Source:
- `frontend/src/components/common/Skeleton/Skeleton.jsx`
- `frontend/src/components/common/Skeleton/Skeleton.css`

API:
- `width` (default `'100%'`)
- `height` (default `16`)
- `radius` (default `12`)
- `className`
- `style` (merged)

Behavior:
- Shimmer animation (`skeleton-shimmer` 1.2s infinite)
- `aria-hidden="true"`

## 2.4 PageHeader

Source:
- `frontend/src/components/common/PageHeader/PageHeader.jsx`
- `frontend/src/components/common/PageHeader/PageHeader.css`

API:
- `title`, `subtitle?`, `action?`, `className?`

Layout:
- Horizontal title/action; stacks under 768px.
- Uses heading font (`--font-heading`) and clamp sizing.

## 2.5 StateCard

Source:
- `frontend/src/components/common/StateCard/StateCard.jsx`
- `frontend/src/components/common/StateCard/StateCard.css`

API:
- `title?`, `message?`, `action?`, `icon?`
- `variant: 'neutral'|'error'` (default `'neutral'`)
- `className?`

Variant styling:
- `error` variant uses danger-tinted border and background.

## 2.6 ThemeToggle

Source:
- `frontend/src/components/common/ThemeToggle/ThemeToggle.jsx`
- `frontend/src/components/common/ThemeToggle/ThemeToggle.css`

Behavior:
- Fixed-position pill at bottom-right (always rendered via `frontend/src/core/App.jsx`).
- Hides label under 520px.

## 2.7 SafeImage

Source:
- `frontend/src/components/common/SafeImage/SafeImage.jsx`
- `frontend/src/components/common/SafeImage/SafeImage.css`
- Depends on `frontend/src/utils/mediaUrl.js`

Behavior:
- Resolves relative/backend media URLs.
- Falls back to placeholder on load error.
- Optional skeleton shimmer overlay when `showSkeleton`.

## 2.8 Global CSS Primitives (Non-React)

These are used as “design system building blocks” across many features:
- Layout primitives: `frontend/src/styles/layout.css` (`.page`, `.container`, `.card`, `.grid`, `.flex`, `.center`)
- Utility classes: `frontend/src/styles/utilities.css` (`.mt-sm`, `.mt-md`, `.mb-lg`, `.text-muted`, `.full-width`, etc.)
- Shared component primitives: `frontend/src/styles/components.css`
  - `.icon-button` (40×40 icon button)
  - `.badge-pill` (+ `--success|--warning|--danger`)
  - `.skeleton` base (parallel to common `Skeleton` component CSS)

---

# 3) 🧭 LAYOUT SYSTEM

## 3.1 Header (`components/layout/Header`)

Source:
- `frontend/src/components/layout/Header/Header.jsx`
- `frontend/src/components/layout/Header/Header.css`

Key specs:
- Height: 70px (desktop)
- Sticky: top 0, z-index 900
- Background: `--color-brand`, text `--text-on-accent`
- Desktop grid: `grid-template-columns: 1fr auto 1fr`

Sections:
- Left:
  - Brand link (`CP` mark + “Social Civic Platform” text)
  - Search form (navigates to `/issues?search=` on submit)
- Center:
  - Primary nav (Issues/Map/Dashboard/Workflow), role-aware targets
- Right:
  - Mobile “Menu” toggle (visible <980px)
  - Notifications icon button + `NotificationPanel` dropdown
  - Theme icon button (toggles theme)
  - Auth area:
    - Citizen-only “Report Issue” CTA (`/issues/create`)
    - Avatar menu (Profile, My Issues, Notifications, Logout)
    - Or: Login + Get Started (register) when logged out

Overlay dismissal:
- Closes menus on route change.
- Escape key and click-outside close open overlays.

Responsive:
- Under 980px:
  - Header becomes 2-column, auto height with padding.
  - Nav hidden by default, shown when `menuOpen`.
  - Brand text hidden.

## 3.2 Navbar (`components/layout/Navbar`) — Legacy / Unused

Source:
- `frontend/src/components/layout/Navbar/Navbar.jsx`
- `frontend/src/components/layout/Navbar/Navbar.css`

Status:
- Not imported elsewhere in `frontend/src/`.
- Uses 58px height (matches `.page` min-height math in `frontend/src/styles/layout.css`).

## 3.3 Layouts

### AppLayout
Source: `frontend/src/layouts/AppLayout/AppLayout.jsx`
- Renders `<Header />` and an `<Outlet />` inside `<main>`.

### MainLayout
Source:
- `frontend/src/layouts/MainLayout/MainLayout.jsx`
- `frontend/src/layouts/MainLayout/MainLayout.css`
Used for: `/issues`, `/issues/:id`, `/workflow`, `/map`

Spec:
- Column flex, `min-height: 100vh`
- Content padding: `var(--space-lg) 0`

### DashboardLayout
Source:
- `frontend/src/layouts/DashboardLayout/DashboardLayout.jsx`
- `frontend/src/layouts/DashboardLayout/DashboardLayout.css`
Used for: all authenticated dashboards + admin routes + `/issues/create`, `/profile`, `/notifications`, `/dashboard/map`

Spec:
- Main padding: 24px (16px under 980px)
- Overrides `.page` and `.container` inside dashboard to become full-width:
  - `.dashboard-main .page { min-height: auto; padding: 0; }`
  - `.dashboard-main .container { width: 100%; margin: 0; }`

---

# 4) 📦 DOMAIN COMPONENTS

## 4.1 Issues Domain (`frontend/src/components/issues/`)

### IssueCard
Source:
- `frontend/src/components/issues/IssueCard/IssueCard.jsx`
- `frontend/src/components/issues/IssueCard/IssueCard.css`

Card layout:
- Media: 150px tall cover image (`SafeImage`, skeleton optional)
- Category chip: mono, uppercase, icon letter + label
- Status/priority badges: uses `.badge-pill` variants
- Meta row: location, relative time, optional department
- Footer: vote (non-admin), comment count (if present), actions (delete + view details)

Interaction UX:
- Entire card is interactive: click + Enter/Space open details (`role="link"`, `tabIndex=0`).
- Vote UI stops propagation to prevent unwanted navigation.
- Delete confirms via `window.confirm(...)`.

Badge/status mapping (as implemented):
- Status pill:
  - Resolved flows → `badge-pill--success`
  - All other flows → `badge-pill--warning` (including “reported”)
- Priority pill:
  - Severity ≥ 4 → `badge-pill--danger`
  - Severity = 3 → `badge-pill--warning`

### StatusBadge
Source:
- `frontend/src/components/issues/StatusBadge/StatusBadge.jsx`
- `frontend/src/components/issues/StatusBadge/StatusBadge.css`

Behavior:
- Converts `status` to an uppercase label using `ISSUE_STATUS_LABELS` (`frontend/src/constants/issueStatus.js`).
- Applies class based on status bucket:
  - Pending: reported, rejected → warning tone
  - Progress: under_review/assigned/work_in_progress + volunteer/community in-progress → brand tone
  - Resolved: resolved/resolved_by_community/citizen_verified/closed → success tone

### WorkflowTimeline
Source:
- `frontend/src/components/issues/WorkflowTimeline/WorkflowTimeline.jsx`
- `frontend/src/components/issues/WorkflowTimeline/WorkflowTimeline.css`

Timeline structure:
- Ordered list of lifecycle steps, always inserting a “Citizen Verified” step after “Resolved”.
- Community flow labels re-map the displayed labels (Assigned → Volunteer Claimed, Work → Community Fix In Progress, Resolved → Resolved by Community).

Visual semantics:
- Done: check icon + success-tinted marker
- Current: brand-tinted marker + glow outline

### VoteButton
Source:
- `frontend/src/components/issues/VoteButton/VoteButton.jsx`
- `frontend/src/components/issues/VoteButton/VoteButton.css`

Vote interaction:
- Authenticated: toggle vote via API, optimistic UI via state updates.
- Unauthenticated: shows “Sign in to vote” CTA (navigates to `/login`).

Micro-interactions:
- Count bump on count changes (180ms scale).
- Loading spinner implemented via CSS `::after`.

### StatusTimeline (present, currently unused)
Source:
- `frontend/src/components/issues/StatusTimeline/StatusTimeline.jsx`
- `frontend/src/components/issues/StatusTimeline/StatusTimeline.css`

Notes:
- Not referenced by any page/component in `frontend/src/`.
- Uses hard-coded colors (`#007bff`, `#666`) rather than tokens.

## 4.2 Tasks Domain (`frontend/src/components/tasks/`)

### TaskCard
Source:
- `frontend/src/components/tasks/TaskCard/TaskCard.jsx`
- `frontend/src/components/tasks/TaskCard/TaskCard.css`

Layout:
- Header row: task title + status pill
- Detail list: worker ID, category, location
- Optional progress gallery grid (6 columns → 3 columns under 900px)
- Accept button only when `task.status === 'assigned'`

### TaskProgressUpload
Source:
- `frontend/src/components/tasks/TaskProgressUpload/TaskProgressUpload.jsx`
- `frontend/src/components/tasks/TaskProgressUpload/TaskProgressUpload.css`

Behavior:
- Validates image-only uploads, max 5 images per update.
- “Mark completed” enabled only when task status is accepted/in_progress.

## 4.3 Notifications Domain (`frontend/src/components/notifications/`)

### NotificationPanel
Source:
- `frontend/src/components/notifications/NotificationPanel/NotificationPanel.jsx`
- `frontend/src/components/notifications/NotificationPanel/NotificationPanel.css`

Behavior:
- Lazy fetch on open (`getNotifications({ limit: 20 })`).
- Unread count in header.
- Item actions: “Open issue” deep link and “Mark read”.
- Loading: skeleton rows; empty: “No notifications yet.”

## 4.4 Volunteer Domain (`frontend/src/components/volunteer/`)

### VolunteerPanel
Source:
- `frontend/src/components/volunteer/VolunteerPanel/VolunteerPanel.jsx`
- `frontend/src/components/volunteer/VolunteerPanel/VolunteerPanel.css`

Role gate:
- Renders only if `useRole().isVolunteer` and issue has `_id`.

Available actions:
- Claim → for reported/under_review
- Start/Confirm in progress → for volunteer_claimed/community_fix_in_progress
- Submit form link → for community_fix_in_progress

## 4.5 Map Domain (`frontend/src/components/map/`)

### IssueLeafletMap
Source: `frontend/src/components/map/IssueLeafletMap.jsx`

Modes:
- If `heatmapData` provided: render those points (size + opacity derived from weight).
- Else: render issue points.

Interaction:
- `onSelect` optional click handler per marker.
- `MapFocus` flies to active point (`flyTo`) when active selection changes.

---

# 5) 📄 PAGE-BY-PAGE UI SPEC (VERY IMPORTANT)

All page components live under `frontend/src/pages/`. Route wiring is in `frontend/src/core/AppRoutes.jsx`.

## 5.1 Route Map (Canonical)

| Route | Page component | Layout wrapper | Gate |
|---|---|---|---|
| `/` | `frontend/src/pages/Home/Home.jsx` | none | public |
| `/login` | `frontend/src/pages/Auth/Login.jsx` | none | public |
| `/register` | `frontend/src/pages/Auth/Register.jsx` | none | public |
| `/issues` | `frontend/src/pages/Issues/IssueList.jsx` | `MainLayout` | public (admin redirects to `/admin`) |
| `/issues/:id` | `frontend/src/pages/Issues/IssueDetails.jsx` | `MainLayout` | public |
| `/workflow` | `frontend/src/pages/CivicWorkflow/CivicWorkflow.jsx` | `MainLayout` | public |
| `/map` | `frontend/src/pages/Map/IssueMap.jsx` | `MainLayout` | public |
| `/dashboard` | `DashboardEntry` in routes | `DashboardLayout` | auth required |
| `/dashboard/volunteer` | `frontend/src/pages/Dashboard/VolunteerDashboard.jsx` | `DashboardLayout` | volunteer |
| `/dashboard/volunteer/submit/:id` | `frontend/src/pages/Volunteer/SubmitResolution.jsx` | `DashboardLayout` | volunteer |
| `/dashboard/officer` | `frontend/src/pages/Dashboard/OfficerDashboard.jsx` | `DashboardLayout` | officer |
| `/dashboard/officer/analytics` | `frontend/src/pages/Admin/Analytics.jsx` | `DashboardLayout` | officer |
| `/dashboard/worker` | `frontend/src/pages/Dashboard/WorkerDashboard.jsx` | `DashboardLayout` | worker |
| `/issues/create` | `frontend/src/pages/Issues/CreateIssue.jsx` | `DashboardLayout` | auth required (admin redirected in-page) |
| `/notifications` | `frontend/src/pages/Notifications/Notifications.jsx` | `DashboardLayout` | auth required |
| `/dashboard/map` | `frontend/src/pages/Map/IssueMap.jsx` | `DashboardLayout` | auth required |
| `/profile` | `frontend/src/pages/Profile/Profile.jsx` | `DashboardLayout` | auth required |
| `/admin` | `frontend/src/pages/Dashboard/AdminDashboard.jsx` | `DashboardLayout` | admin |
| `/admin/analytics` | `frontend/src/pages/Admin/Analytics.jsx` | `DashboardLayout` | admin |
| `/admin/manage-issues` | `frontend/src/pages/Admin/ManageIssues.jsx` | `DashboardLayout` | admin |
| `/admin/users` | `frontend/src/pages/Admin/UserManagement.jsx` | `DashboardLayout` | admin |

Role normalization and access:
- `frontend/src/utils/roleCheck.js` defines normalization and access sets (admin can access all).

Status transition constraints:
- `frontend/src/utils/statusFlow.js` defines allowed transitions and `canTransition(...)`.

## 5.2 Auth

### Login

Source:
- `frontend/src/pages/Auth/Login.jsx`
- `frontend/src/pages/Auth/Login.css`

Layout structure:
- Full viewport centered card (`.login-page` + `.login-card.card`)
- Absolute “Back to home” link (`.auth-back-home`)

Components used:
- `Button` (`frontend/src/components/common/Button/Button.jsx`)

UI elements:
- Email input (required, validated by regex)
- Password input + show/hide toggle (local state)
- Primary submit button (full width)

UX flow:
1. Validate email + password length (6–128).
2. Call `useAuth().login(...)` (`frontend/src/contexts/AuthContext.jsx`).
3. Normalize role and redirect:
   - admin → `/admin`
   - officer → `/dashboard/officer`
   - worker → `/dashboard/worker`
   - volunteer → `/dashboard/volunteer`
   - default → `location.state.from` or `/dashboard`

States:
- Submitting disables submit and changes label (“Signing in...”).
- Errors render inline in `.login-error` (danger surface).

### Register

Source:
- `frontend/src/pages/Auth/Register.jsx`
- `frontend/src/pages/Auth/Register.css`

Layout structure:
- Same centered-card pattern as Login (`.register-page` + `.register-card.card`)

UI elements:
- Full name, email, password, role select
- Role select is limited to citizen and volunteer (client-enforced).

UX flow:
1. Client validation:
   - Name 2–60 chars
   - Email regex
   - Password 6–128
   - Role in {citizen, volunteer}
2. Call `register(...)` API and navigate to `/login` on success.

States:
- Submitting disables button and changes label (“Creating Account...”).
- Errors render inline in `.register-error`.

## 5.3 Issues

### CreateIssue

Source:
- `frontend/src/pages/Issues/CreateIssue.jsx`
- `frontend/src/pages/Issues/CreateIssue.css`

Gate:
- Route requires auth (`ProtectedRoute`).
- Admin is redirected to `/admin` inside this page.

Layout structure:
- Wizard container `.report-wizard-page` (max width 760px centered)
- Step header + stepper + content card + action bar

Steps:
1. Category: grid of category buttons with active state
2. Location: click-to-set coordinates on a visual map panel; manual lat/lng; geolocation button; location text
3. Details: title; severity select; description; optional image upload
4. Review: key-value summary

UX flow:
1. User completes steps; “Continue” disabled unless `canMoveNext` is true.
2. Submit builds `FormData` and calls `createIssueApi(payload)`.
3. Navigate to `/issues/:id`.

States:
- Inline error banner `.create-issue-error`.
- Submitting disables nav buttons and changes label.

### IssueList

Source:
- `frontend/src/pages/Issues/IssueList.jsx`
- `frontend/src/pages/Issues/IssueList.css`

Layout structure:
- `.issues-page.page` → `.container`
- Header, toolbar (filters + CTA), optional search pill, then grid content.

Components used:
- `IssueCard`
- `Skeleton`

UI elements:
- Category/status/sort `<select>` filters
- “+ Report an Issue” CTA link (non-admin)
- Search pill appears when `?search=` param exists

UX flow:
1. Fetch issues from API based on filters + search query.
2. Render IssueCard grid.
3. Voting patches local state.
4. Delete (if permitted by IssueCard) removes from list.

States:
- Loading: 9 skeleton cards.
- Empty: dashed empty-state card with CTA.
- Error: `.issues-error` banner.

### IssueDetails

Source:
- `frontend/src/pages/Issues/IssueDetails.jsx`
- `frontend/src/pages/Issues/IssueDetails.css`

Layout structure:
- Back link to Issues (or Admin Dashboard if admin).
- Two-column grid (left content, right rail), collapses under 768px.

Components used:
- `SafeImage`, `StatusBadge`, `VoteButton`, `WorkflowTimeline`, `IssueLeafletMap`, `Skeleton`, `VolunteerPanel`

Primary UI elements:
- Hero image + status badge overlay
- Tag pills (category/status/priority/verified)
- Vote control (hidden for admins)
- Meta line (location + coords, date, reporter, department)
- Description
- Optional: map preview (if coordinates exist)
- Photo grids:
  - citizen “before” photos
  - worker progress photos
  - community proof photos
- Community resolution report text (if present)
- Comments:
  - Authenticated: can post, reply, like (local), edit/delete (if own comment or admin)

Right rail:
- Workflow timeline
- Assignments card
- Actions card (verify/reopen/close/delete depending on role + status transitions)
- Volunteer actions panel for volunteer users

States:
- Loading: skeleton page approximating left/right layout.
- Missing issue: simple `Issue not found.` text (not a StateCard).

## 5.4 Dashboard

### UserDashboard (Citizen/default) — `/dashboard`

Source:
- `frontend/src/pages/Dashboard/UserDashboard.jsx`
- `frontend/src/pages/Dashboard/UserDashboard.css`

Layout structure:
- `.dashboard-page.page` → `.container`
- Header row (`.dashboard-header`):
  - Left: `h1` + subtitle
  - Right: “+ New Report” link to `/issues/create`
- Optional error banner (`.issues-error`)
- Content zones:
  - Loading: skeleton cards grid (`.dashboard-skeleton-grid`)
  - Empty: `.issues-empty.card` + CTA
  - Stats: `.dashboard-stats-grid` (4 cards)
  - Issues: `.issues-wrapper` IssueCard grid

Components used:
- `IssueCard` (`frontend/src/components/issues/IssueCard/IssueCard.jsx`)
- `Skeleton` (`frontend/src/components/common/Skeleton/Skeleton.jsx`)
- Router `Link`

UI elements:
- Primary CTA: “+ New Report” (link)
- Stats cards: “Total / Active / In Progress / Resolved” (computed from issue statuses)
- Issue cards: support vote (unless admin), view, delete (when allowed)

UX flow:
1. Fetch issues via `getIssues()` and filter to `reportedBy === currentUser.id`.
2. Render stats derived from the filtered set.
3. Allow navigation into IssueDetails via IssueCard.
4. Allow vote interactions (IssueCard → VoteButton) and patch local state on callbacks.
5. Allow delete where permitted (IssueCard logic).

States:
- Loading: skeleton cards grid (6 cards).
- Empty: message + “Report your first issue” CTA.
- Error: `.issues-error` banner.

### VolunteerDashboard — `/dashboard/volunteer`

Source:
- `frontend/src/pages/Dashboard/VolunteerDashboard.jsx`
- Shared stylesheet: `frontend/src/pages/Dashboard/RoleDashboard.css`

Layout structure:
- `.role-dashboard.page` → `.container`
- Header (`.role-dashboard__header`): title + copy
- Optional error banner (`.issues-error`)
- Stats grid (`.role-dashboard__grid`): 4 stat cards
- Action panel card (`.role-dashboard__panel`):
  - Title “Volunteer Actions”
  - Loading/empty copy or a table with issue rows

Components used:
- Router `Link`
- Native `<button>` controls styled via `RoleDashboard.css`

UI elements:
- Table columns: Issue / Category / Status / Location / Actions
- Actions:
  - “Claim” button (enabled only for reported/under_review)
  - “Start Fix” button (enabled only for volunteer_claimed/community_fix_in_progress)
  - “Open Submit Form” link (only when community_fix_in_progress)

UX flow:
1. On mount: `getAvailableVolunteerIssues()`.
2. Volunteer claims issue → status updates in row.
3. Volunteer starts fix → status updates.
4. When eligible, volunteer navigates to submit form and uploads proof.

States:
- Loading: inline “Loading...” text.
- Empty: “No volunteer-eligible issues right now.”
- Error: `.issues-error` banner.

### SubmitResolution (Volunteer) — `/dashboard/volunteer/submit/:id`

Source:
- `frontend/src/pages/Volunteer/SubmitResolution.jsx`
- `frontend/src/pages/Volunteer/SubmitResolution.css`

Gate:
- Volunteer role required; non-volunteer redirects to `/dashboard`.

Layout structure:
- `.submit-resolution.page` → `.container`
- Back link (`.back-link`)
- Main card (`.submit-resolution__card.card`) containing:
  - Header row (`.submit-resolution__head`): H1 + issue title + status chip
  - Conditional notice banner when not eligible
  - Error banner (`.submit-resolution__error`)
  - Section blocks:
    - “Before Photos (Citizen Report)” grid
    - “After Photos” file input + helper text
    - “Community Resolution Report” textarea + min length helper
  - Actions row with “Submit Resolution” button

Components used:
- `Loader` (full screen during preload)
- `SafeImage` (image grid thumbnails)
- Router `Link`, `Navigate`

UI elements:
- File input:
  - Accepts images only (`accept="image/*"`)
  - Multi-select, max 5
  - Disabled unless issue status is `community_fix_in_progress`
- Textarea:
  - Disabled unless eligible
  - Min 10 chars (enforced on submit)

States:
- Loading: `Loader fullScreen`
- Not found: card with error copy

### OfficerDashboard — `/dashboard/officer`

Source:
- `frontend/src/pages/Dashboard/OfficerDashboard.jsx`
- Shared stylesheet: `frontend/src/pages/Dashboard/RoleDashboard.css`

UI structure:
- Header + officer profile card (ID/name/department)
- Error banner: `.issues-error`
- Stats grid by status buckets
- Issues table with per-row actions:
  - Review
  - Assign worker (select if directory available, else manual input)
  - Assign button
  - Status select constrained by `canTransition(...)`

Components used:
- Native `<select>`, `<input>`, `<button>` controls styled via `frontend/src/pages/Dashboard/RoleDashboard.css`.

UI elements (Actions column details):
- “Review” button: calls `reviewOfficerIssue(issueId)`.
- Worker assignment:
  - Preferred: worker directory `<select>` from `getOfficerWorkers()` (option labels include computed “Active” load when possible).
  - Fallback: manual worker-id `<input>` when the directory endpoint is unavailable.
- “Assign” button: disabled until a worker value is present.
- Status `<select>`: options are filtered to the current status and valid transitions only (`canTransition`).

States:
- Loading: table panel uses inline loading text (no skeletons on this page).
- Worker directory failure: UI continues with manual worker-id input (directory error stored internally).

### WorkerDashboard — `/dashboard/worker`

Source:
- `frontend/src/pages/Dashboard/WorkerDashboard.jsx`
- `frontend/src/pages/Dashboard/WorkerDashboard.css`

UI structure:
- Header + worker profile card (ID/name/department)
- Error banner uses local `.error` styling
- Loading: “Loading tasks...”
- Tasks grid with:
  - `TaskCard`
  - `TaskProgressUpload`

Components used:
- `TaskCard` (`frontend/src/components/tasks/TaskCard/TaskCard.jsx`)
- `TaskProgressUpload` (`frontend/src/components/tasks/TaskProgressUpload/TaskProgressUpload.jsx`)

UI elements:
- Each task card can expose:
  - “Accept Task” (only when `task.status === 'assigned'`)
  - File input + “Upload Progress Images”
  - “Mark Task Completed” (only for accepted/in_progress)

### AdminDashboard — `/admin`

Source:
- `frontend/src/pages/Dashboard/AdminDashboard.jsx`
- `frontend/src/pages/Dashboard/AdminDashboard.css`

UI structure:
- `PageHeader` + action links row
- Stats grid (4)
- Panels (chart-like bars + recent list)
- Management tables for officers and workers (search + sortable columns)

Components used:
- `PageHeader` (`frontend/src/components/common/PageHeader/PageHeader.jsx`)
- `Skeleton` for loading placeholders
- Native tables + sortable header buttons (`.admin-th-btn`)

UI elements:
- Action links (top): deep links into analytics/manage/users.
- Officer table:
  - Search input (`type="search"`)
  - Sortable columns via header buttons
  - Derived “Assigned issues” counts are computed from currently loaded issues.
- Worker table:
  - Search input
  - Sortable columns
  - “Assigned tasks” / “Completed tasks” approximated from issue dataset.

States:
- Loading uses skeletons for dashboards and tables.
- Empty results render table rows (“No officers found.”, “No workers found.”).

## 5.5 Admin

### Analytics — `/admin/analytics`

Source:
- `frontend/src/pages/Admin/Analytics.jsx`
- `frontend/src/pages/Admin/Analytics.css`

UI structure:
- Title + error banner
- Stats grid (4)
- Panels:
  - Resolution path distribution
  - Quality metrics
  - Category distribution
  - Resolved-by-department bar chart
  - Top heatmap coordinates list

Components used:
- `Loader` (`frontend/src/components/common/Loader/Loader.jsx`) for initial load.
- `react-chartjs-2` `<Bar />` chart for “Resolved Issues by Department”.

UI elements:
- Stat cards: show Total Active Issues, High Priority, Resolved by Community, Avg Support Score.
- Path distribution: 3 vertical bars sized by relative count (government/community/verification).
- Metric lists: key-value rows with bottom borders.

States:
- Loading: `Loader fullScreen`
- Errors: `.issues-error`

### ManageIssues — `/admin/manage-issues`

Source:
- `frontend/src/pages/Admin/ManageIssues.jsx`
- `frontend/src/pages/Admin/ManageIssues.css`

UI structure:
- `PageHeader` (title/subtitle)
- Error banner
- Loading: `Loader fullScreen`
- Empty state card
- List rows:
  - Status select (constrained transitions)
  - Embedded IssueCard

Components used:
- `PageHeader`
- `Loader`
- `IssueCard` (admin view hides voting internally)

UI elements:
- Per-row status `<select>`:
  - Options are filtered to current status + valid transitions only (`canTransition`).
- IssueCard provides navigation, delete (when permitted), and details link.

### UserManagement — `/admin/users`

Source:
- `frontend/src/pages/Admin/UserManagement.jsx`
- `frontend/src/pages/Admin/UserManagement.css`

UI structure:
- Header + create department inline controls
- Error banner
- Table card:
  - role select
  - approve/active toggles
  - department assignment select
  - delete user button

Components used:
- `Loader`
- Native table controls (`<select>`, `<button>`, `<input>`)

UX flow:
1. On mount: fetch users (limit 200) and departments.
2. Admin can:
   - Change role (select)
   - Toggle approval and active status (buttons)
   - Assign department (select)
   - Delete user (confirm + action)
3. Admin can create a new department via inline input + button.

States:
- Loading: `Loader fullScreen`
- Responsive: table scroll under 960px

## 5.6 Others

### Home — `/`

Source:
- `frontend/src/pages/Home/Home.jsx`
- `frontend/src/pages/Home/Home.css`

Notes:
- Home is a “marketing surface” with its own header/footer and page-scoped tokens (`--font-body`, `--font-display`, `--header-height`, etc.).
- It still reuses platform components (VoteButton, SafeImage, IssueLeafletMap) and routes into core app flows.

Layout structure (major sections in `Home.jsx`):
- `HomeHeader` (fixed header; glass effect)
- `HeroSection` (optionally includes scroll-driven globe animation frames from `frontend/globe images/`)
- `HowItWorksSection` (3-step explanation cards)
- `PriorityIssuesSection` (top issues by votes + filtering)
- `MapPreviewSection` (embedded Leaflet preview of issue points)
- `WhoAreYouSection` (role cards linking into platform entry points)
- `Footer` (multi-column link groups)

Components used (not exhaustive; highlights):
- `VoteButton` (`frontend/src/components/issues/VoteButton/VoteButton.jsx`)
- `IssueLeafletMap` (`frontend/src/components/map/IssueLeafletMap.jsx`)
- `SafeImage` (`frontend/src/components/common/SafeImage/SafeImage.jsx`)
- Router `Link`

States:
- Issues preview loading: local `issuesLoading` state drives skeleton-like placeholders (implemented in `Home.css`).

### IssueMap — `/map` and `/dashboard/map`

Source:
- `frontend/src/pages/Map/IssueMap.jsx`
- `frontend/src/pages/Map/IssueMap.css`

UI structure:
- Split card layout: sidebar (mode/filter/list) + canvas (Leaflet)
- Modes: Heatmap vs Issues
- Issues mode includes a floating preview card linking to Issue Details.

Components used:
- `IssueLeafletMap` (`frontend/src/components/map/IssueLeafletMap.jsx`)
- Router `Link`

UI elements:
- Mode toggle buttons (Heatmap / Issues)
- Issues-mode filters:
  - Category select
  - Status select
- Issues-mode list:
  - Buttons for selecting an active issue point
- Floating preview card:
  - Title + status pill + meta + “Open details” link

States:
- Heatmap loading: inline “Loading heatmap...”
- Issues loading: inline “Loading issues...”
- Error: `.issue-map-error` banner

### Notifications — `/notifications`

Source:
- `frontend/src/pages/Notifications/Notifications.jsx`
- `frontend/src/pages/Notifications/Notifications.css`

UI structure:
- Header + “Mark all as read”
- Error banner
- Empty card or list of notification cards

Components used:
- `Loader` (full screen while loading)
- Native `<button>` controls

UI elements:
- Header meta shows unread count from API response (`meta.unreadCount`).
- “Mark all as read” button triggers bulk read action.
- Each notification card:
  - Title, message, timestamp
  - “Mark read” (only if unread)

States:
- Loading: `Loader fullScreen`
- Empty: “No notifications yet.”

### Profile — `/profile`

Source:
- `frontend/src/pages/Profile/Profile.jsx`
- `frontend/src/pages/Profile/Profile.css`

UI structure:
- Header card with role-specific icon/accent
- Two panels: Role Overview + Account

Components used:
- Role icons from `frontend/src/assets/* icon.png`
- Uses `useRole()` to select role summary + accent

UI elements:
- Accent-driven avatar ring and top border (`--profile-accent`)
- Two-column info panels with key/value rows

States:
- No explicit loading state; depends on AuthContext being loaded by ProtectedRoute before route access.

### CivicWorkflow — `/workflow`

Source:
- `frontend/src/pages/CivicWorkflow/CivicWorkflow.jsx`
- `frontend/src/pages/CivicWorkflow/CivicWorkflow.css`
- Uses copy/data from `frontend/src/utils/civicMockData.js`

Layout structure:
- Hero card: title + overview paragraph
- Roles and responsibilities grid (from `civicRoleSummary`)
- Lifecycle paths grid (government vs community) from `lifecycle`
- “Key Platform Features” grid (static list in page)

---

# 6) 🔄 USER FLOWS (HIGH-PRIORITY)

Flows are derived from:
- Routes: `frontend/src/core/AppRoutes.jsx`
- Role logic: `frontend/src/utils/roleCheck.js`, `frontend/src/hooks/useRole.js`
- Status transitions: `frontend/src/utils/statusFlow.js`

## 6.1 Citizen Flow
1. Register (`/register`) → choose `citizen`
2. Login (`/login`) → redirect to `/dashboard`
3. Report Issue (`/issues/create`) → complete wizard → submit
4. Browse community issues (`/issues`) → filter/search
5. Vote on issues (VoteButton; auth required)
6. Track personal reports (`/dashboard`) → stats + cards
7. Verify resolution or reopen (IssueDetails right-rail Actions; reporter-only and transition-gated)

## 6.2 Volunteer Flow
1. Register as `volunteer` → login
2. Volunteer dashboard (`/dashboard/volunteer`)
3. Claim issue (reported/under_review → volunteer_claimed)
4. Start/confirm progress (volunteer_claimed → community_fix_in_progress)
5. Submit resolution report (`/dashboard/volunteer/submit/:id`) with after photos + report text
6. Citizen verifies (citizen_verified) → closure

## 6.3 Officer Flow
1. Login as officer → `/dashboard/officer`
2. Review issues (Review action)
3. Assign worker (directory select or manual input)
4. Update issue status via constrained select (only valid transitions)
5. Optional analytics view (`/dashboard/officer/analytics`)

## 6.4 Admin Flow
1. Login as admin → `/admin`
2. Monitor dashboard stats + officer/worker tables
3. Manage issues (`/admin/manage-issues`) → change statuses
4. Manage users/departments (`/admin/users`) → roles, approvals, activation, departments
5. Analytics (`/admin/analytics`)

## 6.5 Worker Flow
1. Login as worker → `/dashboard/worker`
2. View assigned tasks
3. Accept task (if status is `assigned`)
4. Upload progress images (max 5 per update)
5. Mark task completed (accepted/in_progress only)

---

# 7) 🧠 UX PATTERNS

## 7.1 Navigation
- In-app: sticky `Header` with primary nav, global search, notifications dropdown, avatar menu.
- Landing: Home uses its own fixed header and internal section pattern; still links into app routes.

## 7.2 Feedback (Loading / Progress)
- Fullscreen loader: `Loader fullScreen` used for gated loading and some pages.
- Skeletons: used for Issue list/details, Notification dropdown, Admin dashboard loading states.

## 7.3 Error handling
- Page-level errors often use `.issues-error` banner.
- Action-level errors frequently use `alert(...)` and `window.confirm(...)`.
- Error extraction is centralized in `frontend/src/api/utils.js` (`getErrorMessage`).

## 7.4 Form validation
- Login/Register/CreateIssue/SubmitResolution implement local validation (regex, lengths, max counts).
- `react-hook-form` and `yup` dependencies exist but are not currently used by page code under `frontend/src/pages/`.

## 7.5 Accessibility (current baseline)
- Global focus-visible ring in `frontend/src/styles/base.css`.
- Escape and click-outside dismissal for Header overlays.
- Reduced motion handling in `frontend/src/styles/base.css` and `VoteButton.css`.
- Keyboard open behavior implemented on IssueCard.

---

# 8) 📱 RESPONSIVENESS

Breakpoints used in CSS (unique set observed):
- `520`, `700`, `760`, `768`, `840`, `900`, `950`, `960`, `980`, `1000`, `1024`, `1100`, `1200` px

Core behaviors:
- Header collapses nav under 980px (Menu toggle).
- IssueDetails becomes single-column under 768px.
- IssueMap switches to stacked layout under 980px.
- Dashboard grids reduce columns progressively (980/1100/700 depending on page).
- Tables become horizontally scrollable on smaller widths (UserManagement under 960px).

---

# 9) 🎭 MICRO-INTERACTIONS

Token-driven patterns:
- Hover lift: `translateY(-1px/-2px)` across buttons/cards.
- Border brightening: `--border-color` → `--border-bright` on hover.

Component/page specifics:
- VoteButton: count bump + inline spinner during API calls.
- IssueCard: hover uses lift + slight scale (1.02) and stronger shadow.
- NotificationPanel: unread items get tinted background + border.
- Theme toggles: both header icon and floating pill have hover lift.
- Home: “fade-in-up” reveal transitions + optional scroll-driven globe animation.

---

# 10) 🚨 UI INCONSISTENCIES (IMPORTANT)

This section lists detectable mismatches in the current code (for awareness and future cleanup).

1. Header height vs `.page` min-height math mismatch
- Evidence: `frontend/src/components/layout/Header/Header.css` sets 70px header.
- Evidence: `frontend/src/styles/layout.css` uses `calc(100vh - 58px)` (legacy navbar height).
- Impact: subtle page height/scroll inconsistencies.

2. Multiple theme toggles rendered simultaneously
- Evidence: floating toggle in `frontend/src/core/App.jsx`.
- Evidence: header toggle in `frontend/src/components/layout/Header/Header.jsx`.
- Evidence: Home header also exposes theme toggling in `frontend/src/pages/Home/Home.jsx`.
- Impact: duplicated affordances and confusing UX.

3. Legacy Navbar exists but unused
- Evidence: `frontend/src/components/layout/Navbar/Navbar.jsx` not imported elsewhere.
- Impact: divergent styles and outdated assumptions linger.

4. Unused StatusTimeline component uses non-token colors
- Evidence: `frontend/src/components/issues/StatusTimeline/StatusTimeline.css` uses `#007bff` and `#666`.

5. IssueStatusSelect uses hard-coded colors (non-token, non-theme)
- Evidence: `frontend/src/components/forms/IssueForm/IssueStatusSelect.css` uses `#cbd5e1`, `#fff`, `#334155`.

6. Mixed error styling conventions
- Evidence: `.issues-error` (red fill) across many pages; WorkerDashboard uses a different `.error` style in `frontend/src/pages/Dashboard/WorkerDashboard.css`.

7. Encoding/mojibake in arrows/emojis
- Evidence: arrows/emojis appear as `â†` / `ðŸ…` sequences in several source files (e.g., `frontend/src/styles/components.css`, `frontend/src/pages/Issues/CreateIssue.jsx`).
- Impact: inconsistent icon rendering depending on tooling/encoding; confirm UTF-8 file encoding end-to-end.

---

# 11) 🧩 FINAL OUTPUT FORMAT

This file is intended to be the “production SaaS UI system” reference for:
- Designers: token palette, typography, spacing, component inventory
- Engineers: component APIs, class names, route-by-route structure, role gates, states

Traceability rule:
- Every section references the exact file(s) implementing the behavior/styling.
