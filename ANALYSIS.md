# Civic Social Platform — Docs Index & Notes

This file is a lightweight documentation index reflecting the current repository structure.

## Quick links

- Backend API reference: `Backend/docs/api.md`
- Frontend setup: `frontend/README.md`
- Frontend UI/UX notes: `frontend/UI_UX_UPGRADE.md`

## Repository layout

- `Backend/` – Express + MongoDB API server (auth, issues, votes, comments, notifications, tasks, analytics, heatmap)
- `frontend/` – React + Vite app + Storybook
- `test-server/` – legacy/dev server (do not deploy)

## Roles (high level)

- `citizen` – reports issues, verifies resolution
- `volunteer` – claims issues and submits community fixes
- `officer` – reviews and assigns work within a department
- `worker` – executes tasks assigned by officers
- `admin` – global management (users, departments, analytics)

## Environment variables (common)

- Backend: see `Backend/.env.example`
- Frontend: `VITE_API_URL` (example: `http://localhost:5000/api`)
