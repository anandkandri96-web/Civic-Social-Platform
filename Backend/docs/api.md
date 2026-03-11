# Civic Backend API

Default dev base URL: `http://localhost:5000/api`

Auth header for protected routes:

```
Authorization: Bearer <jwt_token>
```

## Environment Setup

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Set at minimum: `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL`.
3. Start backend from `Backend` directory:
   - `npm run dev` (development)
   - `npm start` (production mode run)

## Initial DB Setup Order

Run these from the `Backend` directory:

1. `npm run seed`
   - Creates default departments and admin user if missing.
2. `npm run backfill:users`
   - Aligns existing users to latest schema (`isApproved`, department assignment for officer/worker).
3. `npm run seed:mock` (optional)
   - Imports frontend mock data into MongoDB.

## Auth

- `POST /auth/register`
  - body: `{ "name": "John", "email": "john@example.com", "password": "secret123", "role": "citizen|volunteer" }`
- `POST /auth/login`
  - body: `{ "email": "john@example.com", "password": "secret123" }`
- `GET /auth/me` (protected)
- `PATCH /auth/me` (protected)
  - body: `{ "name"?: "New Name", "email"?: "new@email.com", "password"?: "NewPassword123" }`

## Issues

- `GET /issues`
  - query: `category`, `status`, `search`, `lat`, `lng`, `radius`, `sort`
  - sort values (when not using `lat/lng`): `priority` (default), `newest`, `most_supported`
- `GET /issues/nearby`
  - query: `lat`, `lng`, `radius`
- `GET /issues/:id`
- `POST /issues` (protected)
  - multipart/file: `image`
  - body fields: `title`, `description`, `category`, `severity`, `lat`, `lng`, `locationText`
- `PATCH /issues/:id` (reporting citizen, before assignment)
  - body: any of `title`, `description`, `category`, `severity`, `lat`, `lng`, `locationText`, `images`
- `PATCH /issues/:id/status` (admin)
  - body: `{ "status": "under_review|assigned_to_department|work_in_progress|resolved|citizen_verified|closed|volunteer_claimed|community_fix_in_progress|resolved_by_community|rejected|reported" }`
- `PATCH /issues/:id/verify` (reporting citizen)
- `PATCH /issues/:id/reopen` (reporting citizen)
- `PATCH /issues/:id/close` (admin/officer)
  - note: requires `citizen_verified` status
- `DELETE /issues/:id` (admin or issue owner in reported state)

## Votes

- `GET /votes/:issueId` (protected)
- `POST /votes/:issueId` (protected)
- `DELETE /votes/:issueId` (protected)

## Comments

- `GET /comments/:issueId`
- `POST /comments/:issueId` (protected)
  - body: `{ "message": "text", "images": ["url1"] }`
- `PATCH /comments/single/:id` (owner)
  - body: `{ "message": "updated text" }`
- `DELETE /comments/single/:id` (owner/admin)

## Volunteer Workflow

- `GET /volunteer/issues/available` (volunteer)
- `POST /volunteer/issues/:issueId/claim` (volunteer)
- `PATCH /volunteer/issues/:issueId/progress` (volunteer claimant)
- `PATCH /volunteer/issues/:issueId/resolve` (volunteer claimant)
  - multipart/files: `proofImages` (after-fix photos)
  - body: `{ "reportText": "text", "proof"?: ["url1"] }`

## Officer Workflow

- `GET /officer/issues` (officer/admin)
  - query: `departmentId` (optional)
  - note: officer role is restricted to own department scope
- `GET /officer/workers` (officer/admin)
  - query: `departmentId` (optional, admin only)
  - response: list of active workers (optionally includes `activeTasks` count)
- `PATCH /officer/issues/:issueId/review` (officer/admin)
- `PATCH /officer/issues/:issueId/assign-worker` (officer/admin)
  - body: `{ "workerId": "<user_id>" }`
- `PATCH /officer/issues/:issueId/status` (officer/admin)
  - body: `{ "status": "<next_valid_status>" }`

## Tasks (Worker/Officer/Admin)

- `GET /tasks/my` (worker)
- `POST /tasks` (officer/admin)
  - body: `{ "issueId": "<issue_id>", "workerId": "<user_id>" }`
- `PATCH /tasks/:id/status` (worker)
  - body: `{ "status": "assigned|accepted|in_progress|completed|complication_reported" }`
- `POST /tasks/:id/progress` (worker)
  - multipart/files: `progressImages`
  - body: `{ "completionReport"?: "", "complicationReport"?: "" }`

## Admin

- `GET /admin/stats` (admin)
- `GET /admin/issues` (admin)
  - query: `page`, `limit`, `status`, `category`, `sort`
- `GET /admin/users` (admin)
  - query: `page`, `limit`, `role`, `isActive`, `isApproved`, `departmentId`
- `POST /admin/users` (admin)
  - body: `{ "name": "", "email": "", "password": "", "role": "citizen|volunteer|officer|worker|admin", "departmentId"?: "", "isApproved"?: true }`
- `PATCH /admin/users/:id/role` (admin)
  - body: `{ "role": "..." }`
- `PATCH /admin/users/:id/status` (admin)
  - body: `{ "isActive": true }`
- `PATCH /admin/users/:id/approve` (admin)
  - body: `{ "isApproved": true }`
- `PATCH /admin/users/:id/department` (admin)
  - body: `{ "departmentId": "" }`
- `DELETE /admin/users/:id` (admin)
- `GET /admin/departments` (admin)
- `POST /admin/departments` (admin)
  - body: `{ "name": "", "description": "", "categories": ["roads"], "coverageArea"?: { "type": "Polygon", "coordinates": [[[77.0,12.0],[77.1,12.0],[77.1,12.1],[77.0,12.1],[77.0,12.0]]] } }`

## Analytics

- `GET /analytics/trends` (admin/officer)
  - query: `from`, `to`

## Heatmap

- `GET /heatmap` (public)
  - response: `[{ "lat": 12.9716, "lng": 77.5946, "count": 12 }]`
- `GET /admin/analytics/heatmap` (admin/officer)

## Departments (Admin)

- `GET /departments` (admin)
- `POST /departments` (admin)
  - body: `{ "name": "", "description"?: "", "categories"?: ["roads"], "coverageArea"?: { "type": "Polygon", "coordinates": [[[77.0,12.0],[77.1,12.0],[77.1,12.1],[77.0,12.1],[77.0,12.0]]] } }`
- `PUT /departments/:id` (admin)
- `DELETE /departments/:id` (admin)

## Images

- `GET /images/:id` (public)
  - note: streams stored image assets (used by issues, comments, tasks)

## Notifications

- `GET /notifications` (protected)
  - query: `page`, `limit`, `unreadOnly`
- `PATCH /notifications/:id/read` (protected)
- `PATCH /notifications/read-all` (protected)

## Health

- `GET /health`

## Seed

- script: `npm run seed`
- script: `npm run seed:mock`
- script: `npm run backfill:users`
- env: `MONGO_URI`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
