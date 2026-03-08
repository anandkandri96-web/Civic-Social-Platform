const router = require("express").Router();
const { getImageAsset } = require("../controllers/image.controller");

router.get("/:id", getImageAsset);

module.exports = router;