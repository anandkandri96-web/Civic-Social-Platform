# Civic Social Platform

Full-stack civic issue reporting and workflow platform.

## Documentation

- Backend API reference: `Backend/docs/api.md`
- Frontend UI/UX notes: `frontend/UI_UX_UPGRADE.md`

## Quick start (local)

### Backend

From `Backend/`:

1. Create env: copy `Backend/.env.example` to `Backend/.env`
2. Install deps: `npm install`
3. Run: `npm run dev`

Health check: `GET http://localhost:5000/health`

### Frontend

From `frontend/`:

1. Install deps: `npm install`
2. Create `frontend/.env` with:

   ```
   VITE_API_URL=http://localhost:5000/api
   ```

3. Run: `npm run dev`

## Notes

- Temp binary artifacts are ignored via `.gitignore` (`tmp_asset*.bin`).
- `test-server/` exists for legacy/dev experiments; prefer `Backend/` for real workflows.
