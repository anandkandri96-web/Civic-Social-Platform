jest.mock("../models/user", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mock-token"),
}));

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { register, login } = require("../controllers/auth.controller");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("auth.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers new users as citizens and auto-approves", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "u1",
      name: "Vol User",
      email: "v@x.com",
      role: "citizen",
      isApproved: true,
    });

    const req = {
      body: {
        name: "Vol User",
        email: "v@x.com",
        password: "Password123",
        role: "volunteer",
      },
    };
    const res = mockRes();

    await register(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "citizen",
        isApproved: true,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("blocks login for unapproved volunteer", async () => {
    const pendingVolunteer = {
      _id: "u2",
      name: "Pending",
      email: "pending@x.com",
      password: "hashed",
      role: "volunteer",
      isActive: true,
      isApproved: false,
    };
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(pendingVolunteer),
    });
    bcrypt.compare.mockResolvedValue(true);

    const req = { body: { email: "pending@x.com", password: "Password123" } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Account pending admin approval" })
    );
  });
});
