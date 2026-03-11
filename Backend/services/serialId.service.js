const User = require("../models/user");

function formatSerial(prefix, n) {
  const num = Number(n);
  const safe = Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
  const width = Math.max(3, String(safe).length);
  return `${prefix}-${String(safe).padStart(width, "0")}`;
}

function parseSerial(prefix, raw) {
  const value = String(raw || "").trim().toUpperCase();
  const re = new RegExp(`^${prefix}-\\d+$`);
  if (!re.test(value)) return null;
  const parts = value.split("-");
  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

async function getMaxSerialNumber(field, prefix) {
  const re = new RegExp(`^${prefix}-\\d+$`);
  const rows = await User.aggregate([
    { $match: { [field]: { $type: "string" } } },
    {
      $project: {
        serial: {
          $toUpper: {
            $trim: { input: `$${field}` },
          },
        },
      },
    },
    { $match: { serial: { $regex: re } } },
    { $project: { n: { $toInt: { $arrayElemAt: [{ $split: ["$serial", "-"] }, 1] } } } },
    { $sort: { n: -1 } },
    { $limit: 1 },
  ]);

  const max = rows?.[0]?.n;
  return Number.isFinite(max) ? max : 0;
}

async function generateNextSerialId(field, prefix) {
  const max = await getMaxSerialNumber(field, prefix);
  return formatSerial(prefix, max + 1);
}

async function generateNextWorkerId() {
  return generateNextSerialId("workerId", "W");
}

async function generateNextOfficerId() {
  return generateNextSerialId("officerId", "O");
}

module.exports = {
  formatSerial,
  parseSerial,
  getMaxSerialNumber,
  generateNextWorkerId,
  generateNextOfficerId,
};
