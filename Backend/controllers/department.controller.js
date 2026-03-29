const Department = require("../models/department");
const { apiResponse } = require("../utils/apiResponse");
const { DEPARTMENT_NAMES } = require("../utils/constants");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, categories, officers, contactEmail, serviceArea, coverageArea } = req.body;

    if (!name || !name.trim()) {
      return apiResponse(res, 400, "Department name is required");
    }

    const normalizedName = String(name).trim().replace(/\s+/g, " ");
    if (!DEPARTMENT_NAMES.includes(normalizedName)) {
      return apiResponse(
        res,
        400,
        `Department name must be one of: ${DEPARTMENT_NAMES.join(", ")}`
      );
    }
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(normalizedName)}$`, "i") },
    });
    if (existing) {
      return apiResponse(res, 409, "Department with this name already exists");
    }

    const department = await Department.create({
      name: normalizedName,
      description: description?.trim() || "",
      categories: categories || [],
      officers: officers || [],
      contactEmail: contactEmail?.trim(),
      serviceArea: serviceArea?.trim() || "",
      coverageArea: coverageArea || null,
    });

    return apiResponse(res, 201, "Department created successfully", department);
  } catch (error) {
    console.error("Create department error:", error);
    return apiResponse(res, 500, "Failed to create department");
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .sort({ name: 1 });

    return apiResponse(res, 200, "Departments retrieved successfully", departments);
  } catch (error) {
    console.error("Get departments error:", error);
    return apiResponse(res, 500, "Failed to fetch departments");
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categories, officers, contactEmail, serviceArea, coverageArea, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return apiResponse(res, 404, "Department not found");
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim().replace(/\s+/g, " ");
      if (!trimmedName) {
        return apiResponse(res, 400, "Department name cannot be empty");
      }
      if (!DEPARTMENT_NAMES.includes(trimmedName)) {
        return apiResponse(
          res,
          400,
          `Department name must be one of: ${DEPARTMENT_NAMES.join(", ")}`
        );
      }

      const existing = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") },
      });
      if (existing) {
        return apiResponse(res, 409, "Department with this name already exists");
      }

      department.name = trimmedName;
    }

    if (description !== undefined) {
      department.description = description?.trim() || "";
    }

    if (categories !== undefined) {
      department.categories = categories || [];
    }

    if (officers !== undefined) {
      department.officers = officers || [];
    }

    if (contactEmail !== undefined) {
      department.contactEmail = contactEmail?.trim();
    }

    if (serviceArea !== undefined) {
      department.serviceArea = serviceArea?.trim() || "";
    }

    if (coverageArea !== undefined) {
      department.coverageArea = coverageArea;
    }

    if (isActive !== undefined) {
      department.isActive = isActive;
    }

    await department.save();

    return apiResponse(res, 200, "Department updated successfully", department);
  } catch (error) {
    console.error("Update department error:", error);
    return apiResponse(res, 500, "Failed to update department");
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return apiResponse(res, 404, "Department not found");
    }

    // Check if department has assigned issues
    const Issue = require("../models/issue");
    const assignedIssues = await Issue.countDocuments({ assignedDepartment: id });
    if (assignedIssues > 0) {
      return apiResponse(res, 400, "Cannot delete department with assigned issues");
    }

    await Department.findByIdAndDelete(id);

    return apiResponse(res, 200, "Department deleted successfully");
  } catch (error) {
    console.error("Delete department error:", error);
    return apiResponse(res, 500, "Failed to delete department");
  }
};
