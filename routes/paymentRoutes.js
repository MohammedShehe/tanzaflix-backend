const router = require("express").Router();

const paymentController = require("../controllers/paymentController");

const { authenticate } = require("../middleware/authMiddleware");

router.post(
    "/create",
    authenticate,
    paymentController.createPayment
);

module.exports = router;
