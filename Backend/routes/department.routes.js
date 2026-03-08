const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../utils/constants");
const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

router.use(protect, checkRole([ROLES.ADMIN]));

router.post("/", createDepartment);
router.get("/", getDepartments);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

module.exports = router;