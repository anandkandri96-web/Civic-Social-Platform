// // backend/utils/apiResponse.js

// const apiResponse = (
//   res,
//   statusCode,
//   message,
//   data = null,
//   meta = null
// ) => {
//   const response = {
//     success: statusCode < 400,
//     message,
//     data,
//   };

//   if (meta) {
//     response.meta = meta;
//   }

//   response.timestamp = new Date().toISOString();

//   return res.status(statusCode).json(response);
// };

// /**
//  * Helper for error responses
//  */
// const errorResponse = (res, statusCode, message, errors = null) => {
//   const response = {
//     success: false,
//     message,
//     errors,
//     timestamp: new Date().toISOString(),
//   };

//   return res.status(statusCode).json(response);
// };

// module.exports = {
//   apiResponse,
//   errorResponse,
// };

const apiResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: statusCode < 400,
    message,
    data,
  };
  if (meta) response.meta = meta;
  response.timestamp = new Date().toISOString();
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

exports.apiResponse = apiResponse;
exports.errorResponse = errorResponse;
exports.success = (res, data, message = "Success") => {
  res.json({ success: true, message, data });
};
exports.error = (res, message, code = 500) => {
  res.status(code).json({ success: false, message });
};
