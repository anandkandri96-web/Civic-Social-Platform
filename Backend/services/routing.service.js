const Department = require("../models/department");
const { CATEGORY_DEPARTMENT_MAP } = require("../utils/constants");

const normalizeCategory = (category) => String(category || "").trim().toLowerCase();

async function getOrCreateDepartmentByCategory(category, location = null) {
  const normalized = normalizeCategory(category);
  const mappedName = CATEGORY_DEPARTMENT_MAP[normalized] || CATEGORY_DEPARTMENT_MAP.other;

  // Prefer geo-coverage match when location is available.
  if (location?.type === "Point" && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const geoMatch = await Department.findOne({
      isActive: true,
      categories: normalized,
      coverageArea: {
        $geoIntersects: {
          $geometry: location,
        },
      },
    });
    if (geoMatch) return geoMatch;
  }

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
