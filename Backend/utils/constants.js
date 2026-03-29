const { ROLES } = require("../config/roles");
const ISSUE_STATUS = require("../constants/issueStatus");

const ISSUE_CATEGORIES = Object.freeze([
  "roads",
  "electricity",
  "garbage",
  "drainage",
  "water",
  "other",
]);

const CATEGORY_DEPARTMENT_MAP = Object.freeze({
  roads: "Municipal Roads Department",
  electricity: "Electricity Services Department",
  garbage: "Waste Management Department",
  drainage: "Drainage Management Department",
  water: "Water Supply Department",
  other: "General Services Department",
});

const DEPARTMENT_NAMES = Object.freeze(Object.values(CATEGORY_DEPARTMENT_MAP));

const STATUS_TRANSITIONS = Object.freeze({
  [ISSUE_STATUS.REPORTED]: [
    ISSUE_STATUS.UNDER_REVIEW,
    ISSUE_STATUS.VOLUNTEER_CLAIMED,
    ISSUE_STATUS.REJECTED,
  ],
  [ISSUE_STATUS.UNDER_REVIEW]: [
    ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
    ISSUE_STATUS.VOLUNTEER_CLAIMED,
    ISSUE_STATUS.REJECTED,
  ],
  [ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT]: [ISSUE_STATUS.WORK_IN_PROGRESS],
  [ISSUE_STATUS.WORK_IN_PROGRESS]: [ISSUE_STATUS.RESOLVED],
  [ISSUE_STATUS.VOLUNTEER_CLAIMED]: [ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS],
  [ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS]: [ISSUE_STATUS.RESOLVED_BY_COMMUNITY],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CITIZEN_VERIFIED],
  [ISSUE_STATUS.RESOLVED_BY_COMMUNITY]: [ISSUE_STATUS.CITIZEN_VERIFIED],
  [ISSUE_STATUS.CITIZEN_VERIFIED]: [ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.REJECTED]: [],
  [ISSUE_STATUS.CLOSED]: [],
});

module.exports = {
  ROLES,
  ISSUE_STATUS,
  ISSUE_CATEGORIES,
  CATEGORY_DEPARTMENT_MAP,
  DEPARTMENT_NAMES,
  STATUS_TRANSITIONS,
};
