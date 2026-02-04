// // backend/middlewares/error.middleware.js

// const winston = require("winston");
// const { errorResponse } = require("../utils/apiResponse");

// /**
//  * Winston Logger
//  */
// const logger = winston.createLogger({
//   level: "error",
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({ filename: "logs/error.log" }),
//   ],
// });

// /**
//  * Global Error Handler
//  */
// module.exports = (err, req, res, next) => {
//   const statusCode = err.statusCode || 500;
//   const message = err.message || "Internal server error";

//   // Log full error internally
//   logger.error({
//     message,
//     statusCode,
//     stack: err.stack,
//     path: req.originalUrl,
//     method: req.method,
//   });

//   // Handle common error types
//   if (err.name === "ValidationError") {
//     return errorResponse(res, 400, "Validation error", err.errors);
//   }

//   if (err.name === "JsonWebTokenError") {
//     return errorResponse(res, 401, "Invalid token");
//   }

//   if (err.name === "TokenExpiredError") {
//     return errorResponse(res, 401, "Token expired");
//   }

//   // Default error
//   return errorResponse(
//     res,
//     statusCode,
//     process.env.NODE_ENV === "production"
//       ? "Internal server error"
//       : message
//   );
// };


module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;

  // Avoid leaking internals in production
  const isProd = process.env.NODE_ENV === "production";

  // Multer errors (file upload)
  if (err && err.name === "MulterError") {
    return res.status(400).json({ message: err.message || "Upload error" });
  }

  if (!isProd) {
    console.error(err);
  } else {
    // keep production logs minimal; don't dump secrets/stack to client
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}`);
  }

  const message = isProd
    ? (status >= 500 ? "Internal server error" : (err.message || "Request failed"))
    : (err.message || "Server error");

  res.status(status).json({ message });
};
