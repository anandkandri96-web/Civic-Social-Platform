const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");
const {
  createRoleUpgradeRequest,
  getMyRoleUpgradeRequests,
} = require("../controllers/roleUpgrade.controller");

router.use(protect);

router.post(
  "/",
  canPerform(PERMISSIONS.ROLE_UPGRADE_REQUEST),
  validateRequest(schemas.roleUpgradeCreate),
  createRoleUpgradeRequest
);
router.get("/my", canPerform(PERMISSIONS.ROLE_UPGRADE_REQUEST), getMyRoleUpgradeRequests);

module.exports = router;
