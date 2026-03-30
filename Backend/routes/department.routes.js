const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../utils/constants");
const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");

router.use(protect, checkRole([ROLES.ADMIN]));

router.post("/", validateRequest(schemas.departmentCreate), createDepartment);
router.get("/", getDepartments);
router.put("/:id", validateRequest(schemas.departmentUpdate), updateDepartment);
router.delete("/:id", deleteDepartment);

module.exports = router;