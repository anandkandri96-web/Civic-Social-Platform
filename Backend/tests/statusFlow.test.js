const { canTransition } = require("../utils/statusFlow");
const { ISSUE_STATUS, STATUS_TRANSITIONS } = require("../utils/constants");

describe("Issue status flow", () => {
  it("allows defined valid transitions", () => {
    expect(canTransition(ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW)).toBe(true);
    expect(canTransition(ISSUE_STATUS.UNDER_REVIEW, ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT)).toBe(true);
    expect(canTransition(ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CITIZEN_VERIFIED)).toBe(true);
  });

  it("rejects undefined transitions", () => {
    expect(canTransition(ISSUE_STATUS.REPORTED, ISSUE_STATUS.CLOSED)).toBe(false);
    expect(canTransition(ISSUE_STATUS.CLOSED, ISSUE_STATUS.REPORTED)).toBe(false);
    expect(canTransition("unknown", ISSUE_STATUS.REPORTED)).toBe(false);
  });

  it("keeps terminal states closed", () => {
    const terminal = [ISSUE_STATUS.REJECTED, ISSUE_STATUS.CLOSED];
    for (const state of terminal) {
      expect(Array.isArray(STATUS_TRANSITIONS[state])).toBe(true);
      expect(STATUS_TRANSITIONS[state].length).toBe(0);
    }
  });

  it("enforces community flow transitions", () => {
    expect(canTransition(ISSUE_STATUS.VOLUNTEER_CLAIMED, ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS)).toBe(true);
    expect(canTransition(ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS, ISSUE_STATUS.RESOLVED_BY_COMMUNITY)).toBe(true);
    expect(canTransition(ISSUE_STATUS.REPORTED, ISSUE_STATUS.RESOLVED)).toBe(false);
  });
});
