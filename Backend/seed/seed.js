require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/user");
const Department = require("../models/department");
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

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@civic.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";

  for (const dep of DEFAULT_DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { name: dep.name },
      { $set: dep },
      { upsert: true, new: true }
    );
  }
  console.log(`Upserted ${DEFAULT_DEPARTMENTS.length} departments`);

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
