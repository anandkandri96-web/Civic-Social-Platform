const router = require("express").Router();
const { getTrends } = require("../controllers/analytics.controller");
const { protect, checkRole } = require("../middlewares/auth.middleware");

router.get("/trends", protect, checkRole(["admin", "officer"]), getTrends);

module.exports = router;
