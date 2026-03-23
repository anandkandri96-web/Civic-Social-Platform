require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const { ROLES } = require("./utils/constants");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicdb";

async function createTestUsers() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const testUsers = [
    {
      name: 'Test Citizen',
      email: 'citizen@test.com',
      password: 'password123',
      role: ROLES.CITIZEN,
      isActive: true,
      isApproved: true,
    },
    {
      name: 'Test Volunteer',
      email: 'volunteer@test.com',
      password: 'password123',
      role: ROLES.VOLUNTEER,
      isActive: true,
      isApproved: true,
    },
    {
      name: 'Test Officer',
      email: 'officer@test.com',
      password: 'password123',
      role: ROLES.OFFICER,
      isActive: true,
      isApproved: true,
    },
    {
      name: 'Test Worker',
      email: 'worker@test.com',
      password: 'password123',
      role: ROLES.WORKER,
      isActive: true,
      isApproved: true,
    },
  ];

  for (const userData of testUsers) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      await User.create(userData);
      console.log(`Created test user: ${userData.email}`);
    } else {
      console.log(`Test user already exists: ${userData.email}`);
    }
  }

  await mongoose.disconnect();
  console.log("Test users creation complete");
}

createTestUsers().catch(console.error);