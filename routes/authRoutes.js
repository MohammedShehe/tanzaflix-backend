// routes/authRoutes.js
const router = require("express").Router();
const auth = require("../controllers/authController");

// Login & OTP
router.post("/login", auth.login);
router.post("/verify-otp", auth.verifyOTP);

// Resend OTP
router.post("/resend-otp", auth.resendLoginOTP);        // For admin login
router.post("/resend-reset-otp", auth.resendResetOTP);  // For password reset

// Forgot Password
router.post("/forgot-password", auth.forgotPassword);
router.post("/verify-forgot-otp", auth.verifyForgotPasswordOTP);
router.post("/reset-password", auth.resetPassword);

module.exports = router;