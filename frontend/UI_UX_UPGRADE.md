# Civic UI/UX Upgrade Notes

This document describes the updated UI architecture, interaction patterns, and design-system primitives implemented in the frontend. Backend roles and status values remain unchanged (new endpoints like heatmap were added, but existing workflows remain compatible).

## Design System

### Tokens
- Source of truth: `src/styles/variables.css`
- Theme override (light): `src/styles/theme.css`

Core palette:
- Primary: `#00C8F8` (`--color-primary`)
- Secondary/Success: `#00E5A0` (`--color-secondary`, `--color-success`)
- Warning: `#FF7A35` (`--color-warning`)
- Danger: `#FF4560` (`--color-danger`)

Surfaces:
- Main background: `#060D1A` (`--bg-main`)
- Secondary background: `#0A1220` (`--bg-surface`)
- Card surface: `#0E1828` (`--bg-card`)
- Hover surface: `#152236` (`--bg-hover`)

Borders and text:
- Border: `#1C2B42` (`--border-color`)
- Primary text: `#DCE8F5` (`--text-primary`)
- Secondary text: `#7A92B0` (`--text-secondary`)
- Muted: `#3D5068` (`--text-muted`)

Accent gradient:
- `--gradient-accent: linear-gradient(135deg, #00C8F8, #48DBFF)`

Typography:
- Heading: Syne (`--font-heading`)
- Body: DM Sans (`--font-base`)
- Mono: JetBrains Mono (`--font-mono`)

Accessibility:
- Focus ring: `--focus-ring`
- Reduced motion support: `src/styles/base.css` respects `prefers-reduced-motion`

### Global primitives
- Shared primitives stylesheet: `src/styles/components.css`
- Includes `.icon-button`, `.badge-pill`, `.skeleton`

## Global Navigation

Component: `src/components/layout/Header/Header.jsx`
- Sticky header with:
  - Left: logo + global issue search (routes to `/issues?search=...`)
  - Center: primary nav (Issues, Map, Dashboard, Workflow)
  - Right: notifications dropdown, role-aware report CTA (citizen), avatar menu
- Mobile:
  - Menu toggle shows/hides center nav
- A11y:
  - Esc closes open menus and dropdowns
  - Click outside closes open menus and dropdowns

Notifications:
- Dropdown: `src/components/notifications/NotificationPanel/NotificationPanel.jsx`
- Shows title/message/time, unread indicator, "Open issue" when `notification.issue._id` exists, and mark-read action.

## Issue Surfaces

### IssueCard
Component: `src/components/issues/IssueCard/IssueCard.jsx`
- Whole card is keyboard- and click-navigable (Enter/Space), with explicit stop-propagation for interactive controls.
- Top row shows category identity plus status and priority badges.
- Footer includes vote, optional comment count if present, and primary "View details".

### Vote button micro-interaction
Component: `src/components/issues/VoteButton/VoteButton.jsx`
- Animated count bump on count changes.

### Issue Details
Page: `src/pages/Issues/IssueDetails.jsx`
- Two-column layout on desktop, stacked on mobile:
  - Left: images, title/priority/status, description, map preview, photos, comments.
  - Right: workflow timeline, assignment details, actions, volunteer panel.
- Skeleton loading replaces full-screen spinner for this page.

Workflow timeline:
- Component: `src/components/issues/WorkflowTimeline/WorkflowTimeline.jsx`
- Renders the core lifecycle (Reported -> Under Review -> Assigned -> Work -> Resolved -> Closed) and conditionally shows Citizen Verified.
- Completed stages show a check icon, current stage gets a glow treatment.

Comments (UI upgrade only):
- Avatar initials, timestamp, action bar.
- Reply composes `@Name` prefix without backend threading.
- Like is local-only (UI feedback) because backend does not support likes.
- Live character counter (max 1000).

## Map Experience

Page: `src/pages/Map/IssueMap.jsx`
- Adds a mode switch:
  - Heatmap mode uses public heatmap API
  - Issues mode fetches issues and renders markers
- Adds category/status filters in Issues mode.
- Marker click selects an issue and shows a floating preview card with quick "Open details".

Map rendering:
- `src/components/map/IssueLeafletMap.jsx` preserves issue metadata when rendering points.
- Embedded maps can disable scroll wheel zoom via `scrollWheelZoom={false}`.

## Loading Experience

Skeleton primitive:
- `src/components/common/Skeleton/Skeleton.jsx`
- Used for:
  - Issue list loading state
  - Issue details loading state
  - Notification dropdown loading state
  - Citizen dashboard loading state

## Next Iterations (No Backend Changes)
- Replace remaining full-screen loaders with skeleton states across Admin/Officer/Worker dashboards and table views.
- Optional command palette (Ctrl+K) to navigate to issues, dashboards, map, workflow and run quick filters.
- Optional marker clustering (requires adding a frontend-only Leaflet clustering dependency).
