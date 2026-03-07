const { ISSUE_CATEGORIES, CATEGORY_DEPARTMENT_MAP, ROLES, ISSUE_STATUS } = require("../utils/constants");

describe("constants", () => {
  it("exposes required roles", () => {
    expect(ROLES).toHaveProperty("CITIZEN");
    expect(ROLES).toHaveProperty("VOLUNTEER");
    expect(ROLES).toHaveProperty("OFFICER");
    expect(ROLES).toHaveProperty("WORKER");
    expect(ROLES).toHaveProperty("ADMIN");
  });

  it("has category to department mappings for all categories", () => {
    for (const category of ISSUE_CATEGORIES) {
      expect(CATEGORY_DEPARTMENT_MAP[category]).toBeTruthy();
    }
  });

  it("includes core lifecycle statuses", () => {
    expect(Object.values(ISSUE_STATUS)).toEqual(
      expect.arrayContaining([
        "reported",
        "under_review",
        "assigned_to_department",
        "work_in_progress",
        "resolved",
        "citizen_verified",
        "closed",
      ])
    );
  });
});
