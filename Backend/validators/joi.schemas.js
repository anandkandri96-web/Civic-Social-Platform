const Joi = require("joi");
const { ISSUE_CATEGORIES } = require("../utils/constants");
const { DEPARTMENT_NAMES } = require("../utils/constants");
const { ROLES } = require("../config/roles");
const { REQUESTABLE_UPGRADE_ROLES } = require("../constants/roleUpgrade");
const { ALL_STATUSES } = require("../config/issueStatusMachine");
const { TASK_STATUSES } = require("../constants/taskStatus");

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]{8,128}$/;
const uriOpts = { allowRelative: false };

const issueCreate = Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().min(10).max(2000).required(),
  category: Joi.string()
    .valid(...ISSUE_CATEGORIES)
    .required(),
  severity: Joi.number().integer().min(1).max(4).required(),
  lat: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  lng: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  locationText: Joi.string().trim().min(1).max(200).required(),
  images: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  idempotencyKey: Joi.string().trim().max(128).optional(),
});

const issueUpdate = Joi.object({
  title: Joi.string().trim().min(3).max(120),
  description: Joi.string().trim().min(10).max(2000),
  category: Joi.string().valid(...ISSUE_CATEGORIES),
  severity: Joi.number().integer().min(1).max(4),
  lat: Joi.alternatives().try(Joi.number(), Joi.string()),
  lng: Joi.alternatives().try(Joi.number(), Joi.string()),
  locationText: Joi.string().trim().min(1).max(200),
  images: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
}).min(1);

const issueStatusBody = Joi.object({
  status: Joi.string().trim().min(2).max(64).required(),
});

const authRegister = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed.",
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Confirm password must match password',
      'any.required': 'Confirm password is required',
    }),
  role: Joi.string()
    .valid(ROLES.CITIZEN, ROLES.VOLUNTEER)
    .default(ROLES.CITIZEN),
});

const authLogin = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(1).max(128).required(),
});

const updateMeNamePattern = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;
const authUpdateMe = Joi.object({
  name: Joi.string().trim().pattern(updateMeNamePattern).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  password: Joi.string().pattern(passwordPattern).optional().messages({
    "string.pattern.base": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed.",
  }),
  confirmPassword: Joi.any().when('password', {
      is: Joi.exist(),
      then: Joi.valid(Joi.ref('password')).required().messages({
        'any.only': 'Confirm password must match password',
        'any.required': 'Confirm password is required when updating password',
      }),
      otherwise: Joi.forbidden(),
    }),
})
  .min(1)
  .messages({
    "object.min": "At least one of name, email, or password must be provided",
  });

const commentCreate = Joi.object({
  message: Joi.string().trim().min(2).max(1000).required(),
  images: Joi.array().items(Joi.string().uri(uriOpts)).max(3).optional(),
});

const commentUpdate = Joi.object({
  message: Joi.string().trim().min(2).max(1000).optional(),
  images: Joi.array().items(Joi.string().uri(uriOpts)).max(3).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one of message or images must be provided",
  });

const taskCreate = Joi.object({
  issueId: Joi.string().hex().length(24).required(),
  workerId: Joi.string().hex().length(24).required(),
});

const assignWorkerBody = Joi.object({
  workerId: Joi.alternatives()
    .try(Joi.string().hex().length(24), Joi.string().pattern(/^W-\d{3,}$/i))
    .required(),
});

const updateTaskStatus = Joi.object({
  status: Joi.string()
    .valid(...TASK_STATUSES)
    .required(),
  completionReport: Joi.when("status", {
    is: "completed",
    then: Joi.string().trim().min(10).max(2000).required(),
    otherwise: Joi.string().trim().max(2000).allow(""),
  }),
  complicationReport: Joi.when("status", {
    is: "complication_reported",
    then: Joi.string().trim().min(10).max(2000).required(),
    otherwise: Joi.string().trim().max(2000).allow(""),
  }),
  progressImages: Joi.array().items(Joi.string().uri(uriOpts)).max(5).optional(),
});

const addTaskProgress = Joi.object({
  notes: Joi.string().trim().max(1000).allow(""),
  progressImages: Joi.array().items(Joi.string().uri(uriOpts)).max(5).optional(),
  completionReport: Joi.string().trim().max(2000).allow(""),
  complicationReport: Joi.string().trim().max(2000).allow(""),
}).custom((value, helpers) => {
  if (value.notes !== undefined && value.notes !== null && String(value.notes).trim().length > 0 && String(value.notes).trim().length < 5) {
    return helpers.error("any.custom", { message: "notes must be at least 5 characters when provided" });
  }
  return value;
});

const coverageAreaSchema = Joi.object({
  type: Joi.string().valid("Polygon").required(),
  coordinates: Joi.array().required(),
});

const departmentCreate = Joi.object({
  name: Joi.string()
    .trim()
    .valid(...DEPARTMENT_NAMES)
    .required(),
  description: Joi.string().trim().max(500).allow(""),
  categories: Joi.array()
    .items(Joi.string().valid(...ISSUE_CATEGORIES))
    .min(1)
    .required(),
  officers: Joi.array().items(Joi.string().hex().length(24)).optional(),
  contactEmail: Joi.string().email({ tlds: { allow: false } }).optional(),
  serviceArea: Joi.string().trim().max(200).allow(""),
  coverageArea: coverageAreaSchema.optional(),
});

const departmentUpdate = Joi.object({
  name: Joi.string()
    .trim()
    .valid(...DEPARTMENT_NAMES)
    .optional(),
  description: Joi.string().trim().max(500).allow(""),
  categories: Joi.array()
    .items(Joi.string().valid(...ISSUE_CATEGORIES))
    .min(1)
    .optional(),
  officers: Joi.array().items(Joi.string().hex().length(24)).optional(),
  contactEmail: Joi.string().email({ tlds: { allow: false } }).optional(),
  serviceArea: Joi.string().trim().max(200).allow(""),
  coverageArea: coverageAreaSchema.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const roleUpgradeCreate = Joi.object({
  requestedRole: Joi.string()
    .valid(...REQUESTABLE_UPGRADE_ROLES)
    .required(),
  motivation: Joi.string().trim().min(10).max(1000).required(),
  experience: Joi.string().trim().min(10).max(500).allow("").optional(),
  availability: Joi.string().trim().max(200).allow("").optional(),
  skills: Joi.string().trim().max(500).allow("").optional(),
  preferredDepartment: Joi.string().trim().max(120).allow("").optional(),
  supportingLinks: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(500)).max(3),
      Joi.string().max(1500).allow("")
    )
    .optional(),
});

const roleUpgradeReviewDecision = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  adminNotes: Joi.when("status", {
    is: "rejected",
    then: Joi.string().trim().min(1).max(500).required(),
    otherwise: Joi.string().trim().max(500).allow(""),
  }),
  departmentId: Joi.string().hex().length(24).optional(),
});

const officerReviewIssue = Joi.object({
  notes: Joi.string().trim().max(1000).allow(""),
  assignedDepartment: Joi.string().hex().length(24).optional(),
});

const officerUpdateIssueStatus = Joi.object({
  status: Joi.string()
    .valid(...ALL_STATUSES)
    .required(),
  notes: Joi.string().trim().max(500).allow(""),
});

const volunteerSubmitResolution = Joi.object({
  report: Joi.string().trim().min(20).max(3000).required(),
  reportText: Joi.string().trim().min(20).max(3000).optional(),
  proof: Joi.array().items(Joi.string().uri(uriOpts)).max(5).optional(),
});

const volunteerUpdateProgress = Joi.object({
  notes: Joi.string().trim().max(500).optional().allow(""),
  progressImages: Joi.array().items(Joi.string().uri(uriOpts)).max(5).optional(),
}).custom((value, helpers) => {
  const n = value.notes && String(value.notes).trim().length >= 5;
  const imgs = Array.isArray(value.progressImages) && value.progressImages.filter(Boolean).length > 0;
  if (!n && !imgs) {
    return helpers.error("any.custom", {
      message: "Provide notes (at least 5 characters) or at least one progressImages URI",
    });
  }
  if (value.notes !== undefined && value.notes !== null && String(value.notes).trim().length > 0 && String(value.notes).trim().length < 5) {
    return helpers.error("any.custom", { message: "notes must be at least 5 characters when provided" });
  }
  return value;
});

const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const analyticsQuery = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(5000).default(500),
});

// Admin User Management Schemas
const adminCreateUser = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base": "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character. No spaces allowed.",
    }),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required(),
  departmentId: Joi.string().hex().length(24).optional(),
  isApproved: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
});

const adminUpdateUserRole = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required(),
  departmentId: Joi.string().hex().length(24).optional(),
});

const adminUpdateUserStatus = Joi.object({
  isActive: Joi.boolean().required(),
});

const adminAssignUserDepartment = Joi.object({
  departmentId: Joi.string().hex().length(24).required(),
});

module.exports = {
  issueCreate,
  issueUpdate,
  issueStatusBody,
  authRegister,
  authLogin,
  authUpdateMe,
  commentCreate,
  commentUpdate,
  taskCreate,
  assignWorkerBody,
  updateTaskStatus,
  addTaskProgress,
  departmentCreate,
  departmentUpdate,
  roleUpgradeCreate,
  roleUpgradeReviewDecision,
  officerReviewIssue,
  officerUpdateIssueStatus,
  volunteerSubmitResolution,
  volunteerUpdateProgress,
  paginationQuery,
  analyticsQuery,
  adminCreateUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminAssignUserDepartment,
};
