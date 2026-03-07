jest.mock("../models/issue", () => ({
  findById: jest.fn(),
}));
jest.mock("../models/vote", () => ({}));
jest.mock("../models/user", () => ({}));
jest.mock("../services/routing.service", () => ({
  getOrCreateDepartmentByCategory: jest.fn(),
  normalizeCategory: (c) => String(c || "").toLowerCase(),
}));
jest.mock("../services/priority.service", () => ({
  recomputeIssuePriority: jest.fn(async () => {}),
}));
jest.mock("../services/notification.service", () => ({
  createNotificationsBulk: jest.fn(async () => {}),
  createNotification: jest.fn(async () => {}),
}));

const Issue = require("../models/issue");
const { updateIssue } = require("../controllers/issue.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("issue.controller updateIssue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects update after assignment", async () => {
    Issue.findById.mockResolvedValue({
      _id: "i1",
      reportedBy: "u1",
      status: "assigned_to_department",
    });

    const req = {
      params: { id: "i1" },
      user: { _id: "u1" },
      body: { title: "Updated title" },
    };
    const res = mockRes();

    await updateIssue(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Issue can only be edited before assignment" })
    );
  });

  it("allows reporter update while reported", async () => {
    const issueDoc = {
      _id: "i2",
      reportedBy: "u2",
      status: "reported",
      title: "Old",
      description: "Old description text",
      category: "roads",
      severity: 2,
      save: jest.fn().mockResolvedValue(true),
    };
    Issue.findById.mockResolvedValue(issueDoc);

    const req = {
      params: { id: "i2" },
      user: { _id: "u2" },
      body: { title: "New title", description: "New description content here" },
    };
    const res = mockRes();

    await updateIssue(req, res);

    expect(issueDoc.title).toBe("New title");
    expect(issueDoc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
