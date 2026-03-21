// backend/config/db.js

const mongoose = require("mongoose");
const User = require("../models/user");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Global mongoose config
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== "production", // avoid heavy index builds in prod
      serverSelectionTimeoutMS: 5000,
    });

    console.log(
      `✅ MongoDB Connected | Host: ${conn.connection.host} | DB: ${conn.connection.name}`
    );

    if (process.env.NODE_ENV !== "production") {
      try {
        await User.syncIndexes();
      } catch (err) {
        console.warn("?? Failed to sync User indexes:", err.message);
      }
    }

    // Connection events (important for cron jobs)
    mongoose.connection.on("connected", () => {
      console.log("🟢 MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("🔴 MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("🟠 MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🛑 MongoDB connection closed due to app termination");
      process.exit(0);
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

