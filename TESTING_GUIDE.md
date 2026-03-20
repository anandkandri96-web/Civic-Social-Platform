# TESTING & VERIFICATION GUIDE

Complete testing strategies to verify the RBAC refactoring is working correctly.

---

## 🧪 Backend Permission Middleware Tests

### Test 1: Single Permission Check

```javascript
// Test that single permission check works

describe('canPerform middleware', () => {
  it('should allow user with correct permission', async () => {
    const req = {
      user: { _id: '123', role: 'admin' }
    };
    const res = {
      status: jest.fn().returnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    canPerform('admin:manage_users')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should deny user without permission', async () => {
    const req = {
      user: { _id: '123', role: 'citizen' }
    };
    const res = {
      status: jest.fn().returnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    const next = jest.fn();

    canPerform('admin:manage_users')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny unauthenticated user', async () => {
    const req = { user: null };
    const res = {
      status: jest.fn().returnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    const next = jest.fn();

    canPerform('admin:manage_users')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Test 2: Resource-Level Permission Check

```javascript
describe('Resource-level permissions', () => {
  it('should allow citizen to delete own issue', () => {
    const user = { _id: 'citizen1', role: 'citizen' };
    const issue = {
      _id: 'issue1',
      reportedBy: 'citizen1',
      status: 'reported'
    };

    const result = canPerformResourceAction(
      user,
      'ISSUE',
      'DELETE',
      issue
    );

    expect(result).toBe(true);
  });

  it('should deny citizen from deleting others\' issues', () => {
    const user = { _id: 'citizen1', role: 'citizen' };
    const issue = {
      _id: 'issue1',
      reportedBy: 'citizen2',  // Different citizen
      status: 'reported'
    };

    const result = canPerformResourceAction(
      user,
      'ISSUE',
      'DELETE',
      issue
    );

    expect(result).toBe(false);
  });

  it('should allow admin to delete any issue', () => {
    const admin = { _id: 'admin1', role: 'admin' };
    const issue = {
      _id: 'issue1',
      reportedBy: 'citizen1',
      status: 'reported'
    };

    const result = canPerformResourceAction(
      admin,
      'ISSUE',
      'DELETE',
      issue
    );

    expect(result).toBe(true);
  });

  it('should deny officer from updating issue from wrong department', () => {
    const officer = { _id: 'officer1', role: 'officer', department: 'dept1' };
    const issue = {
      _id: 'issue1',
      assignedDepartment: 'dept2',  // Different department
      status: 'under_review'
    };

    const result = canPerformResourceAction(
      officer,
      'ISSUE',
      'UPDATE_STATUS',
      issue
    );

    expect(result).toBe(false);
  });
});
```

---

## 🧪 Backend Route Tests

### Test 3: Admin Endpoint with Permission Middleware

```javascript
const request = require('supertest');
const app = require('../app');
const User = require('../models/user');

describe('Admin Routes with Permission Middleware', () => {
  let adminToken, officerToken, citizenToken;

  beforeAll(async () => {
    // Create test users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin'
    });
    adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

    const officer = await User.create({
      name: 'Officer User',
      email: 'officer@test.com',
      password: 'hashedpassword',
      role: 'officer'
    });
    officerToken = jwt.sign({ id: officer._id }, process.env.JWT_SECRET);

    const citizen = await User.create({
      name: 'Citizen User',
      email: 'citizen@test.com',
      password: 'hashedpassword',
      role: 'citizen'
    });
    citizenToken = jwt.sign({ id: citizen._id }, process.env.JWT_SECRET);
  });

  test('Admin can access /admin/users endpoint', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  test('Officer cannot access /admin/users endpoint', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Permission');
  });

  test('Citizen cannot access /admin/users endpoint', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });

  test('Unauthenticated user gets 401', async () => {
    const response = await request(app)
      .get('/api/admin/users');

    expect(response.status).toBe(401);
  });
});
```

### Test 4: Registration Endpoint (Forces Citizen Role)

```javascript
describe('User Registration - Role Assignment', () => {
  test('New user registered as citizen even if role=admin sent', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'Password123!',
        role: 'admin'  // ← Try to register as admin
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('citizen');  // ← Must be citizen
  });

  test('Volunteer registration forced to citizen', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Volunteer',
        email: 'volunteer@test.com',
        password: 'Password123!',
        role: 'volunteer'  // ← Try to register as volunteer
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('citizen');  // ← Must be citizen
  });
});
```

---

## 🧪 Frontend Permission Hook Tests

### Test 5: usePermission Hook

```javascript
import { render, screen } from '@testing-library/react';
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS, ROLES } from '../utils/permissions.config';
import { AuthContext } from '../contexts/AuthContext';

describe('usePermission Hook', () => {
  const renderWithAuth = (component, user) => {
    return render(
      <AuthContext.Provider value={{ user, loading: false, isAuthenticated: !!user }}>
        {component}
      </AuthContext.Provider>
    );
  };

  test('admin has all permissions', () => {
    const TestComponent = () => {
      const { can } = usePermission();
      return (
        <div>
          {can(PERMISSIONS.ADMIN_MANAGE_USERS) && <div>Can manage users</div>}
          {can(PERMISSIONS.ISSUE_DELETE) && <div>Can delete issue</div>}
        </div>
      );
    };

    const adminUser = { _id: '1', role: ROLES.ADMIN };
    renderWithAuth(<TestComponent />, adminUser);

    expect(screen.getByText('Can manage users')).toBeInTheDocument();
    expect(screen.getByText('Can delete issue')).toBeInTheDocument();
  });

  test('citizen does not have admin permissions', () => {
    const TestComponent = () => {
      const { can } = usePermission();
      return (
        <div>
          {can(PERMISSIONS.ADMIN_MANAGE_USERS) ? (
            <div>Can manage users</div>
          ) : (
            <div>Cannot manage users</div>
          )}
        </div>
      );
    };

    const citizenUser = { _id: '1', role: ROLES.CITIZEN };
    renderWithAuth(<TestComponent />, citizenUser);

    expect(screen.getByText('Cannot manage users')).toBeInTheDocument();
  });

  test('canPerformAny returns true if any permission matches', () => {
    const TestComponent = () => {
      const { canPerformAny } = usePermission();
      return (
        <div>
          {canPerformAny([PERMISSIONS.ADMIN_MANAGE_USERS, PERMISSIONS.ISSUE_CREATE]) ? (
            <div>Has one of permissions</div>
          ) : (
            <div>Has none</div>
          )}
        </div>
      );
    };

    const citizenUser = { _id: '1', role: ROLES.CITIZEN };
    renderWithAuth(<TestComponent />, citizenUser);

    // Citizen has ISSUE_CREATE but not ADMIN_MANAGE_USERS
    expect(screen.getByText('Has one of permissions')).toBeInTheDocument();
  });
});
```

### Test 6: PermissionGate Component

```javascript
import { render, screen } from '@testing-library/react';
import PermissionGate from '../components/auth/PermissionGate';
import { PERMISSIONS, ROLES } from '../utils/permissions.config';
import { AuthContext } from '../contexts/AuthContext';

describe('PermissionGate Component', () => {
  const renderWithAuth = (component, user) => {
    return render(
      <AuthContext.Provider value={{ user, loading: false, isAuthenticated: !!user }}>
        {component}
      </AuthContext.Provider>
    );
  };

  test('shows children when user has permission', () => {
    const adminUser = { _id: '1', role: ROLES.ADMIN };
    
    renderWithAuth(
      <PermissionGate can={PERMISSIONS.ADMIN_MANAGE_USERS}>
        <div>Admin Panel</div>
      </PermissionGate>,
      adminUser
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  test('hides children when user lacks permission', () => {
    const citizenUser = { _id: '1', role: ROLES.CITIZEN };
    
    renderWithAuth(
      <PermissionGate can={PERMISSIONS.ADMIN_MANAGE_USERS}>
        <div>Admin Panel</div>
      </PermissionGate>,
      citizenUser
    );

    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  test('shows fallback when permission denied', () => {
    const citizenUser = { _id: '1', role: ROLES.CITIZEN };
    
    renderWithAuth(
      <PermissionGate
        can={PERMISSIONS.ADMIN_MANAGE_USERS}
        fallback={<div>No access</div>}
      >
        <div>Admin Panel</div>
      </PermissionGate>,
      citizenUser
    );

    expect(screen.getByText('No access')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  test('resource-level permission check works', () => {
    const citizenUser = { _id: 'user1', role: ROLES.CITIZEN };
    const ownIssue = {
      _id: 'issue1',
      reportedBy: 'user1',
      status: 'reported'
    };
    
    renderWithAuth(
      <PermissionGate
        resource={ownIssue}
        resourceAction="DELETE"
        resourceType="ISSUE"
      >
        <div>Delete Button</div>
      </PermissionGate>,
      citizenUser
    );

    expect(screen.getByText('Delete Button')).toBeInTheDocument();
  });

  test('resource-level permission denies access to others\' resources', () => {
    const citizenUser = { _id: 'user1', role: ROLES.CITIZEN };
    const othersIssue = {
      _id: 'issue1',
      reportedBy: 'user2',  // Different citizen
      status: 'reported'
    };
    
    renderWithAuth(
      <PermissionGate
        resource={othersIssue}
        resourceAction="DELETE"
        resourceType="ISSUE"
      >
        <div>Delete Button</div>
      </PermissionGate>,
      citizenUser
    );

    expect(screen.queryByText('Delete Button')).not.toBeInTheDocument();
  });
});
```

---

## 🧪 Integration Tests (Full User Flows)

### Test 7: Complete Citizen Issue Deletion Flow

```javascript
describe('Integration: Citizen Deletes Own Issue', () => {
  test('citizen can delete own issue through frontend and backend', async () => {
    // 1. Register as citizen
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Citizen',
        email: 'citizen@test.com',
        password: 'Password123!',
        role: 'admin'  // Try to register as admin
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.role).toBe('citizen');  // ← Forced to citizen
    const citizenToken = registerRes.body.token;

    // 2. Create an issue
    const issueRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Test Issue',
        description: 'Test description',
        category: 'roads',
        lat: 12.9716,
        lng: 77.5946
      });

    const issueId = issueRes.body.data._id;

    // 3. Get issue details to verify ownership
    const getRes = await request(app)
      .get(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(getRes.body.data.reportedBy).toBe(citizenToken); // Verify citizen is reporter

    // 4. Delete the issue - should succeed
    const deleteRes = await request(app)
      .delete(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(deleteRes.status).toBe(200);

    // 5. Verify issue is deleted
    const afterDeleteRes = await request(app)
      .get(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(afterDeleteRes.status).toBe(404);
  });
});
```

### Test 8: Role Escalation Prevention

```javascript
describe('Security: Role Escalation Prevention', () => {
  test('cannot escalate own role via API call', async () => {
    // Register as citizen
    const user = await User.create({
      name: 'Attacker',
      email: 'attacker@test.com',
      password: 'Password123!',
      role: 'citizen'
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Try to escalate to admin by calling API
    const response = await request(app)
      .patch(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    // Should be denied
    expect(response.status).toBe(403);

    // Verify role is still citizen
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.role).toBe('citizen');
  });

  test('only admin can change user roles', async () => {
    // Create admin and citizen
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'Password123!',
      role: 'admin'
    });
    const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

    const citizen = await User.create({
      name: 'Citizen',
      email: 'citizen@test.com',
      password: 'Password123!',
      role: 'citizen'
    });

    // Admin changes citizen to volunteer
    const response = await request(app)
      .patch(`/api/admin/users/${citizen._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'volunteer' });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('volunteer');
  });
});
```

---

## Manual Testing Checklist

### Citizen Role

- [ ] Can create issues
- [ ] Can vote on issues
- [ ] Can comment on issues
- [ ] Can verify resolved issues
- [ ] Can delete own issues (if reported/closed)
- [ ] Can reopen own resolved issues
- [ ] Cannot access `/admin` routes
- [ ] Cannot access `/dashboard/officer` routes
- [ ] Cannot access `/dashboard/worker` routes
- [ ] Cannot access `/dashboard/volunteer` routes

### Volunteer Role

- [ ] Can do all citizen actions
- [ ] Can claim issues
- [ ] Can submit resolution
- [ ] Can update progress on claimed issues
- [ ] Cannot access admin endpoints
- [ ] Cannot assign workers
- [ ] Cannot approve other users

### Officer Role

- [ ] Can review issues in queue
- [ ] Can assign workers
- [ ] Can update issue status
- [ ] Cannot access other department's issues
- [ ] Cannot access admin endpoints
- [ ] Cannot create/delete users
- [ ] Cannot approve volunteers

### Worker Role

- [ ] Can view task list
- [ ] Can accept tasks
- [ ] Can update task progress
- [ ] Cannot review issues
- [ ] Cannot assign other workers
- [ ] Cannot create issues
- [ ] Limited to task-specific actions

### Admin Role

- [ ] Can access all endpoints
- [ ] Can manage users
- [ ] Can approve/disable accounts
- [ ] Can change user roles
- [ ] Can manage departments
- [ ] Can view all issues
- [ ] Can delete any issue
- [ ] Can view analytics

---

## Performance Testing

```javascript
// Test that permission checks don't slow down routes
describe('Permission Middleware Performance', () => {
  test('canPerform middleware completes in < 5ms', async () => {
    const start = performance.now();
    
    const user = { _id: '123', role: 'admin' };
    for (let i = 0; i < 1000; i++) {
      hasPermission(user.role, PERMISSIONS.ADMIN_MANAGE_USERS);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 1000;
    
    expect(avgTime).toBeLessThan(5);  // Average < 5ms per check
  });
});
```

---

## Browser Testing Script

```javascript
// Console script to manually test frontend permissions
(function testPermissions() {
  const { usePermission } = window; // Assuming you export this somehow
  
  // This would need to be in a React component context
  // For manual testing, use React DevTools to inspect components
  
  console.log('=== PERMISSION TESTING ===');
  
  // Test 1: Check current user permissions
  console.log('Current user:', user);
  console.log('User role:', user.role);
  console.log('Can delete issue:', can('issue:delete'));
  console.log('Can manage users:', can('admin:manage_users'));
  
  // Test 2: Check all permissions for role
  console.log('All permissions for role:', Array.from(userPermissions));
  
  // Test 3: Resource-level check
  console.log('Can delete resource:', canPerformResourceAction(issue, 'DELETE', 'ISSUE'));
})();
```

---

## Continuous Integration (CI) Tests

```yaml
# .github/workflows/rbac-tests.yml
name: RBAC Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run permission middleware tests
        run: npm test -- Backend/middlewares/permission.middleware.test.js
      
      - name: Run route authorization tests
        run: npm test -- Backend/routes/__tests__/
      
      - name: Run frontend permission hook tests
        run: npm test -- frontend/src/hooks/usePermission.test.js
      
      - name: Run integration tests
        run: npm test -- __tests__/integration/
      
      - name: Check for hardcoded role checks
        run: grep -r "role ===" src/ && echo "FAIL: Found hardcoded role checks" || echo "PASS: No hardcoded checks"
```

---

## Monitoring in Production

```javascript
// Log permission denials for audit
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 403) {
      console.log({
        timestamp: new Date(),
        user: req.user?._id,
        userRole: req.user?.role,
        action: req.originalUrl,
        method: req.method,
        message: data.message,
        status: 'PERMISSION_DENIED'
      });
    }
    return originalJson.call(this, data);
  };
  next();
});
```

---

**All tests above should pass after RBAC refactoring is complete!**
