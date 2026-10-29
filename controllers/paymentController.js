const db = require("../config/db");
const crypto = require("crypto");
const snippe = require("../services/snippeService");

const MOBILE_METHODS = ["mpesa", "airtel_money", "mix_by_yas", "halotel", "mobile"];

// ==================== CREATE PAYMENT ====================
exports.createPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { planId, paymentMethod, phoneNumber, accountName } = req.body;

        if (!planId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Plan ID and payment method are required."
            });
        }

        const isMobile = MOBILE_METHODS.includes(paymentMethod);
        const isCard = paymentMethod === "bank_card" || paymentMethod === "card";

        if (isMobile && !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required for mobile money payments."
            });
        }

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

        // Load user for Snippe customer object
        const [users] = await db.query(
            `SELECT full_name, email, phone FROM users WHERE id = ?`,
            [userId]
        );
        const user = users[0] || {};
        const { firstname, lastname } = snippe.splitName(user.full_name || accountName);
        const customer = {
            firstname,
            lastname,
            email: user.email || "customer@tanzaflix.local"
        };

        const paymentReference = "TFX-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const idempotencyKey = paymentReference.slice(0, 30);

        const [payment] = await db.query(
            `INSERT INTO payments (
                user_id, plan_id, payment_reference, payment_method,
                phone_number, account_name, amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                plan.id,
                paymentReference,
                paymentMethod,
                phoneNumber || user.phone || null,
                accountName || user.full_name || null,
                plan.price,
                "pending"
            ]
        );

        // ============================
        // SEND PAYMENT TO SNIPPE
        // ============================
        let checkoutResponse;

        if (isCard) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            checkoutResponse = await snippe.createCardPayment({
                amount: plan.price,
                phoneNumber: phoneNumber || user.phone || "255700000000",
                customer,
                callbackUrl: `${frontendUrl}/subscription.html?ref=${paymentReference}`,
                metadata: {
                    order_id: paymentReference,
                    type: "subscription",
                    plan_id: String(plan.id),
                    user_id: String(userId)
                },
                idempotencyKey
            });
        } else {
            // Default: mobile money (USSD push) – network auto-detected from phone
            checkoutResponse = await snippe.createMobilePayment({
                amount: plan.price,
                phoneNumber,
                customer,
                metadata: {
                    order_id: paymentReference,
                    type: "subscription",
                    plan_id: String(plan.id),
                    user_id: String(userId)
                },
                idempotencyKey
            });
        }

        const snippeRef = checkoutResponse?.data?.reference || null;
        const paymentUrl = checkoutResponse?.data?.payment_url || null;

        await db.query(
            `UPDATE payments SET status = ?, gateway_response = ?, gateway_transaction_id = ? WHERE id = ?`,
            ["processing", JSON.stringify(checkoutResponse), snippeRef, payment.insertId]
        );

        res.json({
            success: true,
            paymentId: payment.insertId,
            reference: paymentReference,
            gatewayReference: snippeRef,
            amount: plan.price,
            currency: plan.currency || "TZS",
            plan: plan.name,
            paymentUrl: paymentUrl,
            snippe: checkoutResponse,
            message: isCard
                ? "Redirect customer to payment URL to complete card payment."
                : "USSD push sent. Ask customer to enter PIN on their phone."
        });

    } catch (err) {
        console.log("Payment Error:", err.response?.data || err.message);

        let errorMessage = err.message;
        let errorCode = null;

        if (err.response?.data) {
            errorMessage = err.response.data.message || err.response.data.error || err.message;
            errorCode = err.response.data.error_code || err.response.data.code || err.response.status;
        } else if (err.message === "read ECONNRESET") {
            errorMessage = "Connection to payment gateway failed. Please try again or use a different payment method.";
        }

        res.status(err.response?.status || 500).json({
            success: false,
            message: errorMessage,
            code: errorCode,
            suggestion: "Please check your payment details and try again. Ensure phone number is a valid Tanzanian mobile money number."
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
                account_name,
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
        console.error("Get Payment Status Error:", error);
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
                p.phone_number,
                p.account_name,
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
        console.error("Get Payment History Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get payment history"
        });
    }
};

// ==================== CANCEL SUBSCRIPTION ====================
exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user has an active subscription
        const [subscriptions] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                s.created_at,
                p.name as plan_name,
                p.price
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
             ORDER BY s.expires_at DESC
             LIMIT 1`,
            [userId]
        );

        if (subscriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found to cancel"
            });
        }

        const subscription = subscriptions[0];

        // Check if subscription is already set to cancel
        const [cancelRequest] = await db.query(
            `SELECT id FROM subscription_cancellations 
             WHERE subscription_id = ? AND status = 'pending'`,
            [subscription.id]
        );

        if (cancelRequest.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cancellation already requested for this subscription"
            });
        }

        // Create cancellation request
        await db.query(
            `INSERT INTO subscription_cancellations (
                subscription_id,
                user_id,
                reason,
                status,
                requested_at
            ) VALUES (?, ?, ?, 'pending', NOW())`,
            [subscription.id, userId, req.body.reason || null]
        );

        // Update subscription status to 'cancelling' (will expire at end of period)
        await db.query(
            `UPDATE subscriptions 
             SET status = 'cancelling'
             WHERE id = ?`,
            [subscription.id]
        );

        res.json({
            success: true,
            message: "Subscription cancellation requested. You will have access until the end of your current billing period.",
            data: {
                subscription_id: subscription.id,
                plan_name: subscription.plan_name,
                expires_at: subscription.expires_at,
                access_until: subscription.expires_at,
                status: 'cancelling'
            }
        });

    } catch (error) {
        console.error("Cancel Subscription Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel subscription"
        });
    }
};

// ==================== CANCEL IMMEDIATELY (Admin only) ====================
exports.cancelSubscriptionImmediately = async (req, res) => {
    try {
        const userId = req.params.userId || req.body.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // Check if user has an active subscription
        const [subscriptions] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                p.name as plan_name
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
             ORDER BY s.expires_at DESC
             LIMIT 1`,
            [userId]
        );

        if (subscriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found for this user"
            });
        }

        const subscription = subscriptions[0];

        // Cancel immediately - set status to 'expired' and expires_at to now
        await db.query(
            `UPDATE subscriptions 
             SET status = 'expired', 
                 expires_at = NOW()
             WHERE id = ?`,
            [subscription.id]
        );

        // Log cancellation
        await db.query(
            `INSERT INTO subscription_cancellations (
                subscription_id,
                user_id,
                reason,
                status,
                requested_at,
                processed_at
            ) VALUES (?, ?, ?, 'processed', NOW(), NOW())`,
            [subscription.id, userId, req.body.reason || 'Immediate cancellation by admin']
        );

        res.json({
            success: true,
            message: "Subscription cancelled immediately",
            data: {
                subscription_id: subscription.id,
                plan_name: subscription.plan_name,
                cancelled_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Cancel Subscription Immediately Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel subscription"
        });
    }
};

// ==================== GET USER SUBSCRIPTION STATUS ====================
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get active subscription
        const [active] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                s.created_at,
                p.id as plan_id,
                p.name as plan_name,
                p.price,
                p.duration_days,
                DATEDIFF(s.expires_at, NOW()) as days_remaining
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? 
             ORDER BY s.expires_at DESC
             LIMIT 1`,
            [userId]
        );

        // Get cancellation status if any
        let cancellation = null;
        if (active.length > 0 && active[0].status === 'cancelling') {
            const [cancelData] = await db.query(
                `SELECT 
                    id,
                    reason,
                    requested_at,
                    status
                 FROM subscription_cancellations
                 WHERE subscription_id = ? AND status = 'pending'
                 ORDER BY requested_at DESC
                 LIMIT 1`,
                [active[0].id]
            );
            if (cancelData.length > 0) {
                cancellation = cancelData[0];
            }
        }

        // Get subscription history
        const [history] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                s.created_at,
                p.name as plan_name,
                p.price
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ?
             ORDER BY s.created_at DESC
             LIMIT 10`,
            [userId]
        );

        res.json({
            success: true,
            subscription: active.length > 0 ? {
                id: active[0].id,
                status: active[0].status,
                plan_id: active[0].plan_id,
                plan_name: active[0].plan_name,
                price: active[0].price,
                duration_days: active[0].duration_days,
                expires_at: active[0].expires_at,
                created_at: active[0].created_at,
                days_remaining: active[0].days_remaining || 0,
                is_active: active[0].status === 'active' && new Date(active[0].expires_at) > new Date(),
                cancellation: cancellation
            } : null,
            history: history
        });

    } catch (error) {
        console.error("Get Subscription Status Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get subscription status"
        });
    }
};

// ==================== SNIPPE WEBHOOK ====================
exports.snippeWebhook = async (req, res) => {
    try {
        const rawBody = typeof req.body === "string"
            ? req.body
            : (req.rawBody || JSON.stringify(req.body));

        const signature = req.headers["x-webhook-signature"];
        const timestamp = req.headers["x-webhook-timestamp"];

        // Verify signature when secret is configured
        if (process.env.SNIPPE_WEBHOOK_SECRET) {
            const valid = snippe.verifyWebhookSignature(
                rawBody,
                signature,
                timestamp,
                process.env.SNIPPE_WEBHOOK_SECRET
            );
            if (!valid) {
                console.warn("Invalid Snippe webhook signature");
                return res.status(400).json({ success: false, message: "Invalid signature" });
            }
        }

        const body = typeof req.body === "object" ? req.body : JSON.parse(rawBody);
        console.log("Snippe Webhook Received:", JSON.stringify(body, null, 2));

        // Support both current envelope format and legacy flat format
        const eventType = body.type || body.event || "";
        const data = body.data || body;

        const statusRaw = (data.status || "").toLowerCase();
        const gatewayRef = data.reference || data.id || null;
        const orderId = data.metadata?.order_id || data.external_reference || null;

        // Find payment by our order_id (payment_reference) or by gateway reference
        let payments = [];
        if (orderId) {
            [payments] = await db.query(
                `SELECT * FROM payments WHERE payment_reference = ?`,
                [orderId]
            );
        }
        if (payments.length === 0 && gatewayRef) {
            [payments] = await db.query(
                `SELECT * FROM payments WHERE gateway_transaction_id = ? OR payment_reference = ?`,
                [gatewayRef, gatewayRef]
            );
        }

        if (payments.length === 0) {
            console.log("Payment not found for webhook:", { orderId, gatewayRef, eventType });
            // Acknowledge so Snippe does not keep retrying forever for unknown refs
            return res.json({ success: true, message: "Payment not found (ignored)" });
        }

        const payment = payments[0];

        if (payment.status === "paid") {
            console.log("Payment already processed:", payment.payment_reference);
            return res.json({ success: true, message: "Already processed" });
        }

        let paymentStatus = "processing";
        if (
            eventType === "payment.completed" ||
            statusRaw === "completed" ||
            statusRaw === "success" ||
            statusRaw === "paid"
        ) {
            paymentStatus = "paid";
        } else if (
            eventType === "payment.failed" ||
            eventType === "payment.expired" ||
            eventType === "payment.voided" ||
            statusRaw === "failed" ||
            statusRaw === "expired" ||
            statusRaw === "voided"
        ) {
            paymentStatus = "failed";
        }

        await db.query(
            `UPDATE payments
             SET
                gateway_transaction_id = COALESCE(?, gateway_transaction_id),
                status = ?,
                gateway_response = ?,
                paid_at = ?
             WHERE id = ?`,
            [
                gatewayRef,
                paymentStatus,
                JSON.stringify(body),
                paymentStatus === "paid" ? new Date() : null,
                payment.id
            ]
        );

        if (paymentStatus === "paid") {
            // Subscription payment
            if (payment.plan_id) {
                await activateUserSubscription(payment.user_id, payment.plan_id);
            }

            // Movie purchase (plan_id is null, linked via movie_purchases.payment_id)
            const [purchases] = await db.query(
                `SELECT id, movie_id FROM movie_purchases WHERE payment_id = ? AND status IN ('pending', 'processing')`,
                [payment.id]
            );
            if (purchases.length > 0) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30); // 30-day access default
                await db.query(
                    `UPDATE movie_purchases
                     SET status = 'completed', expires_at = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [expiresAt, purchases[0].id]
                );
                console.log(`Movie purchase completed for purchase ${purchases[0].id}`);
            }
        }

        console.log(`Payment ${paymentStatus} for reference: ${payment.payment_reference}`);

        res.json({
            success: true,
            message: "Webhook processed successfully"
        });

    } catch (err) {
        console.error("Snippe Webhook Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Keep legacy alias so old route names do not break if referenced elsewhere
exports.azamPayCallback = exports.snippeWebhook;

// ==================== ACTIVATE SUBSCRIPTION HELPER ====================
async function activateUserSubscription(userId, planId) {
    try {
        const [planData] = await db.query(
            `SELECT duration_days FROM plans WHERE id = ?`,
            [planId]
        );

        const durationDays = planData[0]?.duration_days || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Check if user already has an active or cancelling subscription
        const [existingSub] = await db.query(
            `SELECT id, expires_at, status FROM subscriptions 
             WHERE user_id = ? AND status IN ('active', 'cancelling')`,
            [userId]
        );

        if (existingSub.length > 0) {
            // Extend existing subscription
            await db.query(
                `UPDATE subscriptions 
                 SET 
                    expires_at = DATE_ADD(expires_at, INTERVAL ? DAY),
                    plan_id = ?,
                    status = 'active',
                    updated_at = NOW()
                 WHERE user_id = ? AND status IN ('active', 'cancelling')`,
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
                u.full_name as user_name,
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
        console.error("Admin Get Payments Error:", error);
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
        console.error("Admin Get Payment Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment stats"
        });
    }
};

// ==================== ADMIN - GET ALL SUBSCRIPTIONS ====================
exports.adminGetAllSubscriptions = async (req, res) => {
    try {
        const [subscriptions] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                s.created_at,
                u.id as user_id,
                u.full_name as user_name,
                u.email as user_email,
                p.id as plan_id,
                p.name as plan_name,
                p.price,
                p.duration_days,
                CASE 
                    WHEN s.status = 'active' AND s.expires_at > NOW() THEN 'Active'
                    WHEN s.status = 'cancelling' AND s.expires_at > NOW() THEN 'Pending Cancellation'
                    WHEN s.status = 'cancelling' AND s.expires_at <= NOW() THEN 'Cancelled'
                    WHEN s.status = 'expired' THEN 'Expired'
                    ELSE s.status
                END as status_label
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plans p ON s.plan_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 100`
        );

        res.json({
            success: true,
            total: subscriptions.length,
            subscriptions
        });

    } catch (error) {
        console.error("Admin Get Subscriptions Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions"
        });
    }
};