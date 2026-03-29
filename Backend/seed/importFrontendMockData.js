require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const User = require("../models/user");
const Issue = require("../models/issue");
const Vote = require("../models/vote");
const Task = require("../models/task");
const { ROLES, ISSUE_STATUS } = require("../utils/constants");
const { getOrCreateDepartmentByCategory } = require("../services/routing.service");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/community-heatmap";
const MOCK_FILE_PATH = path.resolve(__dirname, "../../frontend/src/utils/civicMockData.js");

const categoryMap = {
  roads: "roads",
  waste: "garbage",
  electricity: "electricity",
  drainage: "drainage",
  water: "water",
};

const statusMap = {
  reported: ISSUE_STATUS.REPORTED,
  "under review": ISSUE_STATUS.UNDER_REVIEW,
  "assigned to department": ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
  "work in progress": ISSUE_STATUS.WORK_IN_PROGRESS,
  resolved: ISSUE_STATUS.RESOLVED,
  "resolved by community": ISSUE_STATUS.RESOLVED_BY_COMMUNITY,
  "citizen verified": ISSUE_STATUS.CITIZEN_VERIFIED,
  closed: ISSUE_STATUS.CLOSED,
  "volunteer claimed": ISSUE_STATUS.VOLUNTEER_CLAIMED,
  "community fix in progress": ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
};

const taskStatusMap = {
  assigned: "assigned",
  accepted: "accepted",
  "in progress": "in_progress",
  completed: "completed",
};

const locationCoordinateMap = {
  "mg road": [77.6098, 12.9755],
  "cubbon park": [77.5946, 12.9763],
  koramangala: [77.6245, 12.9352],
  jayanagar: [77.5822, 12.925],
  "hsr layout": [77.6476, 12.9116],
  anekal: [77.6958, 12.7096],
};

function parseExportLiteral(source, exportName) {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  if (start < 0) return null;

  const from = source.indexOf("=", start) + 1;
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const opener = source[i];
  const closer = opener === "[" ? "]" : opener === "{" ? "}" : null;
  if (!closer) return null;

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let prev = "";
  let end = -1;

  for (let j = i; j < source.length; j += 1) {
    const ch = source[j];

    if (!inDouble && !inTemplate && ch === "'" && prev !== "\\") inSingle = !inSingle;
    else if (!inSingle && !inTemplate && ch === '"' && prev !== "\\") inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "`" && prev !== "\\") inTemplate = !inTemplate;

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === opener) depth += 1;
      if (ch === closer) {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    prev = ch;
  }

  if (end < 0) return null;
  const raw = source.slice(i, end + 1);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${raw});`)();
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function ensureUserByName(name, role, namespace, departmentId = null) {
  const email = `${slugify(name)}.${namespace}@mock.local`;
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: String(name).trim(),
      email,
      password: "Mock@12345",
      role,
      isActive: true,
      isApproved: true,
      department: departmentId,
    });
  } else if (user.role !== role) {
    user.role = role;
    user.isActive = true;
    user.isApproved = true;
    if (departmentId) user.department = departmentId;
    await user.save();
  } else if (departmentId && String(user.department || "") !== String(departmentId)) {
    user.department = departmentId;
    await user.save();
  }
  return user;
}

function normalizeCategory(input) {
  return categoryMap[String(input || "").trim().toLowerCase()] || "other";
}

function normalizeStatus(input) {
  return statusMap[String(input || "").trim().toLowerCase()] || ISSUE_STATUS.REPORTED;
}

function inferSeverity(priorityText) {
  const p = String(priorityText || "").trim().toLowerCase();
  if (p === "urgent") return 4;
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function coordinatesFor(locationText) {
  const key = String(locationText || "").trim().toLowerCase();
  return locationCoordinateMap[key] || [77.5946, 12.9716];
}

function inferTaskStatus(text) {
  return taskStatusMap[String(text || "").trim().toLowerCase()] || "assigned";
}

async function run() {
  if (!fs.existsSync(MOCK_FILE_PATH)) {
    throw new Error(`Mock file not found: ${MOCK_FILE_PATH}`);
  }

  const content = fs.readFileSync(MOCK_FILE_PATH, "utf8");
  const sampleIssues = parseExportLiteral(content, "sampleIssues") || [];
  const workerTasks = parseExportLiteral(content, "workerTasks") || [];

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB");

  const roadsDepartment = await getOrCreateDepartmentByCategory("roads");
  const defaultCitizen = await ensureUserByName("Mock Citizen Reporter", ROLES.CITIZEN, "citizen");
  const defaultOfficer = await ensureUserByName("Mock Department Officer", ROLES.OFFICER, "officer", roadsDepartment._id);
  const defaultWorker = await ensureUserByName("Mock Field Worker", ROLES.WORKER, "worker", roadsDepartment._id);
  const defaultVolunteer = await ensureUserByName("Mock Volunteer", ROLES.VOLUNTEER, "volunteer");

  const issueByExternalId = new Map();
  let importedIssues = 0;
  let importedVotes = 0;

  for (const item of sampleIssues) {
    const category = normalizeCategory(item.category);
    const status = normalizeStatus(item.status);
    const severity = inferSeverity(item.priority);
    const locationText = String(item.location || "Unknown").trim();
    const department = await getOrCreateDepartmentByCategory(category);
    const coords = coordinatesFor(locationText);

    const issue = await Issue.findOneAndUpdate(
      { title: item.title, locationText },
      {
        $set: {
          title: item.title,
          description: `Imported mock issue ${item.id || ""}: ${item.title}`,
          category,
          severity,
          status,
          locationText,
          location: { type: "Point", coordinates: coords },
          assignedDepartment: department._id,
          reportedBy: defaultCitizen._id,
          voteCount: Number(item.support || 0),
          priorityScore: severity * 10 + Number(item.support || 0) * 2,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    if (String(item.path || "").toLowerCase() === "community") {
      let volunteerUser = defaultVolunteer;
      if (item.assignedTo && item.assignedTo !== "-") {
        volunteerUser = await ensureUserByName(item.assignedTo, ROLES.VOLUNTEER, "volunteer");
      }
      issue.volunteer = volunteerUser._id;
    } else if (item.assignedTo && item.assignedTo !== "-") {
      const workerUser = await ensureUserByName(item.assignedTo, ROLES.WORKER, "worker", department._id);
      issue.assignedWorker = workerUser._id;
    }

    if ([ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY, ISSUE_STATUS.CITIZEN_VERIFIED, ISSUE_STATUS.CLOSED].includes(issue.status)) {
      issue.resolvedAt = issue.resolvedAt || new Date();
    }
    if (issue.status === ISSUE_STATUS.CLOSED) {
      issue.closedAt = issue.closedAt || new Date();
    }

    await issue.save();
    importedIssues += 1;
    if (item.id) {
      issueByExternalId.set(String(item.id), issue);
    }

    const voteLimit = Math.min(Number(item.support || 0), 25);
    for (let idx = 1; idx <= voteLimit; idx += 1) {
      const voter = await ensureUserByName(`Mock Voter ${idx}`, ROLES.CITIZEN, "voter");
      // Keep idempotent by unique compound index.
      try {
        await Vote.create({ user: voter._id, issue: issue._id });
        importedVotes += 1;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
  }

  let importedTasks = 0;
  for (const taskItem of workerTasks) {
    let issue = issueByExternalId.get(String(taskItem.issueId));
    if (!issue) {
      issue = await Issue.findOne({ title: new RegExp(String(taskItem.location || ""), "i") }).sort({ createdAt: -1 });
    }
    if (!issue) {
      const category = "drainage";
      const department = await getOrCreateDepartmentByCategory(category);
      issue = await Issue.create({
        title: taskItem.title,
        description: `Imported from worker task ${taskItem.taskId}`,
        category,
        severity: 3,
        status: ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
        locationText: taskItem.location || "Unknown",
        location: {
          type: "Point",
          coordinates: coordinatesFor(taskItem.location),
        },
        reportedBy: defaultCitizen._id,
        assignedDepartment: department._id,
        assignedWorker: defaultWorker._id,
      });
    }

    const worker = issue.assignedWorker
      ? await User.findById(issue.assignedWorker)
      : defaultWorker;

    const taskStatus = inferTaskStatus(taskItem.status);
    const task = await Task.findOneAndUpdate(
      { issue: issue._id, worker: worker._id },
      {
        $set: {
          status: taskStatus,
          completionReport: taskItem.deadline ? `Deadline: ${taskItem.deadline}` : "",
        },
        $setOnInsert: {
          assignedBy: defaultOfficer._id,
        },
      },
      { upsert: true, new: true }
    );

    if (task.status === "completed") {
      task.completedAt = task.completedAt || new Date();
      await task.save();
    }
    importedTasks += 1;
  }

  await mongoose.disconnect();
  console.log(`Mock import complete: issues=${importedIssues}, votesCreated=${importedVotes}, tasks=${importedTasks}`);
}

run().catch(async (error) => {
  console.error("Import failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
