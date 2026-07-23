const db = require("../config/db");
const crypto = require("crypto");
const azampay = require("../services/azampayService");

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

        // For mobile money, phone number is required
        if (['mpesa', 'airtel_money', 'mix_by_yas'].includes(paymentMethod) && !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required for mobile money payments"
            });
        }

        // For bank card, card details are required
        if (paymentMethod === 'bank_card') {
            if (!cardNumber || !expiryDate || !cvv) {
                return res.status(400).json({
                    success: false,
                    message: "Card details are required for bank card payments",
                    required: ['cardNumber', 'expiryDate', 'cvv']
                });
            }
            const cleanCard = cardNumber.replace(/\s/g, '');
            if (!/^\d{13,19}$/.test(cleanCard)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid card number. Must be 13-19 digits."
                });
            }
            const cleanExpiry = expiryDate.replace(/\s/g, '');
            if (!/^\d{2}\/\d{2}$/.test(cleanExpiry) && !/^\d{4}$/.test(cleanExpiry)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expiry date format. Use MM/YY or MMYY."
                });
            }
            if (!/^\d{3,4}$/.test(cvv)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid CVV. Must be 3-4 digits."
                });
            }
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
        // SEND PAYMENT TO AZAMPAY
        // ============================
        let checkoutPayload;

        if (paymentMethod === 'bank_card') {
            checkoutPayload = {
                provider: "CARD",
                merchantAccountNumber: process.env.AZAMPAY_ACCOUNT_NUMBER,
                merchantName: "TanzaFlix",
                currencyCode: "TZS",
                amount: movie.price.toString(),
                referenceId: reference,
                merchantReferenceId: reference,
                cardNumber: cardNumber.replace(/\s/g, ''),
                expiryDate: expiryDate.replace(/\s/g, ''),
                cvv: cvv,
                accountName: accountName || "TanzaFlix User",
                additionalProperties: {
                    provider: "CARD",
                    movieId: movieId,
                    movieTitle: movie.title,
                    purchaseType: "movie"
                },
                source: "TanzaFlix"
            };
        } else {
            checkoutPayload = {
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
        }

        console.log("Sending Movie Purchase AzamPay payload:", JSON.stringify(checkoutPayload, null, 2));

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
        
        // Handle specific AzamPay errors
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

// Webhook callback for movie purchases
exports.handlePurchaseCallback = async (req, res) => {
    try {
        console.log("Movie Purchase Callback Received:", JSON.stringify(req.body, null, 2));

        const {
            initiatorReferenceId,
            pgReferenceId,
            status,
            message,
            fspReferenceId,
            amount,
            operator
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

        // Idempotency - prevent double processing
        if (payment.status === 'paid') {
            console.log("Payment already processed:", initiatorReferenceId);
            return res.json({ 
                success: true, 
                message: "Already processed" 
            });
        }

        // Determine payment status
        let paymentStatus = (status || '').toLowerCase();
        if (paymentStatus === "success" || paymentStatus === "completed") {
            paymentStatus = "paid";
        } else if (paymentStatus === "failed" || paymentStatus === "error") {
            paymentStatus = "failed";
        }

        // Update payment
        await db.query(
            `UPDATE payments 
             SET 
                status = ?, 
                gateway_transaction_id = ?, 
                gateway_response = ?, 
                paid_at = ?
             WHERE id = ?`,
            [
                paymentStatus,
                pgReferenceId || fspReferenceId || null,
                JSON.stringify(req.body),
                paymentStatus === 'paid' ? new Date() : null,
                payment.id
            ]
        );

        // If PAID - update purchase & activate access
        if (paymentStatus === 'paid' && payment.purchase_id) {
            // Update purchase status
            await db.query(
                `UPDATE movie_purchases 
                 SET status = 'completed', 
                     expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
                 WHERE id = ?`,
                [payment.purchase_id]
            );

            // Log access
            await db.query(
                `INSERT INTO movie_access_logs 
                 (user_id, movie_id, access_type, completed) 
                 VALUES (?, ?, 'paid_single', 1)`,
                [payment.user_id, payment.movie_id]
            );

            console.log(`✅ Movie purchase activated for user ${payment.user_id}, movie ${payment.movie_id}`);
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