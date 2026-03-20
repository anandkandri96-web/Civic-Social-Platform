const {
  hasPermission,
  canPerformResourceAction,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLES,
} = require("../config/permissions.config");

describe("RBAC core checks", () => {
  it("should give officers review permission", () => {
    expect(ROLE_PERMISSIONS[ROLES.OFFICER].has(PERMISSIONS.OFFICER_REVIEW_ISSUE)).toBe(true);
  });

  it("should deny citizen permission update issue status", () => {
    const citizen = { _id: "user1", role: ROLES.CITIZEN }; 
    const issue = { assignedDepartment: "dept1", reportedBy: "user1", status: "reported" };
    expect(canPerformResourceAction(citizen, "ISSUE", "UPDATE_STATUS", issue)).toBe(false);
  });

  it("should allow officer to update status within department", () => {
    const officer = { _id: "off1", role: ROLES.OFFICER, department: "dept1" };
    const issue = { assignedDepartment: "dept1", reportedBy: "user2", status: "reported" };
    expect(canPerformResourceAction(officer, "ISSUE", "UPDATE_STATUS", issue)).toBe(true);
  });

  it("should block officer from other department issue", () => {
    const officer = { _id: "off1", role: ROLES.OFFICER, department: "dept2" };
    const issue = { assignedDepartment: "dept1", reportedBy: "user2", status: "reported" };
    expect(canPerformResourceAction(officer, "ISSUE", "UPDATE_STATUS", issue)).toBe(false);
  });

  it("should allow admin to delete any issue", () => {
    const admin = { _id: "admin1", role: ROLES.ADMIN };
    const issue = { assignedDepartment: "dept1", reportedBy: "user2", status: "reported" };
    expect(canPerformResourceAction(admin, "ISSUE", "DELETE", issue)).toBe(true);
  });
});