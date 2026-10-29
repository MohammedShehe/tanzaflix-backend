const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const controller = require("../controllers/moviePurchaseController");

// Create purchase for a movie
router.post("/create/:id", authenticate, controller.createMoviePurchase);

// Verify purchase status
router.get("/verify/:reference", authenticate, controller.verifyPurchase);

// Webhook (no auth - Snippe calls this; prefer /api/payments/webhook)
router.post("/webhook", controller.handlePurchaseCallback);

module.exports = router;