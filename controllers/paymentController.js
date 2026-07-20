const db = require("../config/db");
const crypto = require("crypto");
const azampay = require("../services/azampayService");

// ==================== CREATE PAYMENT ====================
exports.createPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { planId, paymentMethod, phoneNumber } = req.body;

        // Validate input
        if (!planId || !paymentMethod || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Get plan from database
        const [plans] = await db.query(
            `SELECT * FROM plans WHERE id = ? AND status = 'active'`,
            [planId]
        );

        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Plan not found."
            });
        }

        const plan = plans[0];

        // Generate unique reference
        const paymentReference = "TFX-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

        // Save pending payment
        const [payment] = await db.query(
            `INSERT INTO payments (
                user_id, plan_id, payment_reference, payment_method, 
                phone_number, amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, plan.id, paymentReference, paymentMethod, phoneNumber, plan.price, "pending"]
        );

        // ============================
        // SEND PAYMENT TO AZAMPAY
        // ============================
        const checkoutPayload = {
            provider: paymentMethod,
            merchantAccountNumber: process.env.AZAMPAY_ACCOUNT_NUMBER,
            merchantName: "TanzaFlix",
            merchantMobileNumber: phoneNumber,
            currencyCode: "TZS",
            amount: plan.price.toString(),
            referenceId: paymentReference,
            merchantReferenceId: paymentReference,
            additionalProperties: {
                provider: paymentMethod
            },
            source: "TanzaFlix"
        };

        const checkoutResponse = await azampay.createCheckout(checkoutPayload);

        // Save AzamPay response
        await db.query(
            `UPDATE payments SET status = ?, gateway_response = ? WHERE id = ?`,
            ["processing", JSON.stringify(checkoutResponse), payment.insertId]
        );

        // Return response
        res.json({
            success: true,
            paymentId: payment.insertId,
            reference: paymentReference,
            amount: plan.price,
            currency: plan.currency,
            plan: plan.name,
            azampay: checkoutResponse,
            message: "Payment initiated successfully."
        });

    } catch (err) {
        console.log("Payment Error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: err.response?.data || err.message
        });
    }
};

// ==================== GET PAYMENT STATUS ====================
exports.getPaymentStatus = async (req, res) => {
    try {
        const { reference } = req.params;
        const userId = req.user.id;

        const [payments] = await db.query(
            `SELECT 
                id, 
                payment_reference, 
                amount, 
                currency,
                status, 
                payment_method,
                phone_number,
                paid_at,
                created_at,
                gateway_transaction_id
            FROM payments 
            WHERE payment_reference = ? AND user_id = ?`,
            [reference, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.json({
            success: true,
            payment: payments[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to get payment status"
        });
    }
};

// ==================== GET USER PAYMENT HISTORY ====================
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const [payments] = await db.query(
            `SELECT 
                p.id,
                p.payment_reference,
                p.amount,
                p.currency,
                p.status,
                p.payment_method,
                p.paid_at,
                p.created_at,
                pl.name as plan_name,
                pl.duration_days
            FROM payments p
            LEFT JOIN plans pl ON p.plan_id = pl.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT 50`,
            [userId]
        );

        res.json({
            success: true,
            payments
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to get payment history"
        });
    }
};

// ==================== AZAMPAY CALLBACK / WEBHOOK ====================
exports.azamPayCallback = async (req, res) => {
    try {
        console.log("AzamPay Callback Received:", JSON.stringify(req.body, null, 2));

        const {
            initiatorReferenceId,
            fspReferenceId,
            pgReferenceId,
            amount,
            status,
            message,
            operator
        } = req.body;

        // ============================
        // WEBHOOK SECURITY VERIFICATION
        // ============================
        // Uncomment when AzamPay provides webhook signature
        // const signature = req.headers['x-azampay-signature'];
        // if (!azampay.verifyWebhookSignature(req.body, signature, process.env.AZAMPAY_WEBHOOK_SECRET)) {
        //     return res.status(401).json({ error: 'Invalid signature' });
        // }

        // Find payment
        const [payments] = await db.query(
            `SELECT * FROM payments WHERE payment_reference = ?`,
            [initiatorReferenceId]
        );

        if (payments.length === 0) {
            console.log("Payment not found for reference:", initiatorReferenceId);
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = payments[0];

        // ============================
        // IDEMPOTENCY - PREVENT DOUBLE PROCESSING
        // ============================
        if (payment.status === 'paid') {
            console.log("Payment already processed:", initiatorReferenceId);
            return res.json({
                success: true,
                message: "Already processed"
            });
        }

        // Determine payment status
        let paymentStatus = status.toLowerCase();

        if (paymentStatus === "success" || paymentStatus === "completed") {
            paymentStatus = "paid";
        } else if (paymentStatus === "failed" || paymentStatus === "error") {
            paymentStatus = "failed";
        }

        // Update payment record
        await db.query(
            `UPDATE payments 
             SET 
                gateway_transaction_id = ?,
                status = ?,
                gateway_response = ?,
                paid_at = ?
             WHERE id = ?`,
            [
                pgReferenceId || fspReferenceId || null,
                paymentStatus,
                JSON.stringify(req.body),
                paymentStatus === 'paid' ? new Date() : null,
                payment.id
            ]
        );

        // ============================
        // IF PAID - ACTIVATE SUBSCRIPTION
        // ============================
        if (paymentStatus === 'paid') {
            await activateUserSubscription(payment.user_id, payment.plan_id);
            
            // Send email notification (optional)
            // await sendPaymentSuccessEmail(payment.user_id, payment);
        }

        console.log(`Payment ${paymentStatus} for reference: ${initiatorReferenceId}`);

        res.json({
            success: true,
            message: "Callback processed successfully"
        });

    } catch (err) {
        console.error("Callback Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== ACTIVATE SUBSCRIPTION HELPER ====================
async function activateUserSubscription(userId, planId) {
    try {
        // Get plan duration
        const [planData] = await db.query(
            `SELECT duration_days FROM plans WHERE id = ?`,
            [planId]
        );

        const durationDays = planData[0]?.duration_days || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Check if user already has an active subscription
        const [existingSub] = await db.query(
            `SELECT id, expires_at FROM subscriptions 
             WHERE user_id = ? AND status = 'active'`,
            [userId]
        );

        if (existingSub.length > 0) {
            // Extend existing subscription
            await db.query(
                `UPDATE subscriptions 
                 SET 
                    expires_at = DATE_ADD(expires_at, INTERVAL ? DAY),
                    plan_id = ?,
                    updated_at = NOW()
                 WHERE user_id = ? AND status = 'active'`,
                [durationDays, planId, userId]
            );
            
            console.log(`Subscription extended for user ${userId} by ${durationDays} days`);
        } else {
            // Check if user has expired subscription
            const [expiredSub] = await db.query(
                `SELECT id FROM subscriptions 
                 WHERE user_id = ? AND status = 'expired'`,
                [userId]
            );

            if (expiredSub.length > 0) {
                // Reactivate expired subscription
                await db.query(
                    `UPDATE subscriptions 
                     SET 
                        status = 'active',
                        plan_id = ?,
                        expires_at = ?,
                        updated_at = NOW()
                     WHERE user_id = ? AND status = 'expired'`,
                    [planId, expiresAt, userId]
                );
            } else {
                // Create new subscription
                await db.query(
                    `INSERT INTO subscriptions 
                     (user_id, plan_id, status, expires_at, created_at, updated_at)
                     VALUES (?, ?, 'active', ?, NOW(), NOW())`,
                    [userId, planId, expiresAt]
                );
            }
            
            console.log(`New subscription created for user ${userId}`);
        }

        return true;

    } catch (error) {
        console.error("Error activating subscription:", error);
        throw error;
    }
}

// ==================== ADMIN - GET ALL PAYMENTS ====================
exports.adminGetAllPayments = async (req, res) => {
    try {
        const [payments] = await db.query(
            `SELECT 
                p.*,
                u.name as user_name,
                u.email as user_email,
                pl.name as plan_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN plans pl ON p.plan_id = pl.id
            ORDER BY p.created_at DESC
            LIMIT 100`
        );

        res.json({
            success: true,
            payments
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments"
        });
    }
};

// ==================== ADMIN - GET PAYMENT STATS ====================
exports.adminGetPaymentStats = async (req, res) => {
    try {
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as successful_payments,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_payments,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
                COUNT(DISTINCT user_id) as unique_users
            FROM payments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );

        // Get daily stats for chart
        const [dailyStats] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as revenue
            FROM payments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC`
        );

        res.json({
            success: true,
            stats: stats[0],
            dailyStats
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment stats"
        });
    }
};