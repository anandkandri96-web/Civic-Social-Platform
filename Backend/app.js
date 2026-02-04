// // backend/app.js

// const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// const morgan = require("morgan");

// const connectDB = require("./config/db");
// const errorHandler = require("./middlewares/error.middleware");
// // const rateLimit = require("./middlewares/rateLimit.middleware"); // ❌ commented → so must not be used

// // Routes
// const authRoutes = require("./routes/auth.routes");
// const issueRoutes = require("./routes/issue.routes");
// // const voteRoutes = require("./routes/vote.routes"); // ❌ file does not exist
// const adminRoutes = require("./routes/admin.routes");
// // const notificationRoutes = require("./routes/notification.routes"); // ❌ file does not exist
// // const analyticsRoutes = require("./routes/analytics.routes"); // ❌ file does not exist

// const app = express();

// /**
//  * Database connection
//  * (kept here since server.js handles listen lifecycle)
//  */
// // connectDB(); // ⚠️ optional but NOT crashing, kept commented as you had it

// /**
//  * Global Security & Parsing Middleware
//  */
// app.use(helmet());

// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "*",
//     credentials: true,
//   })
// );

// // Body size limits (important for image uploads)
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// // Dev logging
// if (process.env.NODE_ENV !== "production") {
//   app.use(morgan("dev"));
// }

// // Rate limiting (global)
// // app.use(rateLimit); // ❌ CRASHING LINE → rateLimit not imported

// /**
//  * API Routes
//  */
// app.use("/api/auth", authRoutes);
// app.use("/api/issues", issueRoutes);
// // app.use("/api/votes", voteRoutes); // ❌ file does not exist
// app.use("/api/admin", adminRoutes);
// // app.use("/api/notifications", notificationRoutes); // ❌ file does not exist
// // app.use("/api/analytics", analyticsRoutes); // ❌ file does not exist

// /**
//  * 404 Handler
//  */
// app.use((req, res, next) => {
//   res.status(404).json({
//     success: false,
//     message: "API route not found",
//   });
// });

// /**
//  * Global Error Handler
//  */
// app.use(errorHandler);

// module.exports = app;


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const issueRoutes = require("./routes/issue.routes");
const voteRoutes = require("./routes/vote.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());

const clientUrl = process.env.CLIENT_URL;
app.use(cors({
  origin: function (origin, cb) {
    // Allow same-origin / server-to-server / Postman (no origin)
    if (!origin) return cb(null, true);

    // In production, require explicit CLIENT_URL allowlist.
    if (process.env.NODE_ENV === "production") {
      if (!clientUrl) return cb(new Error("CORS misconfigured: CLIENT_URL is required"), false);
      return cb(null, origin === clientUrl);
    }

    // Dev: allow configured clientUrl or localhost vite
    const allowed = new Set([clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean));
    return cb(null, allowed.has(origin));
  },
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;
