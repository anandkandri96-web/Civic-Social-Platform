# RBAC REFACTORING IMPLEMENTATION GUIDE

## 🎯 Overview

This guide walks through implementing the new centralized permission-based RBAC system. The refactoring includes:

1. **Shared Permission Configuration** - Single source of truth for roles & permissions
2. **Backend Permission Middleware** - Enforces authorization at API layer
3. **Frontend Permission Hooks & Components** - Clean, permission-based UI
4. **Secure Role Assignment** - Users cannot self-assign elevated roles
5. **Resource-Level Permissions** - Fine-grained authorization

---

## 📦 FILES CREATED/MODIFIED

### Created Files

```
Backend/
  ├── config/permissions.config.js          ✅ NEW - Centralized permissions
  └── middlewares/permission.middleware.js   ✅ NEW - Permission-based auth

frontend/src/
  ├── utils/permissions.config.js           ✅ NEW - Same config as backend
  ├── hooks/usePermission.js                 ✅ NEW - Permission checking hook
  └── components/auth/PermissionGate.jsx    ✅ NEW - Conditional rendering

```

### Modified Files

```
Backend/
  ├── controllers/auth.controller.js           ✏️  UPDATE - Secure registration
  ├── routes/admin.routes.js                   ✏️  UPDATE - Use permission middleware
  ├── routes/officer.routes.js                 ✏️  UPDATE - Use permission middleware
  └── routes/volunteer.routes.js               ✏️  UPDATE - Use permission middleware

frontend/src/
  ├── components/auth/ProtectedRoute.jsx      ✏️  UPDATE - Support permissions
  ├── hooks/useRole.js                         ✏️  SIMPLIFY - Remove auth logic
  └── components/layout/Header/Header.jsx     ✏️  REFACTOR - Use usePermission
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Copy Permission Configs (✅ DONE)

Both `permissions.config.js` files have been created:
- **Backend:** `/Backend/config/permissions.config.js`
- **Frontend:** `/frontend/src/utils/permissions.config.js`

These files are identical and serve as the single source of truth for:
- Role definitions
- Permission definitions
- Role-to-Permission mappings
- Resource-level permission functions

### Step 2: Add Permission Middleware (✅ DONE)

File: `/Backend/middlewares/permission.middleware.js`

Provides these middleware functions:

```javascript
// Single permission check
router.delete('/issues/:id', protect, canPerform('issue:delete'), handler);

// Multiple permissions (ALL required)
router.post('/admin', protect, canPerformAll(['admin:manage_users', 'admin:view_analytics']), handler);

// Multiple permissions (ANY required)
router.get('/data', protect, canPerformAny(['admin:view_all_issues', 'officer:view_queue']), handler);

// Resource-level check (fine-grained)
router.delete('/issues/:id', protect, canPerformResourceAction('ISSUE', 'DELETE'), handler);
```

### Step 3: Update Auth Controller

**File:** `Backend/controllers/auth.controller.js`

**Key Changes:**

1. **Registration endpoint** - FORCE new users to `citizen` role
2. **New endpoint** - `assignRoleAdmin` for admin to assign roles

```javascript
// Registration - forces citizen role
exports.register = async (req, res) => {
  // ...
  const role = ROLES.CITIZEN;  // ← Always force citizen
  // ...
};

// Admin role assignment - secure endpoint
router.patch('/admin/users/:id/role', 
  protect,
  canPerform(PERMISSIONS.ADMIN_CHANGE_ROLE),
  updateUserRoleAdmin);
```

### Step 4: Update Backend Routes

Apply permission middleware to all route handlers:

**File:** `Backend/routes/admin.routes.js`

```javascript
const { canPerform } = require('../middlewares/permission.middleware');
const { PERMISSIONS } = require('../config/permissions.config');

// Before: checkRole only
router.get('/stats', protect, checkRole(['admin']), getStats);

// After: permission-based
router.get('/stats', protect, canPerform(PERMISSIONS.ADMIN_VIEW_ANALYTICS), getStats);
router.get('/users', protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), getUsers);
router.patch('/users/:id/role', protect, canPerform(PERMISSIONS.ADMIN_CHANGE_ROLE), updateUserRole);
```

Do this for:
- `admin.routes.js`
- `officer.routes.js`
- `volunteer.routes.js`
- `task.routes.js`

### Step 5: Create Frontend Hooks (✅ DONE)

**File:** `frontend/src/hooks/usePermission.js`

Usage in components:

```javascript
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS } from '../utils/permissions.config';

function MyComponent() {
  const { can, canPerformAny, canPerformResourceAction } = usePermission();

  if (can(PERMISSIONS.ISSUE_DELETE)) {
    return <DeleteButton />;
  }

  if (canPerformAny([PERMISSIONS.ADMIN_MANAGE_USERS, PERMISSIONS.OFFICER_REVIEW_ISSUE])) {
    return <ControlPanel />;
  }

  return <div>No permission</div>;
}
```

### Step 6: Create Permission Gate Component (✅ DONE)

**File:** `frontend/src/components/auth/PermissionGate.jsx`

Replaces complex conditional rendering:

```javascript
// Before: Scattered logic
{isAdmin || isOfficer ? (
  <div>
    {isAdmin && <AdminPanel />}
    {isOfficer && <OfficerPanel />}
  </div>
) : null}

// After: Clean and explicit
<PermissionGate canAny={[PERMISSIONS.ADMIN_MANAGE_USERS, PERMISSIONS.OFFICER_REVIEW_ISSUE]}>
  <ControlPanel />
</PermissionGate>
```

### Step 7: Update ProtectedRoute (✅ DONE)

**File:** `frontend/src/components/auth/ProtectedRoute.jsx`

Now supports both roles (backward compatible) and permissions (recommended):

```javascript
// Role-based (old approach)
<Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />

// Permission-based (new approach - RECOMMENDED)
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_MANAGE_USERS}>
      <Admin />
    </ProtectedRoute>
  } 
/>
```

### Step 8: Refactor Components

Gradually replace hardcoded role checks with permission checks.

**Example: Header Navigation**

```javascript
// Before
const { isCitizen, isAdmin, isOfficer } = useRole();

const navLinks = useMemo(() => {
  const issuesTarget = isAdmin ? '/admin/manage-issues' : '/issues';
  // ...
}, [isAdmin]);

// After
const { can } = usePermission();
const { dashboardPath } = useRole();

const navLinks = useMemo(() => {
  const base = [
    { to: '/issues', label: 'Issues' },
    { to: '/map', label: 'Map' },
  ];

  if (can(PERMISSIONS.ADMIN_VIEW_ALL_ISSUES)) {
    base.push({ to: '/admin/manage-issues', label: 'Admin' });
  }

  return base;
}, [can]);
```

---

## ✅ MIGRATION CHECKLIST

### Phase 1: Foundation (Deploy First)

- [ ] Copy `permissions.config.js` to both frontend & backend
- [ ] Add `permission.middleware.js` to backend
- [ ] Update `auth.controller.js` register endpoint (force citizen role)
- [ ] Test registration - verify new users are always 'citizen'

### Phase 2: Backend Authorization

- [ ] Update `admin.routes.js` with permission middleware
- [ ] Update `officer.routes.js` with permission middleware
- [ ] Update `volunteer.routes.js` with permission middleware
- [ ] Update `task.routes.js` with permission middleware
- [ ] Test all endpoints with different roles
- [ ] Verify 403 Forbidden for unauthorized access

### Phase 3: Frontend Hooks

- [ ] Create `usePermission.js` hook (✅ DONE)
- [ ] Create `PermissionGate.jsx` component (✅ DONE)
- [ ] Update `ProtectedRoute.jsx` (✅ DONE)
- [ ] Test permission checks in browser console

### Phase 4: Component Refactoring

- [ ] Refactor `Header.jsx` - use usePermission
- [ ] Refactor `IssueDetails.jsx` - use PermissionGate
- [ ] Refactor `IssueList.jsx` - remove isAdmin checks
- [ ] Refactor `OfficerDashboard.jsx` - use permissions
- [ ] Refactor `VolunteerPanel.jsx` - use permissions
- [ ] Remove all hardcoded `isAdmin ||`, `isOfficer` checks

### Phase 5: Testing & Verification

- [ ] Test citizen role - can only report/vote/comment
- [ ] Test volunteer role - can claim & resolve issues
- [ ] Test officer role - can review & assign to workers
- [ ] Test worker role - can accept & complete tasks
- [ ] Test admin role - can access everything
- [ ] Verify backend rejects unauthorized requests (403)
- [ ] Verify UI doesn't show disabled features

---

## 🧪 TESTING GUIDE

### Backend Authorization Tests

```javascript
// Test 1: Citizen cannot access admin endpoint
curl -H "Authorization: Bearer $CITIZEN_TOKEN" \
  https://api.civic.local/api/admin/users
// Expected: 403 Forbidden

// Test 2: Officer cannot access admin endpoint
curl -H "Authorization: Bearer $OFFICER_TOKEN" \
  https://api.civic.local/api/admin/users
// Expected: 403 Forbidden

// Test 3: Admin can access admin endpoint
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.civic.local/api/admin/users
// Expected: 200 OK

// Test 4: Resource-level permission - Officer cannot close other dept issues
curl -H "Authorization: Bearer $OFFICER_TOKEN" \
  -X PATCH https://api.civic.local/api/issues/123/status \
  -d '{"status": "closed"}'
// Expected: 403 if issue not in officer's department
```

### Frontend Permission Tests

```javascript
// Test 1: Permission check in component
import { usePermission } from './hooks/usePermission';
import { PERMISSIONS } from './utils/permissions.config';

function TestComponent() {
  const { can } = usePermission();
  
  return (
    <div>
      {can(PERMISSIONS.ISSUE_DELETE) ? 'Can Delete' : 'Cannot Delete'}
      {can(PERMISSIONS.ADMIN_MANAGE_USERS) ? 'Can Manage Users' : 'Cannot Manage'}
    </div>
  );
}

// Test 2: PermissionGate component
<PermissionGate can={PERMISSIONS.ADMIN_MANAGE_USERS} fallback={<p>No access</p>}>
  <AdminPanel />
</PermissionGate>

// Test 3: Resource-level permission
const { canPerformResourceAction } = usePermission();
const issue = { _id: '123', reportedBy: 'citizen1', status: 'reported' };
console.log(canPerformResourceAction(issue, 'DELETE', 'ISSUE')); // true if citizen1
```

---

## 📋 QUICK REFERENCE

### Adding A New Permission

1. **Define in `permissions.config.js`**:
   ```javascript
   export const PERMISSIONS = {
     // ...
     NEW_FEATURE_ACTION: 'feature:action',
   };
   ```

2. **Map to role**:
   ```javascript
   export const ROLE_PERMISSIONS = {
     [ROLES.OFFICER]: new Set([
       // ...
       PERMISSIONS.NEW_FEATURE_ACTION,
     ]),
   };
   ```

3. **Protect backend route**:
   ```javascript
   router.post('/feature', protect, canPerform(PERMISSIONS.NEW_FEATURE_ACTION), handler);
   ```

4. **Check in frontend**:
   ```javascript
   <PermissionGate can={PERMISSIONS.NEW_FEATURE_ACTION}>
     <FeatureComponent />
   </PermissionGate>
   ```

### Adding A New Role

1. **Define in `permissions.config.js`**:
   ```javascript
   export const ROLES = {
     // ...
     NEW_ROLE: 'new_role',
   };
   ```

2. **Map permissions**:
   ```javascript
   export const ROLE_PERMISSIONS = {
     [ROLES.NEW_ROLE]: new Set([
       PERMISSIONS.ACTION_1,
       PERMISSIONS.ACTION_2,
       // ...
     ]),
   };
   ```

3. **Update user model** (if needed):
   ```javascript
   // Backend/models/user.js
   role: {
     type: String,
     enum: Object.values(ROLES),
     default: ROLES.CITIZEN,
   },
   ```

---

## 🔒 Security Guarantees

After implementing this refactoring:

| Threat | Mitigation |
|--------|-----------|
| User self-assigns admin role | ✅ Registration forces citizen; only admin can elevate |
| Hardcoded role checks missed | ✅ Centralized permission system |
| Frontend check bypassed | ✅ Backend enforces via middleware |
| Officer accesses other departments | ✅ Resource-level permission functions |
| New permission added to wrong place | ✅ Single source of truth in config |
| Role change not logged | ✅ Backend logs all role changes |

---

## 🚀 Rollout Strategy

### Option A: Gradual Rollout (Recommended)

**Week 1:**
- Deploy permission configs & middleware
- Update registration endpoint
- Deploy backend routes with permission middleware

**Week 2:**
- Deploy frontend hooks & components
- Refactor 1-2 high-priority pages

**Week 3:**
- Refactor remaining pages
- Monitor logs for permission issues

**Week 4:**
- Remove old roleCheck utility (after fully migrated)
- Documentation update

### Option B: Big Bang (Lower Risk)

1. Deploy all changes simultaneously
2. Thoroughly test in staging
3. Monitor closely in production
4. Revert quickly if issues

---

## 📚 Migration Examples

### Example 1: Protect Admin Route

```javascript
// Before
router.get('/admin/users', protect, checkRole(['admin']), getUsers);

// After
const { canPerform } = require('../middlewares/permission.middleware');
const { PERMISSIONS } = require('../config/permissions.config');

router.get('/admin/users', protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), getUsers);
```

### Example 2: Refactor Component

```javascript
// Before
import { useRole } from '../hooks/useRole';

function ManageUsers() {
  const { isAdmin } = useRole();

  if (!isAdmin) return <Navigate to="/dashboard" />;

  return <UserTable />;
}

// After
import { usePermission } from '../hooks/usePermission';
import PermissionGate from '../components/auth/PermissionGate';
import { PERMISSIONS } from '../utils/permissions.config';

function ManageUsers() {
  const { can } = usePermission();

  if (!can(PERMISSIONS.ADMIN_MANAGE_USERS)) {
    return <Navigate to="/dashboard" />;
  }

  return <UserTable />;
}

// Or using PermissionGate
function ManageUsers() {
  return (
    <PermissionGate
      can={PERMISSIONS.ADMIN_MANAGE_USERS}
      fallback={<Navigate to="/dashboard" />}
    >
      <UserTable />
    </PermissionGate>
  );
}
```

---

## ❓ FAQ

**Q: Do I need to update all routes at once?**  
A: No. Routes using the new middleware work alongside old routes. Migrate gradually.

**Q: What if a user has an old token with wrong role?**  
A: Backend re-fetches from DB on `/auth/me`. Old tokens are invalidated on logout/login.

**Q: How do I check permissions in the backend controller?**  
A: Use `req.user.role` and check against `ROLE_PERMISSIONS`, or use `req.checkResourcePermission(resource)` if you set up resource-level middleware.

**Q: Can I mix roles and permissions in ProtectedRoute?**  
A: Yes, both work. Permission-based is recommended for new code.

**Q: How do I extend permissions for future features?**  
A: Add to `PERMISSIONS`, map to roles in `ROLE_PERMISSIONS`, and update middleware usage.

---

## 🆘 Troubleshooting

### Issue: 403 Forbidden on previously working endpoint

**Solution 1:** Ensure middleware is added to route
```javascript
router.get('/endpoint', protect, canPerform(PERMISSIONS.ACTION), handler);
```

**Solution 2:** Check permission is in role's set
```javascript
ROLE_PERMISSIONS[user.role].has(permission) // should be true
```

### Issue: Frontend shows disabled feature to user who should see it

**Solution 1:** Verify permission in `permissions.config.js`
```javascript
const { can } = usePermission();
console.log(can(PERMISSIONS.FEATURE)); // Should be true
```

**Solution 2:** Check PermissionGate logic
```javascript
ROLE_PERMISSIONS[user.role].has(permission) // Should include permission
```

### Issue: Resource-level permission not working

**Solution:** Ensure resource is passed correctly:
```javascript
// Correct
canPerformResourceAction(user, 'ISSUE', 'DELETE', actualIssueObject);

// Wrong
canPerformResourceAction(user, 'ISSUE', 'DELETE', onlyIssueId);
```

---

**Status:** ✅ All core files created. Ready for implementation!
