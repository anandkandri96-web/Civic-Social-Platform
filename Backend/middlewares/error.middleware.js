const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (err && err.name === "MulterError") {
    return res.status(400).json({ message: err.message || "Upload error" });
  }

  logger.error("Request error", {
    message: err.message,
    status,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  if (!isProd) {
    console.error(err);
  }

  const message = isProd
    ? status >= 500
      ? "Internal server error"
      : err.message || "Request failed"
    : err.message || "Server error";

  const body = { message };
  if (!isProd && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};
