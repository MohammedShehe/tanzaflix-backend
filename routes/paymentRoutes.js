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

// ==================== WEBHOOK (NO AUTH - AZAMPAY CALLS THIS) ====================
router.post("/webhook", paymentController.azamPayCallback);

// ==================== ADMIN ROUTES ====================
// Get all payments (admin)
router.get("/admin/all", authenticate, isAdmin, paymentController.adminGetAllPayments);

// Get payment statistics (admin)
router.get("/admin/stats", authenticate, isAdmin, paymentController.adminGetPaymentStats);

module.exports = router;