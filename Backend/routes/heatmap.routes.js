const router = require("express").Router();
const { getPublicHeatmap } = require("../controllers/heatmap.controller");

// GET /api/heatmap (public)
router.get("/", getPublicHeatmap);

module.exports = router;

