jest.mock("../models/vote", () => ({
  create: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../models/issue", () => ({
  findById: jest.fn(),
}));
jest.mock("../services/priority.service", () => ({
  recomputeIssuePriority: jest.fn(async () => {}),
}));

const { upvoteIssue } = require("../controllers/vote.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("vote.controller", () => {
  it("blocks admin from voting", async () => {
    const req = {
      params: { issueId: "i1" },
      user: { _id: "admin1", role: "admin" },
    };
    const res = mockRes();

    await upvoteIssue(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Admins cannot vote on issues" })
    );
  });
});
