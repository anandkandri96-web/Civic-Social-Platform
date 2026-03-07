export const civicRoleSummary = [
  {
    role: 'Citizen',
    purpose: 'Report issues, support neighborhood priorities, and verify resolutions.',
    actions: [
      'Report potholes, waste, drainage, lighting, and water issues',
      'Upload photos, location, and clear descriptions',
      'Support issues with votes and comments',
      'Verify fixed issues or reopen if unresolved',
    ],
  },
  {
    role: 'Volunteer / NGO',
    purpose: 'Claim and resolve community-manageable issues quickly.',
    actions: [
      'Claim open issues for community action',
      'Upload progress and before/after evidence',
      'Mark issue as resolved by community',
      'Coordinate neighborhood clean-up drives',
    ],
  },
  {
    role: 'Department Officer',
    purpose: 'Validate, prioritize, assign, and monitor department issues.',
    actions: [
      'Review department-routed issues',
      'Assign field workers and deadlines',
      'Track repair progress and blockers',
      'Close issues after evidence review',
    ],
  },
  {
    role: 'Field Worker',
    purpose: 'Execute assigned civic repair tasks on-ground.',
    actions: [
      'Accept tasks assigned by officers',
      'Visit locations and perform repair work',
      'Submit progress updates and completion proof',
      'Escalate complications to officers',
    ],
  },
  {
    role: 'System Administrator',
    purpose: 'Operate governance, security, and platform-wide oversight.',
    actions: [
      'Manage users, departments, and approvals',
      'Handle spam/fraud reports',
      'Configure escalation and workflow rules',
      'Monitor platform analytics and health',
    ],
  },
];

export const lifecycle = {
  government: [
    'Reported',
    'Under Review',
    'Assigned to Department',
    'Work In Progress',
    'Resolved',
    'Citizen Verified',
    'Closed',
  ],
  community: [
    'Reported',
    'Volunteer Claimed',
    'Community Fix In Progress',
    'Resolved by Community',
    'Citizen Verified',
    'Closed',
  ],
};

export const sampleIssues = [
  {
    id: 'CP-1001',
    title: 'Massive pothole near bus stop',
    category: 'Roads',
    location: 'MG Road',
    status: 'Work In Progress',
    priority: 'High',
    support: 218,
    path: 'Government',
    assignedTo: 'Ravi Kumar',
  },
  {
    id: 'CP-1002',
    title: 'Overflowing garbage bins near park',
    category: 'Waste',
    location: 'Cubbon Park',
    status: 'Assigned to Department',
    priority: 'Medium',
    support: 94,
    path: 'Government',
    assignedTo: 'Suresh Babu',
  },
  {
    id: 'CP-1003',
    title: 'Street light out for two weeks',
    category: 'Electricity',
    location: 'Koramangala',
    status: 'Reported',
    priority: 'High',
    support: 71,
    path: 'Government',
    assignedTo: '-',
  },
  {
    id: 'CP-1004',
    title: 'Community clean-up near market lane',
    category: 'Waste',
    location: 'Jayanagar',
    status: 'Resolved by Community',
    priority: 'Medium',
    support: 148,
    path: 'Community',
    assignedTo: 'Volunteer Team 7',
  },
];

export const workerTasks = [
  {
    taskId: 'T-44',
    issueId: 'CP-1001',
    title: 'Pothole filling and lane patch',
    location: 'MG Road',
    deadline: 'Today 6:00 PM',
    status: 'In Progress',
  },
  {
    taskId: 'T-45',
    issueId: 'CP-1021',
    title: 'Drain blockage clearance',
    location: 'HSR Layout',
    deadline: 'Tomorrow 2:00 PM',
    status: 'Assigned',
  },
];
