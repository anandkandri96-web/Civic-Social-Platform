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

const { STATUS_TRANSITIONS } = require("../config/issueStatusMachine");

module.exports = {
  ROLES,
  ISSUE_STATUS,
  ISSUE_CATEGORIES,
  CATEGORY_DEPARTMENT_MAP,
  DEPARTMENT_NAMES,
  STATUS_TRANSITIONS,
};
