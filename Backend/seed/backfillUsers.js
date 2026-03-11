require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Department = require("../models/department");
const { ROLES } = require("../utils/constants");
const { formatSerial, getMaxSerialNumber } = require("../services/serialId.service");

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

  // Backfill human-friendly serial IDs for staff users.
  const backfillSerials = async ({ role, field, prefix }) => {
    const missing = await User.find({
      role,
      $or: [{ [field]: null }, { [field]: { $exists: false } }, { [field]: "" }],
    })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id createdAt")
      .lean();

    if (missing.length === 0) {
      return { role, field, assigned: 0, startFrom: null };
    }

    const max = await getMaxSerialNumber(field, prefix);
    let next = max + 1;

    const ops = missing.map((u) => ({
      updateOne: {
        filter: {
          _id: u._id,
          $or: [{ [field]: null }, { [field]: { $exists: false } }, { [field]: "" }],
        },
        update: { $set: { [field]: formatSerial(prefix, next++) } },
      },
    }));

    const result = await User.bulkWrite(ops, { ordered: false });
    return {
      role,
      field,
      assigned: Number(result?.modifiedCount || 0),
      startFrom: formatSerial(prefix, max + 1),
    };
  };

  const [workerSerials, officerSerials] = await Promise.all([
    backfillSerials({ role: ROLES.WORKER, field: "workerId", prefix: "W" }),
    backfillSerials({ role: ROLES.OFFICER, field: "officerId", prefix: "O" }),
  ]);

  console.log(
    JSON.stringify(
      {
        approvalsBackfilled: approvedResult.modifiedCount || 0,
        departmentBackfilled,
        defaultDepartment: defaultDept ? defaultDept.name : null,
        workerSerials,
        officerSerials,
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
