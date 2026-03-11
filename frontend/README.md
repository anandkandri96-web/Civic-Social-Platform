# Civic Social Platform (Frontend)

React + Vite frontend for the Civic Social Platform.

## Prerequisites

- Node.js (LTS recommended)
- Backend running locally (see `Backend/docs/api.md`)

## Setup

From the `frontend` directory:

1. Install deps:
   - `npm install`
2. Create `frontend/.env` with:

   ```
   VITE_API_URL=http://localhost:5000/api
   ```

3. Run dev server:
   - `npm run dev`

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview the production build
- `npm run storybook` – Storybook dev server (stories live in `frontend/stories/`)
- `npm run build-storybook` – build Storybook static output

## Project notes

- API client: `src/api/axios.js` (adds `Authorization: Bearer <token>` automatically when token exists)
- Routes: `src/core/AppRoutes.jsx`
- Design tokens + shared primitives: `src/styles/variables.css`, `src/styles/components.css`
- UI/UX upgrade notes: `UI_UX_UPGRADE.md`
