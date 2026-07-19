const router=require("express").Router();

const auth=require("../controllers/authController");

router.post("/login",auth.login);

router.post("/verify-otp",auth.verifyOTP);

// Forgot Password
router.post("/forgot-password",auth.forgotPassword);

router.post("/verify-forgot-otp",auth.verifyForgotPasswordOTP);

router.post("/reset-password",auth.resetPassword);

module.exports=router;
