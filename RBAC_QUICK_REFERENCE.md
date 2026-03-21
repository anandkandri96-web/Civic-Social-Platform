# RBAC Quick Reference Guide

## For Developers - How to Use Permissions

### Import the Permission Hook
```jsx
import { usePermission } from '@hooks/usePermission';

const MyComponent = () => {
  const { can, canPerformAny, canPerformAll } = usePermission();
  // Now you can use can() in your component
};
```

### Check Single Permission
```jsx
// Show button only if user can create issues
if (can('issue:create')) {
  return <CreateIssueButton />;
}
```

### Check Multiple Permissions (ANY)
```jsx
// Show admin panel if user is admin OR can manage users
if (canPerformAny(['admin:view_analytics', 'admin:manage_users'])) {
  return <AdminPanel />;
}
```

### Check Multiple Permissions (ALL)
```jsx
// Show advanced officer options if user has both permissions
if (canPerformAll(['officer:review_issues', 'officer:assign_worker'])) {
  return <AdvancedOfficerOptions />;
}
```

### Use PermissionGate for Conditional Render
```jsx
<PermissionGate can="issue:delete">
  <DeleteButton />
</PermissionGate>

<PermissionGate canAny={['admin:manage_users', 'officer:view_queue']}>
  <ManagerPanel />
</PermissionGate>
```

### Use PermissionAwareButton
```jsx
import PermissionAwareButton from '@components/common/PermissionAwareButton';

<PermissionAwareButton
  permission="issue:delete"
  onClick={handleDelete}
  fallbackTooltip="You don't have permission to delete"
>
  Delete Issue
</PermissionAwareButton>
```

### Protect a Route
```jsx
// In AppRoutes.jsx
<ProtectedRoute 
  requiredPermissions={['officer:review_issues']}
  fallbackRoute="/unauthorized"
>
  <OfficerDashboard />
</ProtectedRoute>
```

---

## Available Permissions

### Issue Management
- `issue:create` - Create a new issue
- `issue:read` - View issues
- `issue:update` - Modify issue details
- `issue:delete` - Delete an issue
- `issue:verify` - Mark issue as verified (citizen)
- `issue:close` - Close an issue (admin/officer)
- `issue:reopen` - Reopen a closed issue

### Comments
- `comment:create` - Post a comment
- `comment:edit` - Edit your own comment
- `comment:delete` - Delete a comment

### Voting
- `vote:create` - Vote on an issue
- `vote:delete` - Remove your vote

### Volunteer Actions
- `volunteer:access` - Access volunteer dashboard
- `volunteer:claim_issue` - Claim an issue to resolve
- `volunteer:submit_resolution` - Submit a resolution
- `volunteer:update_progress` - Update progress on claimed issue

### Officer Actions
- `officer:access` - Access officer dashboard
- `officer:review_issues` - View department issues queue
- `officer:assign_worker` - Assign workers to issues
- `officer:update_status` - Change issue/task status
- `officer:view_queue` - See work queue
- `officer:view_department` - View department details
- `officer:manage_volunteers` - Manage volunteer team

### Worker Actions
- `worker:view_tasks` - View assigned tasks
- `worker:accept_task` - Pick up a task
- `worker:update_progress` - Update task progress
- `worker:complete_task` - Mark task as complete

### Admin Actions
- `admin:view_all_issues` - View all system issues
- `admin:manage_users` - Create/edit/delete users
- `admin:approve_user` - Approve pending users
- `admin:disable_account` - Deactivate user accounts
- `admin:change_role` - Modify user roles
- `admin:delete_user` - Remove users
- `admin:manage_departments` - Manage city departments
- `admin:view_analytics` - Access analytics dashboard
- `admin:manage_role_upgrades` - Review role upgrade requests

### Role Upgrade
- `role:upgrade_request` - Request a role upgrade (citizen/volunteer)

---

## Permission Assignment by Role

### Citizen
- `issue:create`
- `issue:read`
- `issue:verify`
- `issue:reopen`
- `comment:create`, `comment:edit`, `comment:delete`
- `vote:create`, `vote:delete`
- `role:upgrade_request`

### Volunteer (Extends Citizen)
- All citizen permissions
- `volunteer:access`
- `volunteer:claim_issue`
- `volunteer:submit_resolution`
- `volunteer:update_progress`
- `role:upgrade_request`

### Officer
- `issue:read`
- `officer:access`
- `officer:review_issues`
- `officer:assign_worker`
- `officer:update_status`
- `officer:view_queue`
- `officer:view_department`
- `comment:create`

### Worker
- `issue:read`
- `worker:view_tasks`
- `worker:accept_task`
- `worker:update_progress`
- `worker:complete_task`

### Admin
- **All permissions** (including all above roles)

---

## Common Patterns

### Pattern 1: Show/Hide Delete Button
```jsx
const IssueDetail = ({ issue, user }) => {
  const { can } = usePermission();
  const isReporter = String(user?.id) === String(issue?.reportedBy);
  
  const canDelete = can('issue:delete') && 
                    (user?.role === 'admin' || 
                     (isReporter && ['reported', 'closed'].includes(issue.status)));
  
  return (
    <>
      {canDelete && <DeleteButton />}
    </>
  );
};
```

### Pattern 2: Role-Aware Navigation
```jsx
const DashboardEntry = ({ user }) => {
  const { can } = usePermission();
  
  if (can('admin:view_analytics')) return <Navigate to="/admin" />;
  if (can('officer:review_issues')) return <Navigate to="/dashboard/officer" />;
  if (can('worker:view_tasks')) return <Navigate to="/dashboard/worker" />;
  if (can('volunteer:claim_issue')) return <Navigate to="/dashboard/volunteer" />;
  return <Navigate to="/dashboard" />; // Default for citizens
};
```

### Pattern 3: Conditional Features
```jsx
const AdvancedPanel = ({ issue }) => {
  const { can } = usePermission();
  
  return (
    <div>
      {can('issue:update') && <EditButton issue={issue} />}
      {can('issue:close') && <CloseButton issue={issue} />}
      {can('issue:delete') && <DeleteButton issue={issue} />}
    </div>
  );
};
```

---

## Debugging Tips

### Check Current User's Permissions
```jsx
// In browser console after logging in:
const { can } = usePermission();
console.log(can('issue:create')); // true/false
```

### Verify Permission Config
```jsx
// Check what permissions are defined:
import { PERMISSIONS, ROLE_PERMISSIONS } from '@utils/permissions.config';
console.log(PERMISSIONS);           // All available permission names
console.log(ROLE_PERMISSIONS);      // Permissions per role
```

### Test Permission Gate
```jsx
import { usePermission } from '@hooks/usePermission';
import PermissionGate from '@components/auth/PermissionGate';

const TestComponent = () => {
  const { can } = usePermission();
  
  return (
    <>
      <div>User has issue:create: {can('issue:create').toString()}</div>
      
      <PermissionGate can="issue:delete">
        <div>✅ User CAN delete issues</div>
      </PermissionGate>
      
      <PermissionGate can="admin:manage_users" fallback={<div>❌ No access</div>}>
        <div>✅ User CAN manage users</div>
      </PermissionGate>
    </>
  );
};
```

---

## Common Errors & Solutions

### Error: `can is not a function`
**Cause**: Not destructuring from usePermission hook
```jsx
// ❌ Wrong
const permission = usePermission();
permission.can('issue:create'); // Error!

// ✅ Correct
const { can } = usePermission();
can('issue:create'); // Works!
```

### Error: `Permission 'xyz:abc' not found`
**Cause**: Using permission name not defined in config
**Solution**: 
1. Check spelling in `permissions.config.js`
2. Use constant instead: `PERMISSIONS.ISSUE_CREATE` not `'issue:create'`
3. Verify permission is in correct role's set

### Error: Button still shows for unauthorized user
**Cause**: Component not re-rendering on permission change
**Solution**: Ensure usePermission is in component that renders conditionally

### Error: Route redirects to `/unauthorized` unexpectedly
**Cause**: User doesn't have required permission
**Solution**:
1. Check user's role in browser dev tools
2. Verify role has permission in ROLE_PERMISSIONS
3. Check ProtectedRoute's requiredPermissions value

---

## Migration Guide (From Old to New)

### Old Way (Don't Use)
```jsx
if (user?.role === 'admin') {
  // Show admin feature
}
```

### New Way (Use This)
```jsx
if (can('admin:view_analytics')) {
  // Show admin feature
}
```

### Why?
- More explicit and testable
- Easier to add granular permissions later
- Better separation of concerns
- Consistent across frontend and backend

---

## Backward Compatibility Aliases

Some old permission names are still supported via aliases:

| Old Name | Maps To | Status |
|----------|---------|--------|
| `task:view_own` | `worker:view_tasks` | Use new name |
| `admin:close_issue` | `issue:close` | Use new name |
| `officer:close_issue` | `issue:close` | Use new name |
| `admin:view_issues` | `admin:view_all_issues` | Use new name |

**Action**: Gradually migrate to new permission names

---

## Resources

- **Full API**: See `frontend/src/hooks/usePermission.js`
- **Config**: See `frontend/src/utils/permissions.config.js`
- **Components**: See `frontend/src/components/auth/`
- **Examples**: Search codebase for `usePermission()` usage

---

**Last Updated**: 2024
**Status**: ✅ Production Ready
