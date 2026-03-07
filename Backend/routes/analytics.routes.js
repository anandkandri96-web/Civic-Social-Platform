const router = require("express").Router();
const { getTrends, getHeatmap } = require("../controllers/analytics.controller");
const { protect, checkRole } = require("../middlewares/auth.middleware");

router.get("/trends", protect, checkRole(["admin", "officer"]), getTrends);
router.get("/heatmap", protect, checkRole(["admin", "officer"]), getHeatmap);

module.exports = router;