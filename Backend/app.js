const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

mongoose.set("strictQuery", true);

const authRoutes = require("./routes/auth.routes");
const issueRoutes = require("./routes/issue.routes");
const voteRoutes = require("./routes/vote.routes");
const commentRoutes = require("./routes/comment.routes");
const volunteerRoutes = require("./routes/volunteer.routes");
const officerRoutes = require("./routes/officer.routes");
const taskRoutes = require("./routes/task.routes");
const departmentRoutes = require("./routes/department.routes");
const adminRoutes = require("./routes/admin.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const heatmapRoutes = require("./routes/heatmap.routes");
const notificationRoutes = require("./routes/notification.routes");
const imageRoutes = require("./routes/image.routes");
const roleUpgradeRoutes = require("./routes/roleUpgrade.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// Allow the frontend (different origin in dev) to embed images served by this backend.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);

      if (process.env.NODE_ENV === "production") {
        if (!clientUrl) return cb(new Error("CORS misconfigured: CLIENT_URL is required"), false);
        return cb(null, origin === clientUrl);
      }

      const allowed = new Set([clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
      return cb(null, allowed.has(origin));
    },
    credentials: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "civic-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/officer", officerRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/heatmap", heatmapRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/role-upgrades", roleUpgradeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
