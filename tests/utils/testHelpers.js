const { expect } = require('@playwright/test');

const roleCredentials = {
  citizen: { email: 'citizen@city.local', password: 'Password123!' },
  volunteer: { email: 'volunteer@city.local', password: 'Password123!' },
  officer: { email: 'officer@city.local', password: 'Password123!' },
  worker: { email: 'worker@city.local', password: 'Password123!' },
  admin: { email: 'admin@city.local', password: 'Password123!' },
};

const roleToDashboard = {
  citizen: '/dashboard',
  volunteer: '/dashboard/volunteer',
  officer: '/dashboard/officer',
  worker: '/dashboard/worker',
  admin: '/admin',
};

const roleToHeading = {
  citizen: 'My Dashboard',
  volunteer: 'Volunteer Dashboard',
  officer: 'Officer Dashboard',
  worker: 'Worker Dashboard',
  admin: 'Admin Dashboard',
};

const users = {
  citizen: { id: 'u-citizen', name: 'Citizen User', email: roleCredentials.citizen.email, role: 'citizen', isApproved: true, isActive: true },
  volunteer: { id: 'u-volunteer', name: 'Volunteer User', email: roleCredentials.volunteer.email, role: 'volunteer', isApproved: true, isActive: true },
  officer: { id: 'u-officer', name: 'Officer User', email: roleCredentials.officer.email, role: 'officer', isApproved: true, isActive: true, department: { _id: 'dept-roads', name: 'Roads Department' } },
  worker: { id: 'u-worker', name: 'Field Worker User', email: roleCredentials.worker.email, role: 'worker', isApproved: true, isActive: true, department: { _id: 'dept-roads', name: 'Roads Department' }, workerId: 'WK-102' },
  admin: { id: 'u-admin', name: 'Admin User', email: roleCredentials.admin.email, role: 'admin', isApproved: true, isActive: true },
};

const nowIso = () => new Date().toISOString();

const parseRoleFromToken = (header) => {
  const token = String(header || '').replace('Bearer ', '');
  const m = token.match(/^mock-(.+)-token$/);
  return m?.[1] || 'citizen';
};

const parseRoleFromEmail = (email) => {
  const lower = String(email || '').toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('officer')) return 'officer';
  if (lower.includes('worker')) return 'worker';
  if (lower.includes('volunteer') || lower.includes('ngo')) return 'volunteer';
  return 'citizen';
};

const json = async (route, payload, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
};

const tryJson = (request) => {
  try {
    return request.postDataJSON();
  } catch {
    return {};
  }
};

const multipartField = (raw, fieldName, fallback = '') => {
  const body = String(raw || '');
  const re = new RegExp(`name="${fieldName}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`, 'm');
  const m = body.match(re);
  return (m?.[1] || fallback).trim();
};

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

const buildIssue = (overrides = {}) => {
  const id = overrides._id || `issue-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  return {
    _id: id,
    title: overrides.title || 'Broken streetlight near market',
    description: overrides.description || 'Streetlight has not worked for a week.',
    category: overrides.category || 'electricity',
    status: overrides.status || 'reported',
    severity: overrides.severity ?? 2,
    voteCount: overrides.voteCount ?? 3,
    userVoted: overrides.userVoted ?? false,
    locationText: overrides.locationText || 'Central Market Road',
    location: overrides.location || { coordinates: [77.5946, 12.9716], address: 'Central Market Road' },
    reportedBy: overrides.reportedBy || users.citizen.id,
    createdAt: overrides.createdAt || nowIso(),
    images: overrides.images || [],
    communityProof: overrides.communityProof || [],
    workerProgressImages: overrides.workerProgressImages || [],
  };
};

const buildTask = (overrides = {}) => ({
  _id: overrides._id || `task-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  issue: overrides.issue || buildIssue({ title: 'Overflowing garbage bin', category: 'garbage', status: 'assigned_to_department' }),
  status: overrides.status || 'assigned',
  progressImages: overrides.progressImages || [],
});

const buildNotification = (overrides = {}) => ({
  _id: overrides._id || `notif-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  title: overrides.title || 'Issue update',
  message: overrides.message || 'Your reported issue has moved to Under Review.',
  read: overrides.read ?? false,
  createdAt: overrides.createdAt || nowIso(),
  issue: overrides.issue || { _id: 'issue-1' },
});

const buildRoleUpgradeRequest = (overrides = {}) => ({
  _id: overrides._id || `req-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  user: overrides.user || users.citizen,
  currentRole: overrides.currentRole || 'citizen',
  requestedRole: overrides.requestedRole || 'volunteer',
  preferredDepartment: overrides.preferredDepartment || 'Roads Department',
  status: overrides.status || 'pending',
  createdAt: overrides.createdAt || nowIso(),
  adminNotes: overrides.adminNotes || '',
  department: overrides.department || null,
});

const setupMockApi = async (page) => {
  const state = {
    issues: [
      buildIssue({
        _id: 'issue-1',
        title: 'Broken streetlight near market',
        category: 'electricity',
        status: 'reported',
        severity: 2,
        voteCount: 3,
        userVoted: false,
        locationText: 'Central Market Road',
        location: { coordinates: [77.5946, 12.9716], address: 'Central Market Road' },
      }),
      buildIssue({
        _id: 'issue-2',
        title: 'Overflowing garbage bin',
        category: 'garbage',
        status: 'under_review',
        severity: 3,
        voteCount: 1,
        userVoted: false,
        locationText: 'Lake View Circle',
        location: { coordinates: [77.604, 12.965], address: 'Lake View Circle' },
      }),
      buildIssue({
        _id: 'issue-3',
        title: 'Water leakage from pipe',
        category: 'water',
        status: 'work_in_progress',
        severity: 4,
        voteCount: 5,
        userVoted: true,
        locationText: 'Sector 12',
        location: { coordinates: [77.608, 12.968], address: 'Sector 12' },
      }),
    ],
    comments: {
      'issue-1': [
        { _id: 'comment-1', message: 'Please fix soon.', user: { _id: users.citizen.id, name: users.citizen.name }, createdAt: nowIso() },
      ],
    },
    departments: [
      { _id: 'dept-roads', name: 'Roads Department' },
      { _id: 'dept-garbage', name: 'Waste Management' },
      { _id: 'dept-water', name: 'Water Works' },
    ],
    users: [
      users.citizen,
      users.volunteer,
      users.officer,
      users.worker,
      users.admin,
      { id: 'u-vol-pending', _id: 'u-vol-pending', name: 'Pending Volunteer', email: 'pending.volunteer@city.local', role: 'volunteer', isApproved: false, isActive: true },
    ].map((u) => ({ ...u, _id: u._id || u.id })),
    tasks: [
      buildTask({
        _id: 'task-1',
        issue: buildIssue({
          _id: 'issue-1',
          title: 'Broken streetlight near market',
          category: 'electricity',
          locationText: 'Central Market Road',
        }),
        status: 'assigned',
      }),
    ],
    notifications: [
      buildNotification({ _id: 'notif-1', issue: { _id: 'issue-1' }, read: false }),
      buildNotification({ _id: 'notif-2', issue: { _id: 'issue-2' }, read: true, message: 'Issue marked as under review.' }),
    ],
    roleUpgradeRequests: [
      buildRoleUpgradeRequest({
        _id: 'req-1',
        user: users.citizen,
        requestedRole: 'volunteer',
        preferredDepartment: 'Waste Management',
        status: 'pending',
      }),
      buildRoleUpgradeRequest({
        _id: 'req-2',
        user: users.volunteer,
        requestedRole: 'worker',
        preferredDepartment: 'Roads Department',
        status: 'approved',
        department: { _id: 'dept-roads', name: 'Roads Department' },
      }),
    ],
  };

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const pathName = new URL(url).pathname;

    if (!pathName.startsWith('/api/')) {
      await route.continue();
      return;
    }

    const request = route.request();
    const method = request.method();

    if (/\/api\/auth\/register$/.test(url) && method === 'POST') {
      const body = tryJson(request);
      const role = parseRoleFromEmail(body.email || body.role);
      const user = {
        _id: `u-${Date.now()}`,
        id: `u-${Date.now()}`,
        name: body.name || 'New User',
        email: body.email || `new.${role}@city.local`,
        role,
        isApproved: role !== 'volunteer',
        isActive: true,
      };
      state.users.push(user);
      await json(route, { data: { token: `mock-${role}-token`, user } }, 201);
      return;
    }

    if (/\/api\/auth\/login$/.test(url) && method === 'POST') {
      const body = tryJson(request);
      const role = parseRoleFromEmail(body.email);
      const user = users[role] || users.citizen;
      await json(route, { data: { token: `mock-${role}-token`, user } });
      return;
    }

    if (/\/api\/auth\/me$/.test(url) && method === 'GET') {
      const role = parseRoleFromToken(request.headers()['authorization']);
      const user = users[role] || users.citizen;
      await json(route, { data: { user } });
      return;
    }

    if (/\/api\/issues(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: state.issues });
      return;
    }

    if (/\/api\/issues$/.test(url) && method === 'POST') {
      const rawBody = request.postData() || '';
      const title = multipartField(rawBody, 'title', 'New civic issue');
      const description = multipartField(rawBody, 'description', 'Issue description');
      const category = multipartField(rawBody, 'category', 'other');
      const locationText = multipartField(rawBody, 'locationText', 'Unknown location');
      const lat = Number(multipartField(rawBody, 'lat', '12.9716'));
      const lng = Number(multipartField(rawBody, 'lng', '77.5946'));

      const issue = buildIssue({
        _id: `issue-${Date.now()}`,
        title,
        description,
        category,
        status: 'reported',
        severity: 3,
        voteCount: 0,
        userVoted: false,
        locationText,
        location: { coordinates: [lng, lat], address: locationText },
        images: ['https://example.com/mock-photo.jpg'],
      });
      state.issues.unshift(issue);
      await json(route, { data: issue }, 201);
      return;
    }

    if (/\/api\/issues\/[^/]+$/.test(url) && method === 'GET') {
      const issueId = url.split('/api/issues/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      await json(route, { data: issue || null }, issue ? 200 : 404);
      return;
    }

    if (/\/api\/issues\/[^/]+\/status$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/issues\/([^/]+)\/status$/)?.[1];
      const body = tryJson(request);
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = body.status || issue.status;
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/issues\/[^/]+\/(verify|reopen|close)$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/issues\/([^/]+)\/(verify|reopen|close)$/)?.[1];
      const action = url.match(/\/api\/issues\/[^/]+\/(verify|reopen|close)$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) {
        if (action === 'verify') issue.status = 'citizen_verified';
        if (action === 'reopen') issue.status = 'reported';
        if (action === 'close') issue.status = 'closed';
      }
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/issues\/[^/]+$/.test(url) && method === 'PATCH') {
      const issueId = url.split('/api/issues/')[1]?.split('?')[0];
      const body = tryJson(request);
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) Object.assign(issue, body);
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/issues\/[^/]+$/.test(url) && method === 'DELETE') {
      const issueId = url.split('/api/issues/')[1]?.split('?')[0];
      state.issues = state.issues.filter((i) => i._id !== issueId);
      await json(route, { data: { success: true } });
      return;
    }

    if (/\/api\/comments\/[^/]+$/.test(url) && method === 'GET') {
      const issueId = url.split('/api/comments/')[1]?.split('?')[0];
      await json(route, { data: state.comments[issueId] || [] });
      return;
    }

    if (/\/api\/comments\/[^/]+$/.test(url) && method === 'POST') {
      const issueId = url.split('/api/comments/')[1]?.split('?')[0];
      const body = tryJson(request);
      const comment = {
        _id: `comment-${Date.now()}`,
        message: body.message || 'Comment',
        user: { _id: users.citizen.id, name: users.citizen.name },
        createdAt: nowIso(),
      };
      state.comments[issueId] = [comment, ...(state.comments[issueId] || [])];
      await json(route, { data: comment }, 201);
      return;
    }

    if (/\/api\/comments\/single\/[^/]+$/.test(url) && method === 'PATCH') {
      const commentId = url.match(/\/api\/comments\/single\/([^/]+)$/)?.[1];
      const body = tryJson(request);
      for (const issueId of Object.keys(state.comments)) {
        const list = state.comments[issueId] || [];
        const idx = list.findIndex((c) => c._id === commentId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...body };
          await json(route, { data: list[idx] });
          return;
        }
      }
      await json(route, { data: null }, 404);
      return;
    }

    if (/\/api\/comments\/single\/[^/]+$/.test(url) && method === 'DELETE') {
      const commentId = url.match(/\/api\/comments\/single\/([^/]+)$/)?.[1];
      for (const issueId of Object.keys(state.comments)) {
        state.comments[issueId] = (state.comments[issueId] || []).filter((c) => c._id !== commentId);
      }
      await json(route, { data: { success: true } });
      return;
    }

    if (/\/api\/votes\/[^/]+$/.test(url) && method === 'POST') {
      const issueId = url.split('/api/votes/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) {
        issue.voteCount += 1;
        issue.userVoted = true;
      }
      await json(route, { data: { voteCount: issue?.voteCount || 0, voted: true } });
      return;
    }

    if (/\/api\/votes\/[^/]+$/.test(url) && method === 'DELETE') {
      const issueId = url.split('/api/votes/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) {
        issue.voteCount = clamp(issue.voteCount - 1, 0, 9999);
        issue.userVoted = false;
      }
      await json(route, { data: { voteCount: issue?.voteCount || 0, voted: false } });
      return;
    }

    if (/\/api\/votes\/[^/]+$/.test(url) && method === 'GET') {
      const issueId = url.split('/api/votes/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      await json(route, { data: { voted: !!issue?.userVoted } });
      return;
    }

    if (/\/api\/volunteer\/issues\/available$/.test(url) && method === 'GET') {
      await json(route, { data: state.issues.filter((i) => ['reported', 'under_review', 'volunteer_claimed', 'community_fix_in_progress', 'resolved_by_community'].includes(i.status)) });
      return;
    }

    if (/\/api\/volunteer\/issues\/[^/]+\/claim$/.test(url) && method === 'POST') {
      const issueId = url.match(/\/api\/volunteer\/issues\/([^/]+)\/claim$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'volunteer_claimed';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/volunteer\/issues\/[^/]+\/progress$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/volunteer\/issues\/([^/]+)\/progress$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'community_fix_in_progress';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/volunteer\/issues\/[^/]+\/resolve$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/volunteer\/issues\/([^/]+)\/resolve$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'resolved_by_community';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/issues(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: state.issues });
      return;
    }

    if (/\/api\/officer\/issues\/[^/]+\/review$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/([^/]+)\/review$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'under_review';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/issues\/[^/]+\/assign-worker$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/([^/]+)\/assign-worker$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      const body = tryJson(request);
      if (issue) issue.status = 'assigned_to_department';
      state.tasks.push({
        _id: `task-${Date.now()}`,
        issue: { _id: issue?._id, title: issue?.title, category: issue?.category, locationText: issue?.locationText },
        status: 'assigned',
        workerId: body.workerId || 'worker-id',
      });
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/issues\/[^/]+\/status$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/([^/]+)\/status$/)?.[1];
      const body = tryJson(request);
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = body.status || issue.status;
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/workers$/.test(url) && method === 'GET') {
      await json(route, { data: [users.worker] });
      return;
    }

    if (/\/api\/tasks\/my$/.test(url) && method === 'GET') {
      await json(route, { data: state.tasks });
      return;
    }

    if (/\/api\/tasks\/[^/]+\/status$/.test(url) && method === 'PATCH') {
      const taskId = url.match(/\/api\/tasks\/([^/]+)\/status$/)?.[1];
      const body = tryJson(request);
      const task = state.tasks.find((t) => t._id === taskId);
      if (task) task.status = body.status || task.status;
      await json(route, { data: task });
      return;
    }

    if (/\/api\/tasks\/[^/]+\/progress$/.test(url) && method === 'POST') {
      const taskId = url.match(/\/api\/tasks\/([^/]+)\/progress$/)?.[1];
      const task = state.tasks.find((t) => t._id === taskId);
      if (task) task.progressImages = ['https://example.com/progress.jpg'];
      await json(route, { data: task });
      return;
    }

    if (/\/api\/admin\/issues(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: { data: state.issues, pagination: { total: state.issues.length, pages: 1 } } });
      return;
    }

    if (/\/api\/admin\/users(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: { data: state.users, pagination: { total: state.users.length, pages: 1 } } });
      return;
    }

    if (/\/api\/admin\/users\/[^/]+\/approve$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/([^/]+)\/approve$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.isApproved = !!body.isApproved;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/[^/]+\/role$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/([^/]+)\/role$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.role = body.role || user.role;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/[^/]+\/status$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/([^/]+)\/status$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.isActive = !!body.isActive;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/[^/]+\/department$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/([^/]+)\/department$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.department = state.departments.find((d) => d._id === body.departmentId) || body.departmentId;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/[^/]+$/.test(url) && method === 'DELETE') {
      const userId = url.match(/\/api\/admin\/users\/([^/]+)$/)?.[1];
      state.users = state.users.filter((u) => u._id !== userId);
      await json(route, { data: { success: true } });
      return;
    }

    if (/\/api\/admin\/departments$/.test(url) && method === 'GET') {
      await json(route, { data: state.departments });
      return;
    }

    if (/\/api\/admin\/departments$/.test(url) && method === 'POST') {
      const body = tryJson(request);
      const department = { _id: `dept-${Date.now()}`, name: body.name || 'New Department' };
      state.departments.push(department);
      await json(route, { data: department }, 201);
      return;
    }

    if (/\/api\/admin\/stats$/.test(url) && method === 'GET') {
      await json(route, { data: { users: state.users.length, issues: state.issues.length } });
      return;
    }

    if (/\/api\/admin\/role-upgrades(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: { data: state.roleUpgradeRequests, pagination: { total: state.roleUpgradeRequests.length } } });
      return;
    }

    if (/\/api\/admin\/role-upgrades\/[^/]+\/decision$/.test(url) && method === 'PATCH') {
      const requestId = url.match(/\/api\/admin\/role-upgrades\/([^/]+)\/decision$/)?.[1];
      const body = tryJson(request);
      const reqItem = state.roleUpgradeRequests.find((r) => r._id === requestId);
      if (reqItem) {
        reqItem.status = body.decision || reqItem.status;
        reqItem.adminNotes = body.adminNotes || reqItem.adminNotes;
        if (body.departmentId) {
          reqItem.department = state.departments.find((d) => d._id === body.departmentId) || reqItem.department;
        }
      }
      await json(route, { data: reqItem });
      return;
    }

    if (/\/api\/role-upgrades\/my$/.test(url) && method === 'GET') {
      await json(route, { data: state.roleUpgradeRequests.filter((r) => r.user?.id === users.citizen.id) });
      return;
    }

    if (/\/api\/role-upgrades$/.test(url) && method === 'POST') {
      const body = tryJson(request);
      const reqItem = buildRoleUpgradeRequest({
        _id: `req-${Date.now()}`,
        user: users.citizen,
        requestedRole: body.requestedRole || 'volunteer',
        preferredDepartment: body.preferredDepartment || 'Roads Department',
        status: 'pending',
      });
      state.roleUpgradeRequests.unshift(reqItem);
      await json(route, { data: reqItem }, 201);
      return;
    }

    if (/\/api\/analytics\/trends$/.test(url) && method === 'GET') {
      await json(route, {
        data: {
          statusBreakdown: [
            { _id: 'reported', count: 2 },
            { _id: 'under_review', count: 1 },
            { _id: 'work_in_progress', count: 1 },
            { _id: 'resolved', count: 1 },
            { _id: 'resolved_by_community', count: 1 },
            { _id: 'citizen_verified', count: 1 },
          ],
          issuesByCategory: [
            { _id: 'roads', count: 3 },
            { _id: 'garbage', count: 2 },
            { _id: 'electricity', count: 2 },
          ],
          avgResolutionTime: 18.4,
          resolvedByDepartment: [
            { department: 'Roads Department', count: 3 },
            { department: 'Waste Management', count: 2 },
          ],
        },
      });
      return;
    }

    if (/\/api\/analytics\/heatmap$/.test(url) && method === 'GET') {
      await json(route, {
        data: [
          { _id: 'h1', location: { coordinates: [77.5946, 12.9716] }, weight: 9, voteCount: 14 },
          { _id: 'h2', location: { coordinates: [77.604, 12.965] }, weight: 7, voteCount: 11 },
        ],
      });
      return;
    }

    if (/\/api\/notifications(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: state.notifications, meta: { total: state.notifications.length } });
      return;
    }

    if (/\/api\/notifications\/[^/]+\/read$/.test(url) && method === 'PATCH') {
      const notifId = url.match(/\/api\/notifications\/([^/]+)\/read$/)?.[1];
      const notif = state.notifications.find((n) => n._id === notifId);
      if (notif) notif.read = true;
      await json(route, { data: notif });
      return;
    }

    if (/\/api\/notifications\/read-all$/.test(url) && method === 'PATCH') {
      state.notifications.forEach((n) => { n.read = true; });
      await json(route, { data: { success: true } });
      return;
    }

    await json(route, { data: {} });
  });

  return state;
};

const loginAsRole = async (page, role) => {
  const credentials = roleCredentials[role];

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /social civic platform/i })).toBeVisible();

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(new RegExp(`${roleToDashboard[role]}$`));
  await expect(page.getByRole('heading', { name: roleToHeading[role] })).toBeVisible();
};

const openUserMenu = async (page) => {
  const avatarButton = page.getByRole('button', { name: /user menu/i });
  await avatarButton.click();
};

const logoutFromNavbar = async (page) => {
  const menuButton = page.getByRole('button', { name: /user menu/i });
  if (await menuButton.count()) {
    await menuButton.click();
    await page.getByRole('menuitem', { name: /logout/i }).click();
  } else {
    const signOut = page.getByRole('button', { name: /sign out/i });
    if (await signOut.count()) {
      await signOut.click();
    }
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
};

const createIssue = async (page) => {
  const title = `Pothole near main road ${Date.now()}`;

  await page.goto('/issues/create', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /select category/i })).toBeVisible();

  await page.getByRole('button', { name: /roads/i }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByRole('heading', { name: /pin location/i })).toBeVisible();
  await page.getByPlaceholder(/latitude/i).fill('12.9716');
  await page.getByPlaceholder(/longitude/i).fill('77.5946');
  await page.getByPlaceholder(/area or landmark/i).fill('Main Market Road Junction');
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByRole('heading', { name: /issue details/i })).toBeVisible();
  await page.getByPlaceholder(/issue title/i).fill(title);
  await page.getByPlaceholder(/describe the issue/i).fill('There is a deep pothole causing traffic safety problems.');

  await page.locator('input[type="file"]').setInputFiles('tests/utils/fixtures/test-photo.jpg');
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByRole('heading', { name: /review/i })).toBeVisible();
  await page.getByRole('button', { name: /submit issue/i }).click();

  await expect(page).toHaveURL(/\/issues\/issue-/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  return title;
};

const navigateToDashboard = async (page) => {
  await page.getByRole('link', { name: /dashboard/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);
};

module.exports = {
  setupMockApi,
  loginCitizen: (page) => loginAsRole(page, 'citizen'),
  loginVolunteer: (page) => loginAsRole(page, 'volunteer'),
  loginOfficer: (page) => loginAsRole(page, 'officer'),
  loginWorker: (page) => loginAsRole(page, 'worker'),
  loginAdmin: (page) => loginAsRole(page, 'admin'),
  createIssue,
  navigateToDashboard,
  logoutFromNavbar,
  openUserMenu,
};
