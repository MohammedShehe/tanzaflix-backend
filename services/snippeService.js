const axios = require("axios");
const crypto = require("crypto");

// ============================
// SNIPPE CONFIG
// ============================
const BASE_URL = (process.env.SNIPPE_BASE_URL || "https://api.snippe.sh").replace(/\/$/, "");
const API_KEY = (process.env.SNIPPE_API_KEY || "").replace(/"/g, "").trim();
const WEBHOOK_SECRET = (process.env.SNIPPE_WEBHOOK_SECRET || "").replace(/"/g, "").trim();
const WEBHOOK_URL = (process.env.SNIPPE_WEBHOOK_URL || "").replace(/"/g, "").trim();

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
    }
});

/**
 * Normalize Tanzanian phone to 255XXXXXXXXX
 */
function normalizePhone(phone) {
    if (!phone) return "";
    let p = String(phone).replace(/\s+/g, "").replace(/^\+/, "");
    if (p.startsWith("0")) p = "255" + p.slice(1);
    if (!p.startsWith("255") && p.length === 9) p = "255" + p;
    return p;
}

/**
 * Split full name into first / last
 */
function splitName(fullName) {
    const parts = (fullName || "Customer User").trim().split(/\s+/);
    const firstname = parts[0] || "Customer";
    const lastname = parts.slice(1).join(" ") || "User";
    return { firstname, lastname };
}

/**
 * Create a mobile-money payment (USSD push)
 * Snippe auto-detects network from phone number.
 */
exports.createMobilePayment = async ({
    amount,
    phoneNumber,
    customer,
    metadata = {},
    idempotencyKey
}) => {
    if (!API_KEY) throw new Error("Missing SNIPPE_API_KEY");

    const body = {
        payment_type: "mobile",
        details: {
            amount: Math.round(Number(amount)),
            currency: "TZS"
        },
        phone_number: normalizePhone(phoneNumber),
        customer: {
            firstname: customer.firstname || "Customer",
            lastname: customer.lastname || "User",
            email: customer.email || "customer@tanzaflix.local"
        },
        metadata
    };

    if (WEBHOOK_URL) body.webhook_url = WEBHOOK_URL;

    const headers = {};
    if (idempotencyKey) {
        headers["Idempotency-Key"] = String(idempotencyKey).slice(0, 30);
    }

    console.log("========== SNIPPE MOBILE PAYMENT ==========");
    console.log({ amount: body.details.amount, phone: body.phone_number, metadata });

    const response = await client.post("/v1/payments", body, { headers });
    console.log("Snippe mobile payment created:", response.data?.data?.reference);
    return response.data;
};

/**
 * Create a card payment – returns payment_url for redirect
 */
exports.createCardPayment = async ({
    amount,
    phoneNumber,
    customer,
    callbackUrl,
    metadata = {},
    idempotencyKey
}) => {
    if (!API_KEY) throw new Error("Missing SNIPPE_API_KEY");

    const body = {
        payment_type: "card",
        details: {
            amount: Math.round(Number(amount)),
            currency: "TZS"
        },
        phone_number: normalizePhone(phoneNumber || "255700000000"),
        customer: {
            firstname: customer.firstname || "Customer",
            lastname: customer.lastname || "User",
            email: customer.email || "customer@tanzaflix.local",
            address: customer.address || "Dar es Salaam",
            city: customer.city || "Dar es Salaam",
            state: customer.state || "DSM",
            postcode: customer.postcode || "11101",
            country: "TZ"
        },
        callback_url: callbackUrl || process.env.FRONTEND_URL || "http://localhost:3000",
        metadata
    };

    if (WEBHOOK_URL) body.webhook_url = WEBHOOK_URL;

    const headers = {};
    if (idempotencyKey) {
        headers["Idempotency-Key"] = String(idempotencyKey).slice(0, 30);
    }

    console.log("========== SNIPPE CARD PAYMENT ==========");
    const response = await client.post("/v1/payments", body, { headers });
    console.log("Snippe card payment created:", response.data?.data?.reference);
    return response.data;
};

/**
 * Create dynamic QR payment
 */
exports.createQrPayment = async ({
    amount,
    phoneNumber,
    customer,
    metadata = {},
    idempotencyKey
}) => {
    if (!API_KEY) throw new Error("Missing SNIPPE_API_KEY");

    const body = {
        payment_type: "dynamic-qr",
        details: {
            amount: Math.round(Number(amount)),
            currency: "TZS"
        },
        phone_number: normalizePhone(phoneNumber || "255700000000"),
        customer: {
            firstname: customer.firstname || "Customer",
            lastname: customer.lastname || "User",
            email: customer.email || "customer@tanzaflix.local"
        },
        metadata
    };

    if (WEBHOOK_URL) body.webhook_url = WEBHOOK_URL;

    const headers = {};
    if (idempotencyKey) {
        headers["Idempotency-Key"] = String(idempotencyKey).slice(0, 30);
    }

    const response = await client.post("/v1/payments", body, { headers });
    return response.data;
};

/**
 * Get payment status by Snippe reference
 */
exports.getPaymentStatus = async (reference) => {
    if (!API_KEY) throw new Error("Missing SNIPPE_API_KEY");
    const response = await client.get(`/v1/payments/${reference}`);
    return response.data;
};

/**
 * Retrigger USSD push
 */
exports.retriggerPush = async (reference) => {
    if (!API_KEY) throw new Error("Missing SNIPPE_API_KEY");
    const response = await client.post(`/v1/payments/${reference}/push`);
    return response.data;
};

/**
 * Verify Snippe webhook signature
 * Signature = hex(HMAC-SHA256(signing_key, "{timestamp}.{raw_body}"))
 */
exports.verifyWebhookSignature = (rawBody, signature, timestamp, secret) => {
    const key = secret || WEBHOOK_SECRET;
    if (!signature || !key || !timestamp) {
        console.warn("Missing signature, timestamp, or secret for webhook verification");
        return false;
    }

    try {
        // Reject timestamps older than 5 minutes (replay protection)
        const eventTime = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - eventTime) > 300) {
            console.warn("Webhook timestamp too old");
            return false;
        }

        const message = `${timestamp}.${typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody)}`;
        const expected = crypto
            .createHmac("sha256", key)
            .update(message)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(String(signature)),
            Buffer.from(expected)
        );
    } catch (error) {
        console.error("Webhook signature verification error:", error.message);
        return false;
    }
};

exports.normalizePhone = normalizePhone;
exports.splitName = splitName;
exports.WEBHOOK_URL = WEBHOOK_URL;
