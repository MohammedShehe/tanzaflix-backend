const router=require("express").Router();

const auth=require("../controllers/authController");

router.post("/login",auth.login);

router.post("/verify-otp",auth.verifyOTP);

module.exports=router;
