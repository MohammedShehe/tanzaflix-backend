const router = require("express").Router();

const planController = require("../controllers/planController");
const { authenticate } = require("../middleware/authMiddleware");

router.get("/", authenticate, planController.getPlans);

module.exports = router;
