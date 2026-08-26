require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/user");
const Department = require("../models/department");
const { ROLES } = require("../config/roles");
const { formatSerial, getMaxSerialNumber } = require("../services/serialId.service");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicdb";
const DEFAULT_PASSWORD = process.env.SEED_STAFF_PASSWORD || "Civic@2026!";
const EMAIL_DOMAIN = process.env.SEED_STAFF_EMAIL_DOMAIN || "civic.local";

const OFFICER_BY_DEPARTMENT = Object.freeze({
  "municipal roads department": { name: "Arjun Mehta", localPart: "arjun.mehta.officer" },
  "electricity services department": { name: "Priya Nair", localPart: "priya.nair.officer" },
  "waste management department": { name: "Rohan Kulkarni", localPart: "rohan.kulkarni.officer" },
  "drainage management department": { name: "Neha Sharma", localPart: "neha.sharma.officer" },
  "water supply department": { name: "Vikram Iyer", localPart: "vikram.iyer.officer" },
  "general services department": { name: "Ananya Verma", localPart: "ananya.verma.officer" },
});

const WORKER_BY_DEPARTMENT = Object.freeze({
  "municipal roads department": { name: "Suresh Yadav", localPart: "suresh.yadav.worker" },
  "electricity services department": { name: "Kavita Singh", localPart: "kavita.singh.worker" },
  "waste management department": { name: "Imran Khan", localPart: "imran.khan.worker" },
  "drainage management department": { name: "Pooja Patel", localPart: "pooja.patel.worker" },
  "water supply department": { name: "Rahul Choudhary", localPart: "rahul.choudhary.worker" },
  "general services department": { name: "Deepak Joshi", localPart: "deepak.joshi.worker" },
});

const VOLUNTEER_ACCOUNTS = Object.freeze([
  { name: "Aditi Rao", localPart: "aditi.rao.volunteer" },
  { name: "Manish Gupta", localPart: "manish.gupta.volunteer" },
]);

function normalizeDepartmentKey(name) {
  return String(name || "").trim().toLowerCase();
}

function toEmail(localPart) {
  return `${String(localPart).trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

function getFallbackStaffProfile(departmentName, role, index) {
  const roleToken = role === ROLES.OFFICER ? "officer" : "worker";
  const localPart = `${slugify(departmentName)}.${roleToken}.${index + 1}`;
  const title = role === ROLES.OFFICER ? "Officer" : "Worker";
  const shortName = String(departmentName || "Department").replace(/\s+department$/i, "").trim();
  return {
    name: `${shortName} ${title} ${index + 1}`,
    localPart,
  };
}

async function upsertStaffUser({
  name,
  email,
  role,
  departmentId = null,
  password,
  serialField = null,
  assignSerial = null,
}) {
  const existing = await User.findOne({ email });
  const user = existing || new User({ email });

  user.name = name;
  user.role = role;
  user.isActive = true;
  user.isApproved = true;
  user.department = departmentId;
  user.password = password;

  if (serialField && !user[serialField] && typeof assignSerial === "function") {
    user[serialField] = assignSerial();
  }

  await user.save();
  return user;
}

async function run() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB");

  const departments = await Department.find({ isActive: true }).sort({ name: 1 });
  if (!departments.length) {
    throw new Error("No active departments found. Run `npm run seed` first.");
  }

  let nextOfficerNumber = (await getMaxSerialNumber("officerId", "O")) + 1;
  let nextWorkerNumber = (await getMaxSerialNumber("workerId", "W")) + 1;

  const createdAccounts = [];

  for (let index = 0; index < departments.length; index += 1) {
    const department = departments[index];
    const departmentKey = normalizeDepartmentKey(department.name);

    const officerProfile =
      OFFICER_BY_DEPARTMENT[departmentKey] ||
      getFallbackStaffProfile(department.name, ROLES.OFFICER, index);
    const officerEmail = toEmail(officerProfile.localPart);
    const officer = await upsertStaffUser({
      name: officerProfile.name,
      email: officerEmail,
      role: ROLES.OFFICER,
      departmentId: department._id,
      password: DEFAULT_PASSWORD,
      serialField: "officerId",
      assignSerial: () => formatSerial("O", nextOfficerNumber++),
    });

    const workerProfile =
      WORKER_BY_DEPARTMENT[departmentKey] ||
      getFallbackStaffProfile(department.name, ROLES.WORKER, index);
    const workerEmail = toEmail(workerProfile.localPart);
    const worker = await upsertStaffUser({
      name: workerProfile.name,
      email: workerEmail,
      role: ROLES.WORKER,
      departmentId: department._id,
      password: DEFAULT_PASSWORD,
      serialField: "workerId",
      assignSerial: () => formatSerial("W", nextWorkerNumber++),
    });

    await Department.updateOne(
      { _id: department._id },
      { $addToSet: { officers: officer._id } }
    );

    createdAccounts.push({
      name: officer.name,
      role: ROLES.OFFICER,
      department: department.name,
      email: officerEmail,
      password: DEFAULT_PASSWORD,
      staffId: officer.officerId || null,
    });
    createdAccounts.push({
      name: worker.name,
      role: ROLES.WORKER,
      department: department.name,
      email: workerEmail,
      password: DEFAULT_PASSWORD,
      staffId: worker.workerId || null,
    });
  }

  for (const volunteer of VOLUNTEER_ACCOUNTS) {
    const volunteerEmail = toEmail(volunteer.localPart);
    await upsertStaffUser({
      name: volunteer.name,
      email: volunteerEmail,
      role: ROLES.VOLUNTEER,
      departmentId: null,
      password: DEFAULT_PASSWORD,
    });

    createdAccounts.push({
      name: volunteer.name,
      role: ROLES.VOLUNTEER,
      department: "-",
      email: volunteerEmail,
      password: DEFAULT_PASSWORD,
      staffId: null,
    });
  }

  console.log("Seeded staff accounts:");
  console.log(JSON.stringify(createdAccounts, null, 2));

  await mongoose.disconnect();
  console.log("Department staff seed complete");
}

run().catch(async (error) => {
  console.error("Department staff seed failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
