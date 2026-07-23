const router = require("express").Router();
const paymentController = require("../controllers/paymentController");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");

// ==================== USER ROUTES ====================
// Create payment
router.post("/create", authenticate, paymentController.createPayment);

// Check payment status
router.get("/status/:reference", authenticate, paymentController.getPaymentStatus);

// Get user payment history
router.get("/history", authenticate, paymentController.getPaymentHistory);

// Get user subscription status
router.get("/subscription/status", authenticate, paymentController.getSubscriptionStatus);

// Cancel subscription (end of period)
router.post("/subscription/cancel", authenticate, paymentController.cancelSubscription);

// ==================== WEBHOOK (NO AUTH - AZAMPAY CALLS THIS) ====================
router.post("/webhook", paymentController.azamPayCallback);

// ==================== ADMIN ROUTES ====================
// Get all payments (admin)
router.get("/admin/all", authenticate, isAdmin, paymentController.adminGetAllPayments);

// Get payment statistics (admin)
router.get("/admin/stats", authenticate, isAdmin, paymentController.adminGetPaymentStats);

// Get all subscriptions (admin)
router.get("/admin/subscriptions", authenticate, isAdmin, paymentController.adminGetAllSubscriptions);

// Cancel subscription immediately (admin)
router.post("/admin/subscription/cancel/:userId", authenticate, isAdmin, paymentController.cancelSubscriptionImmediately);

module.exports = router;