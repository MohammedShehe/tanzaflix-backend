const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateOTP = require("../utils/generateOTP");
const { sendOTP } = require("../services/emailService");

// ==================== LOGIN ====================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Invalid credentials"
            });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        if (user.role === "user") {
            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

            return res.json({
                success: true,
                role: "user",
                token
            });
        }

        // Admin login - Send OTP
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        await db.query(
            "UPDATE users SET login_otp=?, login_otp_expiry=? WHERE id=?",
            [otp, expiry, user.id]
        );

        // Send OTP with 'login' type for professional styling
        await sendOTP(user.email, otp, 'login');

        return res.json({
            success: true,
            role: "admin",
            requiresOTP: true,
            email: user.email
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// ==================== ADMIN OTP VERIFY ====================
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        const admin = rows[0];

        if (admin.login_otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        if (new Date() > new Date(admin.login_otp_expiry)) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        await db.query(
            "UPDATE users SET login_otp=NULL, login_otp_expiry=NULL WHERE id=?",
            [admin.id]
        );

        const token = jwt.sign(
            {
                id: admin.id,
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            token,
            role: "admin"
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Email not registered"
            });
        }

        const user = rows[0];
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        await db.query(
            "UPDATE users SET reset_otp=?, reset_otp_expiry=? WHERE id=?",
            [otp, expiry, user.id]
        );

        // Send OTP with 'reset' type for password reset
        await sendOTP(user.email, otp, 'reset');

        res.json({
            success: true,
            message: "OTP sent to your email"
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// ==================== VERIFY FORGOT PASSWORD OTP ====================
exports.verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = rows[0];

        if (user.reset_otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        if (new Date() > new Date(user.reset_otp_expiry)) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        await db.query(
            "UPDATE users SET reset_otp=NULL, reset_otp_expiry=NULL WHERE id=?",
            [user.id]
        );

        const resetToken = jwt.sign(
            {
                id: user.id,
                purpose: "password-reset"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m"
            }
        );

        res.json({
            success: true,
            message: "OTP verified",
            resetToken
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// ==================== RESET PASSWORD ====================
exports.resetPassword = async (req, res) => {
    try {
        const {
            resetToken,
            newPassword,
            confirmPassword
        } = req.body;

        if (!resetToken) {
            return res.status(401).json({
                message: "Reset token missing"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );
        } catch {
            return res.status(401).json({
                message: "Invalid or expired reset token"
            });
        }

        if (decoded.purpose !== "password-reset") {
            return res.status(401).json({
                message: "Invalid reset token"
            });
        }

        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );

        await db.query(
            "UPDATE users SET password=? WHERE id=?",
            [hashedPassword, decoded.id]
        );

        res.json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// controllers/authController.js - Add these functions

// ==================== RESEND OTP ====================
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = rows[0];

        // Check if user is admin (for login OTP)
        // Check if OTP is for login or password reset based on context
        const { type = 'login' } = req.query; // 'login' or 'reset'

        // Rate limiting - Check if OTP was requested recently (within 60 seconds)
        let lastOTPRequest = null;
        if (type === 'login') {
            // Check last login OTP request
            const [lastRequest] = await db.query(
                "SELECT login_otp_expiry FROM users WHERE id=?",
                [user.id]
            );
            if (lastRequest.length > 0 && lastRequest[0].login_otp_expiry) {
                lastOTPRequest = new Date(lastRequest[0].login_otp_expiry);
                // If OTP hasn't expired yet, check time since creation
                const timeSinceCreation = Date.now() - (lastOTPRequest.getTime() - 5 * 60 * 1000);
                if (timeSinceCreation < 60000) { // 60 seconds cooldown
                    return res.status(429).json({
                        success: false,
                        message: "Please wait 60 seconds before requesting a new OTP",
                        wait_time: Math.ceil((60000 - timeSinceCreation) / 1000)
                    });
                }
            }
        } else {
            // Check last reset OTP request
            const [lastRequest] = await db.query(
                "SELECT reset_otp_expiry FROM users WHERE id=?",
                [user.id]
            );
            if (lastRequest.length > 0 && lastRequest[0].reset_otp_expiry) {
                lastOTPRequest = new Date(lastRequest[0].reset_otp_expiry);
                const timeSinceCreation = Date.now() - (lastOTPRequest.getTime() - 5 * 60 * 1000);
                if (timeSinceCreation < 60000) {
                    return res.status(429).json({
                        success: false,
                        message: "Please wait 60 seconds before requesting a new OTP",
                        wait_time: Math.ceil((60000 - timeSinceCreation) / 1000)
                    });
                }
            }
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        // Update OTP in database
        if (type === 'login') {
            await db.query(
                "UPDATE users SET login_otp=?, login_otp_expiry=? WHERE id=?",
                [otp, expiry, user.id]
            );
        } else {
            await db.query(
                "UPDATE users SET reset_otp=?, reset_otp_expiry=? WHERE id=?",
                [otp, expiry, user.id]
            );
        }

        // Send OTP email
        const emailType = type === 'login' ? 'login' : 'reset';
        await sendOTP(user.email, otp, emailType);

        res.json({
            success: true,
            message: "New OTP sent to your email",
            email: user.email,
            expires_in: "5 minutes"
        });

    } catch (err) {
        console.error("Resend OTP Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== RESEND ADMIN LOGIN OTP ====================
exports.resendLoginOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=? AND role='admin'",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const admin = rows[0];

        // Check cooldown - 60 seconds between resends
        const [lastOTP] = await db.query(
            "SELECT login_otp, login_otp_expiry FROM users WHERE id=?",
            [admin.id]
        );

        if (lastOTP.length > 0 && lastOTP[0].login_otp_expiry) {
            const expiryTime = new Date(lastOTP[0].login_otp_expiry);
            const timeSinceCreation = Date.now() - (expiryTime.getTime() - 5 * 60 * 1000);
            
            if (timeSinceCreation < 60000) {
                const remainingSeconds = Math.ceil((60000 - timeSinceCreation) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
                    wait_time: remainingSeconds
                });
            }
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        // Update database
        await db.query(
            "UPDATE users SET login_otp=?, login_otp_expiry=? WHERE id=?",
            [otp, expiry, admin.id]
        );

        // Send OTP
        await sendOTP(admin.email, otp, 'login');

        res.json({
            success: true,
            message: "New OTP sent to your email",
            email: admin.email,
            expires_in: "5 minutes"
        });

    } catch (err) {
        console.error("Resend Login OTP Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== RESEND PASSWORD RESET OTP ====================
exports.resendResetOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = rows[0];

        // Check cooldown
        const [lastOTP] = await db.query(
            "SELECT reset_otp, reset_otp_expiry FROM users WHERE id=?",
            [user.id]
        );

        if (lastOTP.length > 0 && lastOTP[0].reset_otp_expiry) {
            const expiryTime = new Date(lastOTP[0].reset_otp_expiry);
            const timeSinceCreation = Date.now() - (expiryTime.getTime() - 5 * 60 * 1000);
            
            if (timeSinceCreation < 60000) {
                const remainingSeconds = Math.ceil((60000 - timeSinceCreation) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
                    wait_time: remainingSeconds
                });
            }
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        // Update database
        await db.query(
            "UPDATE users SET reset_otp=?, reset_otp_expiry=? WHERE id=?",
            [otp, expiry, user.id]
        );

        // Send OTP
        await sendOTP(user.email, otp, 'reset');

        res.json({
            success: true,
            message: "New OTP sent to your email",
            email: user.email,
            expires_in: "5 minutes"
        });

    } catch (err) {
        console.error("Resend Reset OTP Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};