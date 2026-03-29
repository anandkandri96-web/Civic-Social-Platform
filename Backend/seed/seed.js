require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/user");
const Department = require("../models/department");
const Issue = require("../models/issue");
const RoleUpgradeRequest = require("../models/roleUpgradeRequest");
const { ROLES, CATEGORY_DEPARTMENT_MAP } = require("../utils/constants");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicdb";

const DEFAULT_DEPARTMENTS = Object.entries(CATEGORY_DEPARTMENT_MAP).map(([category, name]) => ({
  name,
  categories: [category],
  description: `${name} department`,
}));

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  await Department.updateMany(
    {
      $or: [
        { "coverageArea.coordinates": { $size: 0 } },
        { "coverageArea.type": { $exists: false } },
        { "coverageArea.type": { $ne: "Polygon" } },
      ],
    },
    { $unset: { coverageArea: "" } }
  );

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@civic.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";

  for (const dep of DEFAULT_DEPARTMENTS) {
    const existing = await Department.findOne({ name: dep.name });
    if (!existing) {
      await Department.create(dep);
      continue;
    }

    existing.set(dep);
    const coverageCoordinates = existing.coverageArea?.coordinates;
    if (
      !existing.coverageArea?.type ||
      (Array.isArray(coverageCoordinates) && coverageCoordinates.length === 0)
    ) {
      existing.coverageArea = undefined;
    }
    await existing.save();
  }
  console.log(`Upserted ${DEFAULT_DEPARTMENTS.length} departments`);

  const allowedDepartmentNames = DEFAULT_DEPARTMENTS.map((dep) => dep.name);
  const allowedDepartments = await Department.find({
    name: { $in: allowedDepartmentNames },
  });
  const categoryToDeptId = new Map();
  const deptIdToName = new Map();
  for (const dept of allowedDepartments) {
    deptIdToName.set(String(dept._id), dept.name);
    for (const category of dept.categories || []) {
      if (!categoryToDeptId.has(category)) {
        categoryToDeptId.set(category, dept._id);
      }
    }
  }

  const extraDepartments = await Department.find({
    name: { $nin: allowedDepartmentNames },
  });

  for (const extra of extraDepartments) {
    const categories = Array.isArray(extra.categories) ? extra.categories : [];
    let targetDeptId = null;
    for (const category of categories) {
      if (categoryToDeptId.has(category)) {
        targetDeptId = categoryToDeptId.get(category);
        break;
      }
    }
    if (!targetDeptId) {
      targetDeptId = categoryToDeptId.get("other") || allowedDepartments[0]?._id || null;
    }

    if (targetDeptId) {
      await Promise.all([
        Issue.updateMany(
          { assignedDepartment: extra._id },
          { $set: { assignedDepartment: targetDeptId } }
        ),
        User.updateMany({ department: extra._id }, { $set: { department: targetDeptId } }),
        RoleUpgradeRequest.updateMany(
          { department: extra._id },
          { $set: { department: targetDeptId } }
        ),
      ]);
    }

    const targetDeptName = targetDeptId ? deptIdToName.get(String(targetDeptId)) : null;
    if (targetDeptName) {
      await RoleUpgradeRequest.updateMany(
        { preferredDepartment: extra.name },
        { $set: { preferredDepartment: targetDeptName } }
      );
    }
  }

  const deleteResult = await Department.deleteMany({
    name: { $nin: allowedDepartmentNames },
  });
  if (deleteResult.deletedCount) {
    console.log(`Removed ${deleteResult.deletedCount} non-whitelisted departments`);
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: ROLES.ADMIN,
      isActive: true,
      isApproved: true,
    });
    console.log(`Created admin: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  await mongoose.disconnect();
  console.log("Seed complete");
}

run().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
