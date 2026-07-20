const db = require("../config/db");
const crypto = require("crypto");
const azampay = require("../services/azampayService");

// Create purchase for single movie
exports.createMoviePurchase = async (req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.params.id;
        const { paymentMethod, phoneNumber } = req.body;

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

        // Check if already purchased
        const [existing] = await db.query(
            `SELECT id, status FROM movie_purchases 
             WHERE user_id = ? AND movie_id = ? 
             AND status = 'completed' 
             AND (expires_at IS NULL OR expires_at > NOW())`,
            [userId, movieId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You already have access to this movie"
            });
        }

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
              phone_number, amount, currency, status) 
             VALUES (?, NULL, ?, ?, ?, ?, 'TZS', 'pending')`,
            [userId, reference, paymentMethod, phoneNumber, movie.price]
        );

        // Update purchase with payment ID
        await db.query(
            `UPDATE movie_purchases SET payment_id = ? WHERE id = ?`,
            [payment.insertId, purchase.insertId]
        );

        // Send to AzamPay
        const checkoutPayload = {
            provider: paymentMethod,
            merchantAccountNumber: process.env.AZAMPAY_ACCOUNT_NUMBER,
            merchantName: "TanzaFlix",
            merchantMobileNumber: phoneNumber,
            currencyCode: "TZS",
            amount: movie.price.toString(),
            referenceId: reference,
            merchantReferenceId: reference,
            additionalProperties: {
                provider: paymentMethod,
                movieId: movieId,
                movieTitle: movie.title,
                purchaseType: "movie"
            },
            source: "TanzaFlix"
        };

        const checkoutResponse = await azampay.createCheckout(checkoutPayload);

        // Update payment with gateway response
        await db.query(
            `UPDATE payments 
             SET status = 'processing', gateway_response = ? 
             WHERE id = ?`,
            [JSON.stringify(checkoutResponse), payment.insertId]
        );

        res.json({
            success: true,
            paymentId: payment.insertId,
            purchaseId: purchase.insertId,
            reference: reference,
            amount: movie.price,
            currency: "TZS",
            movie: {
                id: movie.id,
                title: movie.title
            },
            azampay: checkoutResponse,
            message: "Payment initiated successfully"
        });

    } catch (err) {
        console.error("Movie Purchase Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
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
            // Update purchase
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

// Webhook callback for movie purchases
exports.handlePurchaseCallback = async (req, res) => {
    try {
        console.log("Movie Purchase Callback:", JSON.stringify(req.body, null, 2));

        const {
            initiatorReferenceId,
            pgReferenceId,
            status,
            message
        } = req.body;

        // Find payment
        const [payments] = await db.query(
            `SELECT p.*, mp.id as purchase_id 
             FROM payments p
             LEFT JOIN movie_purchases mp ON p.id = mp.payment_id
             WHERE p.payment_reference = ?`,
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

        // Check if already processed
        if (payment.status === 'paid') {
            console.log("Payment already processed:", initiatorReferenceId);
            return res.json({ success: true, message: "Already processed" });
        }

        let paymentStatus = status.toLowerCase();
        if (paymentStatus === "success" || paymentStatus === "completed") {
            paymentStatus = "paid";
        } else if (paymentStatus === "failed" || paymentStatus === "error") {
            paymentStatus = "failed";
        }

        // Update payment
        await db.query(
            `UPDATE payments 
             SET status = ?, gateway_transaction_id = ?, 
                 gateway_response = ?, paid_at = ?
             WHERE id = ?`,
            [
                paymentStatus,
                pgReferenceId || null,
                JSON.stringify(req.body),
                paymentStatus === 'paid' ? new Date() : null,
                payment.id
            ]
        );

        // If paid, update purchase
        if (paymentStatus === 'paid' && payment.purchase_id) {
            await db.query(
                `UPDATE movie_purchases 
                 SET status = 'completed', 
                     expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
                 WHERE id = ?`,
                [payment.purchase_id]
            );
        }

        console.log(`Movie purchase ${paymentStatus} for reference: ${initiatorReferenceId}`);

        res.json({
            success: true,
            message: "Callback processed successfully"
        });

    } catch (err) {
        console.error("Purchase Callback Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};