jest.mock("../models/issue", () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));
jest.mock("../models/task", () => ({
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../models/user", () => ({
  findOne: jest.fn(),
}));
jest.mock("../services/notification.service", () => ({
  createNotification: jest.fn(async () => {}),
}));

const Issue = require("../models/issue");
const { reviewIssue } = require("../controllers/officer.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("officer.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks officer from reviewing issue outside own department", async () => {
    Issue.findById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      assignedDepartment: "dep-2",
      status: "reported",
    });

    const req = {
      params: { issueId: "507f1f77bcf86cd799439011" },
      user: { _id: "off-1", role: "officer", department: "dep-1" },
    };
    const res = mockRes();

    await reviewIssue(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Officer can review only own department issues" })
    );
  });
});
