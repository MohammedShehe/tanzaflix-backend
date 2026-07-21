const router = require("express").Router();
const upload = require("../middleware/upload");
const {
    authenticate,
    isAdmin
} = require("../middleware/authMiddleware");
const controller = require("../controllers/adminUserController");

// ==================== STATS ROUTE ====================
router.get(
    "/stats",
    authenticate,
    isAdmin,
    controller.getUserStats
);

// ==================== USER ROUTES ====================

// Create user
router.post(
    "/create",
    authenticate,
    isAdmin,
    upload.single("profile_image"),
    controller.createUser
);

// Get all users
router.get(
    "/",
    authenticate,
    isAdmin,
    controller.getUsers
);

// Update user - This must come AFTER /stats
router.put(
    "/:id",
    authenticate,
    isAdmin,
    upload.single("profile_image"),
    controller.updateUser
);

// Delete user
router.delete(
    "/:id",
    authenticate,
    isAdmin,
    controller.deleteUser
);

module.exports = router;