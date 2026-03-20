# FRONTEND COMPONENT REFACTORING - Code Examples

This guide shows how to refactor frontend components to use the new permission-based system.

---

## 1. Refactor: Header Navigation

### ❌ BEFORE: Hardcoded Role Checks

```javascript
// frontend/src/components/layout/Header/Header.jsx
import { useRole } from '../../../hooks/useRole';

const Header = () => {
  const { isCitizen, isAdmin, isOfficer, isWorker, dashboardPath } = useRole();
  const { user, isAuthenticated } = useAuth();

  const navLinks = useMemo(() => {
    const issuesTarget = isAdmin ? '/admin/manage-issues' : '/issues';
    const mapTarget = isAuthenticated ? '/dashboard/map' : '/map';
    const dashboardTarget = isAuthenticated ? dashboardPath : '/login';

    return [
      { to: issuesTarget, label: 'Issues' },
      { to: mapTarget, label: 'Map' },
      { to: dashboardTarget, label: 'Dashboard' },
      { to: '/workflow', label: 'Workflow' },
    ];
  }, [dashboardPath, isAdmin, isAuthenticated]);

  return (
    <header>
      <nav>
        {navLinks.map((link) => (
          <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
        ))}
      </nav>
    </header>
  );
};
```

### ✅ AFTER: Permission-Based

```javascript
// frontend/src/components/layout/Header/Header.jsx
import { useRole } from '../../../hooks/useRole';
import { usePermission } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../utils/permissions.config';

const Header = () => {
  const { user, isAuthenticated } = useAuth();
  const { dashboardPath } = useRole();
  const { can, isAdmin } = usePermission();

  const navLinks = useMemo(() => {
    const base = [
      { to: '/issues', label: 'Issues' },
      { to: isAuthenticated ? '/dashboard/map' : '/map', label: 'Map' },
      { to: isAuthenticated ? dashboardPath : '/login', label: 'Dashboard' },
      { to: '/workflow', label: 'Workflow' },
    ];

    // Only show admin panel if user has permission
    if (can(PERMISSIONS.ADMIN_VIEW_ALL_ISSUES)) {
      base.unshift({ to: '/admin/manage-issues', label: 'Admin Panel' });
    }

    return base;
  }, [can, dashboardPath, isAuthenticated]);

  return (
    <header>
      <nav>
        {navLinks.map((link) => (
          <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
        ))}
      </nav>
    </header>
  );
};

export default Header;
```

**Key Changes:**
- Removed `isCitizen, isOfficer, isWorker` (not needed for nav)
- Used `can(PERMISSIONS.ADMIN_*)` instead of `isAdmin`
- Clearer conditional: permission determines visibility

---

## 2. Refactor: Issue Details Page

### ❌ BEFORE: Scattered Hardcoded Checks

```javascript
// frontend/src/pages/Issues/IssueDetails.jsx
import { useRole } from '../../hooks/useRole';

const IssueDetails = () => {
  const { isAdmin, isOfficer, isVolunteer, isCitizen } = useRole();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);

  const reporterId = issue?.reportedBy?._id ?? issue?.reportedBy;
  const isReporter = user?.id && String(reporterId) === String(user.id);
  const status = String(issue?.status || '').trim().toLowerCase();
  
  // ❌ Complex hardcoded logic
  const canDelete = isAdmin || (isReporter && (status === 'reported' || status === 'closed'));
  const canClose = (isAdmin || isOfficer) && canTransition(issue?.status, 'closed');
  const canVerify = isReporter && canTransition(issue?.status, 'citizen_verified');
  const canReopen = isReporter && ['resolved', 'resolved_by_community', 'closed'].includes(issue?.status);

  return (
    <div>
      {/* ❌ Complex conditional rendering */}
      {!isAdmin && (
        <div className="issue-citizen-actions">
          {canDelete && <button onClick={handleDelete}>Delete</button>}
          {canVerify && <button onClick={handleVerify}>Verify Resolved</button>}
          {canReopen && <button onClick={handleReopen}>Reopen</button>}
        </div>
      )}

      {(isAdmin || isOfficer) && (
        <div className="issue-officer-actions">
          {canClose && <button onClick={handleClose}>Close Issue</button>}
        </div>
      )}

      {isVolunteer && (
        <div className="volunteer-panel">
          <VolunteerPanel issue={issue} />
        </div>
      )}
    </div>
  );
};
```

### ✅ AFTER: Permission-Based with PermissionGate

```javascript
// frontend/src/pages/Issues/IssueDetails.jsx
import { usePermission } from '../../hooks/usePermission';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS } from '../../utils/permissions.config';
import { canTransition } from '../../utils/statusFlow';

const IssueDetails = () => {
  const { user } = useAuth();
  const { can, canPerformResourceAction } = usePermission();
  const [issue, setIssue] = useState(null);

  return (
    <div>
      {/* Citizen actions - clean and explicit */}
      <PermissionGate resource={issue} resourceAction="DELETE" resourceType="ISSUE">
        <button onClick={handleDelete} className="btn-danger">
          Delete Issue
        </button>
      </PermissionGate>

      <PermissionGate resource={issue} resourceAction="REOPEN" resourceType="ISSUE">
        <button onClick={handleReopen} className="btn-secondary">
          Reopen Issue
        </button>
      </PermissionGate>

      {/* Officer actions */}
      <PermissionGate can={PERMISSIONS.OFFICER_UPDATE_STATUS}>
        {canTransition(issue?.status, 'closed') && (
          <button onClick={handleClose} className="btn-primary">
            Close Issue
          </button>
        )}
      </PermissionGate>

      {/* Citizen verify action */}
      <PermissionGate can={PERMISSIONS.ISSUE_VERIFY}>
        {canTransition(issue?.status, 'citizen_verified') && (
          <button onClick={handleVerify} className="btn-success">
            Verify Resolved
          </button>
        )}
      </PermissionGate>

      {/* Volunteer panel - only show if volunteer */}
      <PermissionGate can={PERMISSIONS.VOLUNTEER_CLAIM_ISSUE}>
        <VolunteerPanel issue={issue} />
      </PermissionGate>

      {/* Comments section - everyone can comment */}
      <PermissionGate can={PERMISSIONS.COMMENT_CREATE}>
        <CommentsSection issue={issue} />
      </PermissionGate>
    </div>
  );
};

export default IssueDetails;
```

**Key Improvements:**
- Removed hardcoded `isAdmin ||` logic
- Used `PermissionGate` with resource-level checks
- Each action is visibly gated
- No nested role conditions
- More maintainable

---

## 3. Refactor: Officer Dashboard

### ❌ BEFORE: Mixed Role & Action Checks

```javascript
// frontend/src/pages/Dashboard/OfficerDashboard.jsx
import { useRole } from '../../hooks/useRole';

const OfficerDashboard = () => {
  const { isOfficer, isAdmin } = useRole();
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);

  if (!isOfficer && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <h1>Officer Queue</h1>
      
      {issues.map((issue) => (
        <div key={issue._id}>
          <h3>{issue.title}</h3>
          
          {/* ❌ Hardcoded checks mixed with render logic */}
          {(isOfficer || isAdmin) && isInDepartment(issue) && (
            <button onClick={() => handleReview(issue._id)}>Review</button>
          )}
          
          {(isOfficer || isAdmin) && (
            <button onClick={() => handleAssignWorker(issue._id)}>Assign Worker</button>
          )}
          
          {isAdmin && (
            <button onClick={() => handleDelete(issue._id)}>Delete</button>
          )}
        </div>
      ))}
    </div>
  );
};
```

### ✅ AFTER: Permission-Based

```javascript
// frontend/src/pages/Dashboard/OfficerDashboard.jsx
import { usePermission } from '../../hooks/usePermission';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS } from '../../utils/permissions.config';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const { can, canPerformResourceAction } = usePermission();
  const [issues, setIssues] = useState([]);

  // Route protection using ProtectedRoute component (in AppRoutes.jsx)
  // No need to check here anymore

  return (
    <div>
      <h1>Officer Queue</h1>
      
      {issues.map((issue) => (
        <div key={issue._id}>
          <h3>{issue.title}</h3>
          
          {/* Review issue - permission-based */}
          <PermissionGate can={PERMISSIONS.OFFICER_REVIEW_ISSUE}>
            <button onClick={() => handleReview(issue._id)}>Review</button>
          </PermissionGate>
          
          {/* Assign worker - permission-based */}
          <PermissionGate can={PERMISSIONS.OFFICER_ASSIGN_WORKER}>
            <button onClick={() => handleAssignWorker(issue._id)}>Assign Worker</button>
          </PermissionGate>
          
          {/* Delete - admin only, with resource-level check */}
          <PermissionGate
            resource={issue}
            resourceAction="DELETE"
            resourceType="ISSUE"
          >
            <button onClick={() => handleDelete(issue._id)}>Delete</button>
          </PermissionGate>
        </div>
      ))}
    </div>
  );
};

export default OfficerDashboard;
```

**Key Improvements:**
- Removed role-based guards (ProtectedRoute handles route-level)
- Each action has explicit permission check
- Resource-level checks for fine-grained control
- Cleaner, testable component

---

## 4. Refactor: User Management (Admin Panel)

### ❌ BEFORE: No Permission Checks

```javascript
// frontend/src/pages/Admin/UserManagement.jsx
const UserManagement = () => {
  const [users, setUsers] = useState([]);

  // ❌ No permission checks - relies 100% on routing
  const handleDeleteUser = async (userId) => {
    // Anyone who reaches this page could delete users
    await deleteUserAdmin(userId);
  };

  const handleApproveUser = async (userId, isApproved) => {
    await approveUserAdmin(userId, isApproved);
  };

  return (
    <table>
      {users.map((user) => (
        <tr key={user._id}>
          <td>{user.name}</td>
          <td>{user.role}</td>
          {/* ❌ No permission checks on buttons */}
          <td>
            <button onClick={() => handleApproveUser(user._id, !user.isApproved)}>
              {user.isApproved ? 'Revoke' : 'Approve'}
            </button>
            <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
          </td>
        </tr>
      ))}
    </table>
  );
};
```

### ✅ AFTER: Permission-Based

```javascript
// frontend/src/pages/Admin/UserManagement.jsx
import { usePermission } from '../../hooks/usePermission';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS } from '../../utils/permissions.config';

const UserManagement = () => {
  const { can } = usePermission();
  const [users, setUsers] = useState([]);

  const handleDeleteUser = async (userId) => {
    // Frontend shows button only if user has permission
    // Backend also verifies before deleting
    await deleteUserAdmin(userId);
  };

  const handleApproveUser = async (userId, isApproved) => {
    await approveUserAdmin(userId, isApproved);
  };

  return (
    <table>
      {users.map((user) => (
        <tr key={user._id}>
          <td>{user.name}</td>
          <td>{user.role}</td>
          <td>
            {/* Approve button - conditional on permission */}
            <PermissionGate can={PERMISSIONS.ADMIN_APPROVE_USER}>
              <button onClick={() => handleApproveUser(user._id, !user.isApproved)}>
                {user.isApproved ? 'Revoke' : 'Approve'}
              </button>
            </PermissionGate>

            {/* Delete button - conditional on permission */}
            <PermissionGate can={PERMISSIONS.ADMIN_DELETE_USER}>
              <button 
                onClick={() => handleDeleteUser(user._id)}
                className="btn-danger"
              >
                Delete
              </button>
            </PermissionGate>
          </td>
        </tr>
      ))}
    </table>
  );
};

export default UserManagement;
```

**Key Improvements:**
- Explicit permission checks on each action
- Buttons only shown if user has permission
- Error messages if backend denies (still needed for defense-in-depth)
- Clearer intent

---

## 5. Refactor: Issue List with Dynamic Actions

### ❌ BEFORE: Complex Role Logic

```javascript
// frontend/src/components/issues/IssueCard/IssueCard.jsx
const IssueCard = ({ issue, onDeleted }) => {
  const { isAdmin, isCitizen, isOfficer, isVolunteer } = useRole();
  const { user } = useAuth();

  const isReporter = user?.id && String(issue.reportedBy) === String(user.id);

  return (
    <div className="card">
      <h3>{issue.title}</h3>
      <p>{issue.description}</p>

      <div className="actions">
        {/* ❌ Complex nested conditions */}
        {isAdmin ? (
          <>
            <button>Delete</button>
            <button>Change Status</button>
          </>
        ) : isReporter ? (
          <>
            {['reported', 'closed'].includes(issue.status) && (
              <button>Delete</button>
            )}
            {['resolved', 'resolved_by_community', 'closed'].includes(issue.status) && (
              <button>Reopen</button>
            )}
          </>
        ) : isVolunteer ? (
          <>
            {!issue.volunteer && (
              <button>Claim Issue</button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
```

### ✅ AFTER: Clean Permission Gates

```javascript
// frontend/src/components/issues/IssueCard/IssueCard.jsx
import { usePermission } from '../../../hooks/usePermission';
import PermissionGate from '../../auth/PermissionGate';
import { PERMISSIONS } from '../../../utils/permissions.config';

const IssueCard = ({ issue, onDeleted }) => {
  const { user } = useAuth();
  const { canPerformResourceAction } = usePermission();

  return (
    <div className="card">
      <h3>{issue.title}</h3>
      <p>{issue.description}</p>

      <div className="actions">
        {/* Delete action - resource-level permission */}
        <PermissionGate
          resource={issue}
          resourceAction="DELETE"
          resourceType="ISSUE"
        >
          <button onClick={() => handleDelete(issue._id)}>Delete</button>
        </PermissionGate>

        {/* Reopen action - resource-level permission */}
        <PermissionGate
          resource={issue}
          resourceAction="REOPEN"
          resourceType="ISSUE"
        >
          <button onClick={() => handleReopen(issue._id)}>Reopen</button>
        </PermissionGate>

        {/* Claim issue - volunteers only */}
        <PermissionGate can={PERMISSIONS.VOLUNTEER_CLAIM_ISSUE}>
          {!issue.volunteer && (
            <button onClick={() => handleClaim(issue._id)}>Claim Issue</button>
          )}
        </PermissionGate>

        {/* Change status - officer/admin only */}
        <PermissionGate can={PERMISSIONS.OFFICER_UPDATE_STATUS}>
          <button onClick={() => handleChangeStatus(issue._id)}>Change Status</button>
        </PermissionGate>
      </div>
    </div>
  );
};

export default IssueCard;
```

**Key Improvements:**
- Each action wrapped in `<PermissionGate>`
- No nested role logic
- Resource-level checks for fine-grained control
- Much more readable

---

## 6. Create a Reusable Action Component

### ✅ NEW: Reusable Permission-Protected Button

```javascript
// frontend/src/components/auth/PermissionButton.jsx
import { usePermission } from '../../hooks/usePermission';

/**
 * Button that only renders if user has permission
 * Combines permission check + button rendering
 */
export const PermissionButton = ({
  permission,           // Single permission (e.g., 'issue:delete')
  permissionAny,        // Check ANY permissions
  permissionAll,        // Check ALL permissions
  resource,             // For resource-level checks
  resourceAction,       // For resource-level checks
  resourceType,         // For resource-level checks
  onClick,
  disabled = false,
  className = '',
  children,
  fallback = null,
}) => {
  const { can, canPerformAny, canPerformAll, canPerformResourceAction } = usePermission();

  let hasPermission = true;

  if (permission) {
    hasPermission = can(permission);
  } else if (permissionAny) {
    hasPermission = canPerformAny(permissionAny);
  } else if (permissionAll) {
    hasPermission = canPerformAll(permissionAll);
  } else if (resource && resourceAction && resourceType) {
    hasPermission = canPerformResourceAction(resource, resourceAction, resourceType);
  }

  if (!hasPermission) return fallback;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
};

export default PermissionButton;

// Usage:
// <PermissionButton 
//   resource={issue} 
//   resourceAction="DELETE" 
//   resourceType="ISSUE"
//   onClick={() => handleDelete(issue._id)}
// >
//   Delete
// </PermissionButton>
```

---

## 7. Update useRole Hook (Simplified)

### ✅ IMPROVED: useRole.js (Minimal)

```javascript
// frontend/src/hooks/useRole.js
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { ROLES } from '../utils/permissions.config';

/**
 * Simplified useRole hook
 * Now primarily for dashboard routing and role metadata
 * For authorization checks, use usePermission() instead
 */
export const useRole = () => {
  const { user, loading } = useAuth();

  const role = user?.role || null;

  // Dashboard routing
  const dashboardPath = useMemo(() => {
    const map = {
      [ROLES.ADMIN]: '/admin',
      [ROLES.OFFICER]: '/dashboard/officer',
      [ROLES.WORKER]: '/dashboard/worker',
      [ROLES.VOLUNTEER]: '/dashboard/volunteer',
      [ROLES.CITIZEN]: '/dashboard',
    };
    return map[role] || '/dashboard';
  }, [role]);

  // Dashboard labels
  const dashboardLabel = useMemo(() => {
    const map = {
      [ROLES.ADMIN]: 'Admin Dashboard',
      [ROLES.OFFICER]: 'Officer Dashboard',
      [ROLES.WORKER]: 'Worker Dashboard',
      [ROLES.VOLUNTEER]: 'Volunteer Dashboard',
      [ROLES.CITIZEN]: 'My Dashboard',
    };
    return map[role] || 'Dashboard';
  }, [role]);

  return {
    role,
    loading,
    dashboardPath,
    dashboardLabel,
  };
};
```

---

## Migration Checklist for Components

- [ ] Header.jsx - Show admin link conditionally
- [ ] IssueDetails.jsx - Gate all actions with PermissionGate
- [ ] IssueList.jsx - Use PermissionGate for bulk actions
- [ ] IssueCard.jsx - Gate action buttons
- [ ] OfficerDashboard.jsx - Remove role guards, use permissions
- [ ] VolunteerPanel.jsx - Use permission gates
- [ ] UserManagement.jsx - Gate admin actions
- [ ] Comments.jsx - Gate delete/edit per user/permission
- [ ] Profile.jsx - Show role info only
- [ ] Any other component with role checks

---

## Testing Changes

```javascript
// Test: Permissions show correct buttons
import { render, screen } from '@testing-library/react';
import IssueCard from './IssueCard';
import { AuthContext } from '../../contexts/AuthContext';

test('shows delete button for issue reporter', () => {
  const mockUser = { _id: 'user1', role: 'citizen' };
  const mockIssue = {
    _id: 'issue1',
    reportedBy: 'user1',
    status: 'reported'
  };

  render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <IssueCard issue={mockIssue} />
    </AuthContext.Provider>
  );

  expect(screen.getByText('Delete')).toBeInTheDocument();
});

test('hides delete button for non-reporter', () => {
  const mockUser = { _id: 'user2', role: 'citizen' };  // Different user
  const mockIssue = {
    _id: 'issue1',
    reportedBy: 'user1',
    status: 'reported'
  };

  render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <IssueCard issue={mockIssue} />
    </AuthContext.Provider>
  );

  expect(screen.queryByText('Delete')).not.toBeInTheDocument();
});
```

---

**All examples above are ready to copy-paste into your components!**
