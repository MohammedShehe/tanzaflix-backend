const db = require("../config/db");
const crypto = require("crypto");
const snippe = require("../services/snippeService");

const MOBILE_METHODS = ["mpesa", "airtel_money", "mix_by_yas", "halotel", "mobile"];

// Create purchase for single movie
exports.createMoviePurchase = async (req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.params.id;
        const { paymentMethod, phoneNumber, accountName, cardNumber, expiryDate, cvv } = req.body;

        // Get movie details
        const [movies] = await db.query(
            `SELECT id, title, price FROM movies WHERE id = ?`,
            [movieId]
        );

        if (movies.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        const movie = movies[0];

        // CHECK: If user already has a valid purchase (completed/paid)
        const [existing] = await db.query(
            `SELECT id, status, expires_at FROM movie_purchases 
             WHERE user_id = ? AND movie_id = ? 
             AND status IN ('completed', 'paid')
             AND (expires_at IS NULL OR expires_at > NOW())
             LIMIT 1`,
            [userId, movieId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                code: 'ALREADY_PURCHASED',
                message: "You already have access to this movie",
                purchase: {
                    id: existing[0].id,
                    status: existing[0].status,
                    expires_at: existing[0].expires_at
                }
            });
        }

        // CHECK: If user has a pending purchase (being processed)
        const [pending] = await db.query(
            `SELECT id, status, created_at FROM movie_purchases 
             WHERE user_id = ? AND movie_id = ? 
             AND status IN ('pending', 'processing')
             LIMIT 1`,
            [userId, movieId]
        );

        if (pending.length > 0) {
            return res.status(400).json({
                success: false,
                code: 'PENDING_PURCHASE',
                message: "You already have a pending purchase for this movie",
                purchase: {
                    id: pending[0].id,
                    status: pending[0].status,
                    created_at: pending[0].created_at
                }
            });
        }

        // Validate payment method
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required"
            });
        }

        const isMobile = MOBILE_METHODS.includes(paymentMethod);
        const isCard = paymentMethod === "bank_card" || paymentMethod === "card";

        // For mobile money, phone number is required
        if (isMobile && !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required for mobile money payments"
            });
        }
        // Card payments are handled via Snippe hosted page (no local card details)

        // Generate reference
        const reference = "MP-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex").toUpperCase();

        // Save purchase record
        const [purchase] = await db.query(
            `INSERT INTO movie_purchases 
             (user_id, movie_id, amount, currency, status) 
             VALUES (?, ?, ?, 'TZS', 'pending')`,
            [userId, movieId, movie.price]
        );

        // Create payment
        const [payment] = await db.query(
            `INSERT INTO payments 
             (user_id, plan_id, payment_reference, payment_method, 
              phone_number, account_name, amount, currency, status) 
             VALUES (?, NULL, ?, ?, ?, ?, ?, 'TZS', 'pending')`,
            [
                userId, 
                reference, 
                paymentMethod, 
                phoneNumber || null,
                accountName || null,
                movie.price
            ]
        );

        // Update purchase with payment ID
        await db.query(
            `UPDATE movie_purchases SET payment_id = ? WHERE id = ?`,
            [payment.insertId, purchase.insertId]
        );

        // ============================
        // SEND PAYMENT TO SNIPPE
        // ============================
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
        const idempotencyKey = reference.slice(0, 30);

        let checkoutResponse;
        if (isCard) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            checkoutResponse = await snippe.createCardPayment({
                amount: movie.price,
                phoneNumber: phoneNumber || user.phone || "255700000000",
                customer,
                callbackUrl: `${frontendUrl}/movies.html?purchaseRef=${reference}`,
                metadata: {
                    order_id: reference,
                    type: "movie",
                    movie_id: String(movieId),
                    user_id: String(userId)
                },
                idempotencyKey
            });
        } else {
            checkoutResponse = await snippe.createMobilePayment({
                amount: movie.price,
                phoneNumber,
                customer,
                metadata: {
                    order_id: reference,
                    type: "movie",
                    movie_id: String(movieId),
                    user_id: String(userId)
                },
                idempotencyKey
            });
        }

        const snippeRef = checkoutResponse?.data?.reference || null;
        const paymentUrl = checkoutResponse?.data?.payment_url || null;

        await db.query(
            `UPDATE payments
             SET status = 'processing', gateway_response = ?, gateway_transaction_id = ?
             WHERE id = ?`,
            [JSON.stringify(checkoutResponse), snippeRef, payment.insertId]
        );

        res.json({
            success: true,
            paymentId: payment.insertId,
            purchaseId: purchase.insertId,
            reference: reference,
            gatewayReference: snippeRef,
            amount: movie.price,
            currency: "TZS",
            movie: {
                id: movie.id,
                title: movie.title
            },
            paymentUrl: paymentUrl,
            snippe: checkoutResponse,
            message: isCard
                ? "Redirect customer to payment URL to complete card payment."
                : "USSD push sent. Ask customer to enter PIN on their phone."
        });

    } catch (err) {
        console.error("Movie Purchase Error:", err);
        
        // Handle duplicate entry error gracefully
        if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate entry'))) {
            // Check if the user actually has a valid purchase
            try {
                const [existingPurchase] = await db.query(
                    `SELECT id, status, expires_at FROM movie_purchases 
                     WHERE user_id = ? AND movie_id = ? 
                     AND status IN ('completed', 'paid', 'pending', 'processing')
                     LIMIT 1`,
                    [req.user.id, req.params.id]
                );
                
                if (existingPurchase.length > 0) {
                    return res.status(400).json({
                        success: false,
                        code: 'ALREADY_PURCHASED',
                        message: "You already have a purchase record for this movie",
                        purchase: {
                            id: existingPurchase[0].id,
                            status: existingPurchase[0].status,
                            expires_at: existingPurchase[0].expires_at
                        },
                        canWatch: existingPurchase[0].status === 'completed' || existingPurchase[0].status === 'paid'
                    });
                }
            } catch (checkError) {
                console.error("Error checking existing purchase:", checkError);
            }
        }
        
        // Handle specific Snippe / payment gateway errors
        let errorMessage = err.message;
        if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.message === 'read ECONNRESET') {
            errorMessage = "Connection to payment gateway failed. Please try again or use a different payment method.";
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            code: err.code || 'PAYMENT_ERROR'
        });
    }
};

// Verify purchase status
exports.verifyPurchase = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reference } = req.params;

        const [payments] = await db.query(
            `SELECT 
                p.id,
                p.payment_reference,
                p.amount,
                p.status,
                p.paid_at,
                mp.id as purchase_id,
                mp.movie_id,
                mp.status as purchase_status,
                m.title as movie_title
             FROM payments p
             LEFT JOIN movie_purchases mp ON p.id = mp.payment_id
             LEFT JOIN movies m ON mp.movie_id = m.id
             WHERE p.payment_reference = ? AND p.user_id = ?`,
            [reference, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = payments[0];

        // If payment is completed but purchase not updated
        if (payment.status === 'paid' && payment.purchase_status !== 'completed') {
            await db.query(
                `UPDATE movie_purchases 
                 SET status = 'completed', 
                     expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
                 WHERE id = ?`,
                [payment.purchase_id]
            );
            payment.purchase_status = 'completed';
        }

        res.json({
            success: true,
            payment: {
                reference: payment.payment_reference,
                amount: payment.amount,
                status: payment.status,
                paid_at: payment.paid_at,
                purchase: {
                    id: payment.purchase_id,
                    movie_id: payment.movie_id,
                    movie_title: payment.movie_title,
                    status: payment.purchase_status
                }
            }
        });

    } catch (err) {
        console.error("Verify Purchase Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Webhook callback for movie purchases (Snippe format)
// Prefer configuring SNIPPE_WEBHOOK_URL to /api/payments/webhook which also
// activates movie purchases. This endpoint remains as a secondary target.
exports.handlePurchaseCallback = async (req, res) => {
    try {
        const body = req.body || {};
        console.log("Movie Purchase Snippe Webhook:", JSON.stringify(body, null, 2));

        const eventType = body.type || body.event || "";
        const data = body.data || body;
        const statusRaw = (data.status || "").toLowerCase();
        const gatewayRef = data.reference || data.id || null;
        const orderId = data.metadata?.order_id || data.external_reference || null;

        let payments = [];
        if (orderId) {
            [payments] = await db.query(
                `SELECT p.*, mp.id as purchase_id, mp.movie_id as purchase_movie_id
                 FROM payments p
                 LEFT JOIN movie_purchases mp ON p.id = mp.payment_id
                 WHERE p.payment_reference = ?`,
                [orderId]
            );
        }
        if (payments.length === 0 && gatewayRef) {
            [payments] = await db.query(
                `SELECT p.*, mp.id as purchase_id, mp.movie_id as purchase_movie_id
                 FROM payments p
                 LEFT JOIN movie_purchases mp ON p.id = mp.payment_id
                 WHERE p.gateway_transaction_id = ? OR p.payment_reference = ?`,
                [gatewayRef, gatewayRef]
            );
        }

        if (payments.length === 0) {
            console.log("Payment not found for movie webhook:", { orderId, gatewayRef });
            return res.json({ success: true, message: "Payment not found (ignored)" });
        }

        const payment = payments[0];

        if (payment.status === "paid") {
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
             SET status = ?, gateway_transaction_id = COALESCE(?, gateway_transaction_id),
                 gateway_response = ?, paid_at = ?
             WHERE id = ?`,
            [
                paymentStatus,
                gatewayRef,
                JSON.stringify(body),
                paymentStatus === "paid" ? new Date() : null,
                payment.id
            ]
        );

        if (paymentStatus === "paid" && payment.purchase_id) {
            await db.query(
                `UPDATE movie_purchases
                 SET status = 'completed',
                     expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
                 WHERE id = ?`,
                [payment.purchase_id]
            );

            try {
                await db.query(
                    `INSERT INTO movie_access_logs
                     (user_id, movie_id, access_type, completed)
                     VALUES (?, ?, 'paid_single', 1)`,
                    [payment.user_id, payment.purchase_movie_id || payment.movie_id]
                );
            } catch (logErr) {
                console.warn("movie_access_logs insert skipped:", logErr.message);
            }

            console.log(`✅ Movie purchase activated for user ${payment.user_id}`);
        }

        res.json({ success: true, message: "Callback processed successfully" });
    } catch (err) {
        console.error("Purchase Callback Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
