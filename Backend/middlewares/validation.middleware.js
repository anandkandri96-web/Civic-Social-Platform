const { apiResponse } = require("../utils/apiResponse");

const parsePositiveInteger = (value, fallback) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return n;
};

exports.validatePagination = (defaultPage = 1, defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = parsePositiveInteger(req.query.page, defaultPage);
    const limit = Math.min(maxLimit, parsePositiveInteger(req.query.limit, defaultLimit));

    req.query.page = page;
    req.query.limit = limit;

    next();
  };
};

exports.validateSort = (allowed = ["createdAt", "-createdAt", "priority", "-priority", "largestVote", "-voteCount"]) => {
  return (req, res, next) => {
    const rawSort = String(req.query.sort || "").trim();

    if (!rawSort) {
      req.query.sort = "priority";
      return next();
    }

    if (!allowed.includes(rawSort)) {
      return apiResponse(res, 400, "Invalid sort parameter");
    }

    req.query.sort = rawSort;
    next();
  };
};

exports.validateLatitudeLongitude = (req, res, next) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return apiResponse(res, 400, "Invalid latitude or longitude");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return apiResponse(res, 400, "Invalid latitude or longitude range");
  }

  next();
};
