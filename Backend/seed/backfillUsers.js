require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Department = require("../models/department");
const { ROLES } = require("../utils/constants");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/community-heatmap";

async function run() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB");

  const defaultDept = await Department.findOne({ isActive: true }).sort({ createdAt: 1 });

  // Ensure isApproved exists for all old records.
  const approvedResult = await User.updateMany(
    { isApproved: { $exists: false } },
    { $set: { isApproved: true } }
  );

  // Auto-assign department to officer/worker if missing to satisfy RBAC scope rules.
  let departmentBackfilled = 0;
  if (defaultDept) {
    const deptResult = await User.updateMany(
      {
        role: { $in: [ROLES.OFFICER, ROLES.WORKER] },
        $or: [{ department: null }, { department: { $exists: false } }],
      },
      { $set: { department: defaultDept._id } }
    );
    departmentBackfilled = deptResult.modifiedCount || 0;
  }

  console.log(
    JSON.stringify(
      {
        approvalsBackfilled: approvedResult.modifiedCount || 0,
        departmentBackfilled,
        defaultDepartment: defaultDept ? defaultDept.name : null,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  console.log("Backfill complete");
}

run().catch(async (error) => {
  console.error("Backfill failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
