# Civic Social Platform – Analysis Report

## Summary

This report lists **bugs**, **security issues**, and **bad practices** across Backend, Frontend, and test-server, with suggested corrections and reasons.

---

## 1. CRITICAL BUGS

### Backend

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| **Missing `apiResponse`** | `utils/apiResponse.js` | Controllers use `apiResponse(res, statusCode, message, data)` but the file only exports `success` and `error`. `issue.controller.js` and `admin.controller.js` will throw at runtime. | Export `apiResponse` (and optionally `errorResponse`) from `apiResponse.js`, or replace all `apiResponse` usages with `success`/`error`. |
| **Wrong model require paths** | `auth.middleware.js`, `auth.controller.js`, `issue.controller.js`, `admin.controller.js` | They use `require("../models/User")` and `require("../models/Issue")` while filenames are `user.js` and `issue.js`. Works on Windows (case-insensitive) but fails on Linux. | Use `require("../models/user")` and `require("../models/issue")`. |
| **Auth middleware used as single function** | `routes/issue.routes.js` | Code does `const auth = require("../middlewares/auth.middleware"); router.post("/", auth, createIssue);` but the middleware exports `{ protect, checkRole }`. `auth` is an object, not a function, so Express will break. | Use `const { protect } = require("../middlewares/auth.middleware");` and `router.post("/", protect, createIssue);`. |
| **Admin route calls non-existent controller** | `routes/admin.routes.js` | Route uses `updateIssueStatus` but `admin.controller.js` only exports `getStats` and `getAllIssues`. Server will crash when hitting that route. | Either add `updateIssueStatus` in admin controller (e.g. delegating to issue controller) or change the route to use the issue route for status updates and expose only `getStats` / `getAllIssues` here. |
| **Issue routes incomplete** | `routes/issue.routes.js` | Only `GET /` and `POST /` are defined. There is no `GET /:id`, `PATCH /:id/status`, or `DELETE /:id`, so get-by-id, update status, and delete are unavailable. | Add routes for get-one, update status (admin), and delete (admin), with `protect` and `checkRole` where needed. |

### Frontend

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| **Login not in AuthContext** | `contexts/AuthContext.jsx`, `pages/auth/Login.jsx` | Login page uses `const { login } = useAuth()` but `AuthContext` only provides `user`, `setUser`, `logout`, `loading`, `isAuthenticated`. No `login` → runtime error. | Add a `login` function in `AuthContext` that calls `auth.api` login, stores token, decodes JWT, and calls `setUser`. |
| **Login sends `username`, backend expects `email`** | `pages/auth/Login.jsx`, Backend auth | Form uses `username`; backend expects `email`. Login request will send wrong field and auth will fail. | Use `email` in the login form and send `{ email, password }` to the API. |
| **Register sends `username`, backend expects `email`** | `pages/auth/Register.jsx`, Backend auth | Register sends `name`, `username`, `password`. User model requires `email`. Registration will fail (validation error). | Use `email` instead of `username` in the form and in the payload. |
| **Backend register returns full user (password risk)** | `controllers/auth.controller.js` | `res.status(201).json(user)` returns the full Mongoose document. Even with `select: false` on password, other sensitive fields and future changes could leak. | Return a safe payload: `{ id, name, email, role }` (and token). Never send `user` document as-is. |
| **Role check fails for admin** | `utils/roleCheck.js`, `utils/constants.js` | `hasRole` uses keys like `ROLES.ADMIN` ("ADMIN"). AuthContext sets `user.role` to `decoded.role.toLowerCase()` ("admin"). So `hierarchy["admin"]` is undefined and admin routes fail. | Use consistent casing: e.g. normalize both to lowercase in `hasRole`, or define hierarchy with lowercase keys. |
| **IssueDetails expects wrong response shape** | `pages/issues/IssueDetails.jsx`, `api/issues.api.js` | `getIssueById` returns `res.data`. If backend uses `apiResponse`, body is `{ success, message, data }`. Code does `setIssue(res.data)` so `issue.title` etc. are wrong. | Have `getIssueById` return `res.data?.data ?? res.data` and in IssueDetails use that (e.g. `setIssue(data)` where `data` is the issue object). |
| **ManageIssues page has no component** | `pages/admin/ManageIssues.jsx` | Entire component is commented out and there is no default export. Lazy-loaded route will receive `undefined` and crash. | Uncomment and fix the component, or export a minimal placeholder (e.g. "Manage Issues – coming soon") until the full implementation is ready. |

---

## 2. SECURITY ISSUES

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| **Privilege escalation on register** | `controllers/auth.controller.js` | `User.create(req.body)` allows clients to send any field, e.g. `role: "admin"`. Anyone can register as admin. | Accept only allowlisted fields (e.g. `name`, `email`, `password`) and set `role` server-side (e.g. default "user"). |
| **No input validation on auth** | `controllers/auth.controller.js` | No validation for email format, password length, or name. Enables bad data and weak passwords. | Use Joi/express-validator and enforce email format, min password length (e.g. 8), and max lengths. |
| **User enumeration on login** | `controllers/auth.controller.js` | Returns "User not found" (404) vs "Invalid credentials" (401). Attacker can infer whether an email exists. | Use the same message and status (e.g. 401 "Invalid email or password") for both cases. |
| **CORS wide open** | `app.js` | `app.use(cors())` allows any origin. In production this can expose APIs to arbitrary sites. | Restrict origin, e.g. `cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true })`. |
| **No Helmet** | `app.js` | Security headers (X-Content-Type-Options, etc.) are not set. | Use `helmet()` (already in package.json). |
| **No rate limiting** | `app.js` | Auth and API are not rate-limited; vulnerable to brute-force and abuse. | Enable `express-rate-limit` (e.g. strict on `/api/auth/login`, global limit on `/api`). |
| **Secrets in repo** | `test-server/server.js`, Backend `.env` | test-server has `JWT_SECRET = 'supersecretkey'` and `MONGO_URI` in code. Backend `.env` (if committed) exposes `JWT_SECRET` and DB URL. | Use env vars only; add `.env` to `.gitignore`; provide `.env.example` without real secrets. |
| **Weak JWT secret** | Backend `.env` | `JWT_SECRET=your_secret` is guessable. | Use a long, random secret (e.g. 32+ chars) and never commit it. |
| **JWT in localStorage** | Frontend `axios.js`, `AuthContext.jsx` | Token in localStorage is vulnerable to XSS. | Prefer httpOnly cookies for tokens, or document the XSS risk and harden the app (CSP, sanitization). |

---

## 3. BAD PRACTICES

| Issue | Location | Problem | Fix |
|-------|----------|---------|-----|
| **Inconsistent API response shape** | Backend controllers vs `apiResponse.js` | Some code expects `{ success, message, data }`; current helper only exposes `success`/`error` with a different shape. | Standardize on one response helper and use it everywhere. |
| **No request body size limit** | `app.js` | `express.json()` has no limit; large payloads can cause DoS. | Use `express.json({ limit: '1mb' })` (or similar). |
| **Error handler leaks details** | `middlewares/error.middleware.js` | Returns `err.message` to client. In production this can expose stack traces or internal messages. | In production, return a generic message; log full error server-side only. |
| **MongoDB injection risk** | `getIssues` (issue.controller) | `req.query` is passed to filters; if ever used in `$where` or raw queries, could be dangerous. | Only use allowlisted, validated query params; avoid dynamic operator injection. |
| **CreateIssue form not wired to API** | `pages/issues/CreateIssue.jsx` | Form state and categories/severities don’t match backend (e.g. backend expects ROADS, GARBAGE, etc.; frontend has different list). Submit only logs to console. | Align categories/severity with backend enums; send `lat`/`lng` (and optionally images); call `createIssue` API on submit. |
| **IssuesList is static** | `pages/issues/IssuesList.jsx` | No API call; hardcoded cards. | Fetch issues with `getIssues()` and map response to list/cards. |
| **Duplicate / dead code** | Throughout | Large blocks of commented code (e.g. app.js, auth.controller, routes). | Remove or move to docs; keep one active version to avoid confusion. |

---

## 4. RECOMMENDED FIX ORDER

1. **Backend:** Export `apiResponse` (or switch to `success`/`error`) and fix model requires (`user`, `issue`).
2. **Backend:** Fix issue and admin routes: use `protect` (and `checkRole` where needed), add missing routes, align admin route with existing controller exports.
3. **Backend:** Harden auth: allowlist register body, same message for login failure, add validation, add rate limit and CORS/Helmet.
4. **Frontend:** Add `login` to AuthContext; use `email` (not `username`) for login and register; fix roleCheck casing; fix IssueDetails response shape; fix or stub ManageIssues export.
5. **General:** Add `.env.example`, ensure `.env` is gitignored, use strong JWT secret and env-based config everywhere.

---

## 5. TEST-SERVER NOTES

- test-server is a minimal standalone API (auth + issues) with **hardcoded secrets** and **no auth middleware** on issue routes. Use only for local dev; do not deploy. Prefer the main Backend for real use and tests.
