import { expect } from '@playwright/test';

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
  officer: { id: 'u-officer', name: 'Officer User', email: roleCredentials.officer.email, role: 'officer', isApproved: true, isActive: true },
  worker: { id: 'u-worker', name: 'Field Worker User', email: roleCredentials.worker.email, role: 'worker', isApproved: true, isActive: true },
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

export const setupMockApi = async (page) => {
  const state = {
    issues: [
      {
        _id: 'issue-1',
        title: 'Broken streetlight near market',
        description: 'Streetlight has not worked for a week.',
        category: 'electricity',
        status: 'reported',
        severity: 2,
        voteCount: 3,
        userVoted: false,
        locationText: 'Central Market Road',
        location: { coordinates: [77.5946, 12.9716] },
        reportedBy: users.citizen.id,
        createdAt: nowIso(),
        images: [],
      },
      {
        _id: 'issue-2',
        title: 'Overflowing garbage bin',
        description: 'Garbage is spilling onto the road.',
        category: 'garbage',
        status: 'under_review',
        severity: 3,
        voteCount: 1,
        userVoted: false,
        locationText: 'Lake View Circle',
        location: { coordinates: [77.604, 12.965] },
        reportedBy: users.citizen.id,
        createdAt: nowIso(),
        images: [],
      },
    ],
    comments: {
      'issue-1': [
        { _id: 'comment-1', message: 'Please fix soon.', user: { _id: users.citizen.id, name: users.citizen.name }, createdAt: nowIso() },
      ],
    },
    departments: [
      { _id: 'dept-roads', name: 'Roads Department' },
      { _id: 'dept-garbage', name: 'Waste Management' },
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
      {
        _id: 'task-1',
        issue: { _id: 'issue-1', title: 'Broken streetlight near market', category: 'electricity', locationText: 'Central Market Road' },
        status: 'assigned',
      },
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
        isApproved: role !== 'volunteer' ? true : false,
        isActive: true,
      };
      state.users.push(user);
      await json(route, { token: `mock-${role}-token`, user }, 201);
      return;
    }

    if (/\/api\/auth\/login$/.test(url) && method === 'POST') {
      const body = tryJson(request);
      const role = parseRoleFromEmail(body.email);
      const user = users[role];
      await json(route, { token: `mock-${role}-token`, user });
      return;
    }

    if (/\/api\/auth\/me$/.test(url) && method === 'GET') {
      const role = parseRoleFromToken(request.headers()['authorization']);
      const user = users[role] || users.citizen;
      await json(route, { user });
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

      const issue = {
        _id: `issue-${Date.now()}`,
        title,
        description,
        category,
        status: 'reported',
        severity: 3,
        voteCount: 0,
        userVoted: false,
        locationText,
        location: { coordinates: [lng, lat] },
        reportedBy: users.citizen.id,
        createdAt: nowIso(),
        images: ['https://example.com/mock-photo.jpg'],
      };
      state.issues.unshift(issue);
      await json(route, { data: issue }, 201);
      return;
    }

    if (/\/api\/issues\/.+/.test(url) && method === 'GET') {
      const issueId = url.split('/api/issues/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      await json(route, { data: issue || null }, issue ? 200 : 404);
      return;
    }

    if (/\/api\/issues\/.+\/status$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/issues\/(.+)\/status$/)?.[1];
      const body = tryJson(request);
      const idx = state.issues.findIndex((i) => i._id === issueId);
      if (idx >= 0) state.issues[idx].status = body.status || state.issues[idx].status;
      await json(route, { data: state.issues[idx] });
      return;
    }

    if (/\/api\/comments\/.+/.test(url) && method === 'GET') {
      const issueId = url.split('/api/comments/')[1]?.split('?')[0];
      await json(route, { data: state.comments[issueId] || [] });
      return;
    }

    if (/\/api\/comments\/.+/.test(url) && method === 'POST') {
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

    if (/\/api\/votes\/.+/.test(url) && method === 'POST') {
      const issueId = url.split('/api/votes/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) {
        issue.voteCount += 1;
        issue.userVoted = true;
      }
      await json(route, { data: { voteCount: issue?.voteCount || 0, voted: true } });
      return;
    }

    if (/\/api\/votes\/.+/.test(url) && method === 'DELETE') {
      const issueId = url.split('/api/votes/')[1]?.split('?')[0];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) {
        issue.voteCount = Math.max(0, issue.voteCount - 1);
        issue.userVoted = false;
      }
      await json(route, { data: { voteCount: issue?.voteCount || 0, voted: false } });
      return;
    }

    if (/\/api\/volunteer\/issues\/available$/.test(url) && method === 'GET') {
      await json(route, { data: state.issues.filter((i) => ['reported', 'under_review', 'volunteer_claimed', 'community_fix_in_progress', 'resolved_by_community'].includes(i.status)) });
      return;
    }

    if (/\/api\/volunteer\/issues\/.+\/claim$/.test(url) && method === 'POST') {
      const issueId = url.match(/\/api\/volunteer\/issues\/(.+)\/claim$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'volunteer_claimed';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/volunteer\/issues\/.+\/progress$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/volunteer\/issues\/(.+)\/progress$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'community_fix_in_progress';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/volunteer\/issues\/.+\/resolve$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/volunteer\/issues\/(.+)\/resolve$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'resolved_by_community';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/issues(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: state.issues });
      return;
    }

    if (/\/api\/officer\/issues\/.+\/review$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/(.+)\/review$/)?.[1];
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = 'under_review';
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/officer\/issues\/.+\/assign-worker$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/(.+)\/assign-worker$/)?.[1];
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

    if (/\/api\/officer\/issues\/.+\/status$/.test(url) && method === 'PATCH') {
      const issueId = url.match(/\/api\/officer\/issues\/(.+)\/status$/)?.[1];
      const body = tryJson(request);
      const issue = state.issues.find((i) => i._id === issueId);
      if (issue) issue.status = body.status || issue.status;
      await json(route, { data: issue });
      return;
    }

    if (/\/api\/worker\/tasks$/.test(url) && method === 'GET') {
      await json(route, { data: state.tasks });
      return;
    }

    if (/\/api\/worker\/tasks\/.+\/accept$/.test(url) && method === 'PATCH') {
      const taskId = url.match(/\/api\/worker\/tasks\/(.+)\/accept$/)?.[1];
      const task = state.tasks.find((t) => t._id === taskId);
      if (task) task.status = 'accepted';
      await json(route, { data: task });
      return;
    }

    if (/\/api\/worker\/tasks\/.+\/progress$/.test(url) && method === 'PATCH') {
      const taskId = url.match(/\/api\/worker\/tasks\/(.+)\/progress$/)?.[1];
      const body = tryJson(request);
      const task = state.tasks.find((t) => t._id === taskId);
      if (task) task.status = body.status || task.status;
      if (task?.issue?._id) {
        const issue = state.issues.find((i) => i._id === task.issue._id);
        if (issue && task.status === 'in_progress') issue.status = 'work_in_progress';
        if (issue && task.status === 'completed') issue.status = 'resolved';
      }
      await json(route, { data: task });
      return;
    }

    if (/\/api\/admin\/issues(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: { data: state.issues, pagination: { total: state.issues.length } } });
      return;
    }

    if (/\/api\/admin\/users(\?.*)?$/.test(url) && method === 'GET') {
      await json(route, { data: { data: state.users, pagination: { total: state.users.length } } });
      return;
    }

    if (/\/api\/admin\/users\/.+\/approve$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/(.+)\/approve$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.isApproved = !!body.isApproved;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/.+\/role$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/(.+)\/role$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.role = body.role || user.role;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/.+\/status$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/(.+)\/status$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.isActive = !!body.isActive;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/.+\/department$/.test(url) && method === 'PATCH') {
      const userId = url.match(/\/api\/admin\/users\/(.+)\/department$/)?.[1];
      const body = tryJson(request);
      const user = state.users.find((u) => u._id === userId);
      if (user) user.department = body.departmentId;
      await json(route, { data: user });
      return;
    }

    if (/\/api\/admin\/users\/.+$/.test(url) && method === 'DELETE') {
      const userId = url.match(/\/api\/admin\/users\/(.+)$/)?.[1];
      state.users = state.users.filter((u) => u._id !== userId);
      await json(route, { success: true });
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

    await json(route, { data: {} });
  });

  return state;
};

const loginAsRole = async (page, role) => {
  const credentials = roleCredentials[role];

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /social civic platform/i })).toBeVisible();

  await page.getByRole('textbox', { name: /email/i }).fill(credentials.email);
  await page.locator('input[name=\"password\"]').fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(new RegExp(`${roleToDashboard[role]}$`));
  await expect(page.getByRole('heading', { name: roleToHeading[role] })).toBeVisible();
};

export const loginCitizen = async (page) => loginAsRole(page, 'citizen');
export const loginVolunteer = async (page) => loginAsRole(page, 'volunteer');
export const loginOfficer = async (page) => loginAsRole(page, 'officer');
export const loginWorker = async (page) => loginAsRole(page, 'worker');
export const loginAdmin = async (page) => loginAsRole(page, 'admin');

export const createIssue = async (page) => {
  const title = `Pothole near main road ${Date.now()}`;

  await page.goto('/issues/create', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /report a problem/i })).toBeVisible();

  await page.getByPlaceholder(/large pothole on main st/i).fill(title);

  const dropdowns = page.locator('div[role="button"]');
  await dropdowns.first().click();
  await page.locator('.dropdown-menu li', { hasText: /roads/i }).first().click();

  await dropdowns.nth(1).click();
  await page.locator('.dropdown-menu li', { hasText: /high/i }).first().click();

  await page.getByPlaceholder(/12\.9716/i).fill('12.9716');
  await page.getByPlaceholder(/77\.5946/i).fill('77.5946');
  await page.getByPlaceholder(/main market road/i).fill('Main Market Road Junction');
  await page.getByPlaceholder(/describe the issue in detail/i).fill('There is a deep pothole causing traffic safety problems.');

  await page.locator('input[type="file"]').setInputFiles('tests/utils/fixtures/test-photo.jpg');

  await page.getByRole('button', { name: /submit report/i }).click();
  await expect(page).toHaveURL(/\/issues\/issue-/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  return title;
};

export const navigateToDashboard = async (page) => {
  await page.getByRole('link', { name: /dashboard/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);
};

export const logoutFromNavbar = async (page) => {
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.count()) {
    await logoutButton.first().click();
  }
  await expect(page.getByRole('link', { name: /log in|login/i }).first()).toBeVisible();
};
