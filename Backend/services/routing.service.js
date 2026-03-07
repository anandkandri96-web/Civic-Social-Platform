const Department = require("../models/department");
const { CATEGORY_DEPARTMENT_MAP } = require("../utils/constants");

const normalizeCategory = (category) => String(category || "").trim().toLowerCase();

async function getOrCreateDepartmentByCategory(category) {
  const normalized = normalizeCategory(category);
  const mappedName = CATEGORY_DEPARTMENT_MAP[normalized] || CATEGORY_DEPARTMENT_MAP.other;

  let department = await Department.findOne({ name: mappedName, isActive: true });
  if (!department) {
    department = await Department.create({
      name: mappedName,
      categories: [normalized],
      description: `${mappedName} auto-created by routing service`,
    });
  }

  return department;
}

module.exports = { getOrCreateDepartmentByCategory, normalizeCategory };