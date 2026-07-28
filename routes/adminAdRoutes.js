const router = require("express").Router();
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/adUpload");
const controller = require("../controllers/adminAdController");

// ==================== STATS ROUTE ====================
router.get("/stats", authenticate, isAdmin, controller.getAdStats);

// ==================== AD ROUTES ====================

// Create ad
router.post(
    "/",
    authenticate,
    isAdmin,
    upload.single("image"),
    controller.createAd
);

// Get all ads (admin)
router.get("/", authenticate, isAdmin, controller.getAds);

// Get active ads (for users - no auth required)
router.get("/active", controller.getActiveAds);

// Get single ad
router.get("/:id", authenticate, isAdmin, controller.getAd);

// Update ad
router.put(
    "/:id",
    authenticate,
    isAdmin,
    upload.single("image"),
    controller.updateAd
);

// Delete ad
router.delete("/:id", authenticate, isAdmin, controller.deleteAd);

// Toggle ad status (activate/deactivate)
router.patch("/:id/toggle", authenticate, isAdmin, controller.toggleAdStatus);

// Track ad click (redirect to URL)
router.get("/:id/click", controller.trackAdClick);

module.exports = router;