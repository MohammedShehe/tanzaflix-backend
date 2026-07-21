const db = require("../config/db");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");

// ==================== CREATE USER ====================
exports.createUser = async(req, res) => {
    try {
        const {
            full_name,
            phone,
            country,
            region,
            email,
            password,
            confirmPassword
        } = req.body;

        if (!full_name || !phone || !country || !email || !password || !confirmPassword) {
            return res.status(400).json({
                message: "Please fill all required fields."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        if (country === "Tanzania" && !region) {
            return res.status(400).json({
                message: "Region is required."
            });
        }

        const [exists] = await db.query(
            "SELECT id FROM users WHERE email=?",
            [email]
        );

        if (exists.length) {
            return res.status(400).json({
                message: "Email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let image = null;
        let imagePublicId = null;

        if (req.file) {
            image = req.file.path;
            imagePublicId = req.file.filename;
        }

        await db.query(
            `INSERT INTO users
            (
                full_name,
                phone,
                country,
                region,
                email,
                password,
                profile_image,
                profile_public_id,
                role
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                full_name,
                phone,
                country,
                country === "Tanzania" ? region : null,
                email,
                hashedPassword,
                image,
                imagePublicId,
                "user"
            ]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully."
        });
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// ==================== GET ALL USERS ====================
exports.getUsers = async(req, res) => {
    try {
        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                phone,
                country,
                region,
                email,
                role,
                profile_image,
                created_at,
                has_watched_before,
                first_watch_at
            FROM users
            WHERE role = 'user'
            ORDER BY id DESC
            `
        );

        res.json({
            success: true,
            total: users.length,
            users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== UPDATE USER ====================
exports.updateUser = async(req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            phone,
            country,
            region,
            email
        } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE id=? AND role='user'",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = rows[0];

        const [existingEmail] = await db.query(
            "SELECT id FROM users WHERE email=? AND id<>?",
            [email, id]
        );

        if (existingEmail.length) {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        let image = user.profile_image;
        let imagePublicId = user.profile_public_id;

        if (req.file) {
            if (imagePublicId) {
                await cloudinary.uploader.destroy(
                    imagePublicId,
                    { resource_type: "image" }
                );
            }
            image = req.file.path;
            imagePublicId = req.file.filename;
        }

        await db.query(
            `
            UPDATE users SET
                full_name=?,
                phone=?,
                country=?,
                region=?,
                email=?,
                profile_image=?,
                profile_public_id=?
            WHERE id=?
            `,
            [
                full_name,
                phone,
                country,
                country === "Tanzania" ? region : null,
                email,
                image,
                imagePublicId,
                id
            ]
        );

        res.json({
            success: true,
            message: "User updated successfully."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== DELETE USER ====================
exports.deleteUser = async(req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM users WHERE id=? AND role='user'",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = rows[0];

        if (user.profile_public_id) {
            await cloudinary.uploader.destroy(
                user.profile_public_id,
                { resource_type: "image" }
            );
        }

        await db.query(
            "DELETE FROM users WHERE id=?",
            [id]
        );

        res.json({
            success: true,
            message: "User deleted successfully."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET USER STATS ====================
exports.getUserStats = async(req, res) => {
    try {
        // Get total users count (only regular users, not admins)
        const [totalUsers] = await db.query(
            `SELECT COUNT(*) as total 
             FROM users 
             WHERE role = 'user'`
        );

        // Get users by country
        const [usersByCountry] = await db.query(
            `SELECT 
                country,
                COUNT(*) as count
             FROM users
             WHERE role = 'user'
             GROUP BY country
             ORDER BY count DESC`
        );

        // Get users by region (for Tanzania)
        const [usersByRegion] = await db.query(
            `SELECT 
                region,
                COUNT(*) as count
             FROM users
             WHERE role = 'user' AND country = 'Tanzania' AND region IS NOT NULL
             GROUP BY region
             ORDER BY count DESC`
        );

        // Get users by registration date (last 7 days)
        const [weeklyRegistrations] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
             FROM users
             WHERE role = 'user' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        // Get users by registration date (last 30 days)
        const [monthlyRegistrations] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
             FROM users
             WHERE role = 'user' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        // Get users who have watched before
        const [watchedUsers] = await db.query(
            `SELECT 
                COUNT(*) as total
             FROM users
             WHERE role = 'user' AND has_watched_before = 1`
        );

        // Get users who have never watched
        const [neverWatchedUsers] = await db.query(
            `SELECT 
                COUNT(*) as total
             FROM users
             WHERE role = 'user' AND (has_watched_before = 0 OR has_watched_before IS NULL)`
        );

        // Get users with active subscriptions
        const [activeSubscriptions] = await db.query(
            `SELECT 
                COUNT(DISTINCT s.user_id) as total
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             WHERE u.role = 'user' 
                AND s.status = 'active' 
                AND s.expires_at > NOW()`
        );

        // Get users with expired subscriptions
        const [expiredSubscriptions] = await db.query(
            `SELECT 
                COUNT(DISTINCT s.user_id) as total
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             WHERE u.role = 'user' 
                AND s.status = 'expired'`
        );

        // Get users who have purchased movies
        const [usersWithPurchases] = await db.query(
            `SELECT 
                COUNT(DISTINCT mp.user_id) as total
             FROM movie_purchases mp
             JOIN users u ON mp.user_id = u.id
             WHERE u.role = 'user' AND mp.status = 'completed'`
        );

        // Get total movie purchases by users
        const [totalPurchases] = await db.query(
            `SELECT 
                COUNT(*) as total_purchases,
                SUM(amount) as total_revenue
             FROM movie_purchases mp
             JOIN users u ON mp.user_id = u.id
             WHERE u.role = 'user' AND mp.status = 'completed'`
        );

        // Get newest users (last 10)
        const [newestUsers] = await db.query(
            `SELECT 
                id,
                full_name,
                email,
                phone,
                country,
                created_at
             FROM users
             WHERE role = 'user'
             ORDER BY created_at DESC
             LIMIT 10`
        );

        // Combine all stats
        const stats = {
            total_users: totalUsers[0]?.total || 0,
            users_by_country: usersByCountry,
            users_by_region: usersByRegion,
            registrations: {
                last_7_days: weeklyRegistrations,
                last_30_days: monthlyRegistrations
            },
            watch_activity: {
                has_watched: watchedUsers[0]?.total || 0,
                never_watched: neverWatchedUsers[0]?.total || 0
            },
            subscriptions: {
                active: activeSubscriptions[0]?.total || 0,
                expired: expiredSubscriptions[0]?.total || 0
            },
            purchases: {
                users_with_purchases: usersWithPurchases[0]?.total || 0,
                total_purchases: totalPurchases[0]?.total_purchases || 0,
                total_revenue: parseFloat(totalPurchases[0]?.total_revenue || 0)
            },
            newest_users: newestUsers,
            summary: {
                // Quick summary percentages
                watch_rate: totalUsers[0]?.total > 0 
                    ? Math.round((watchedUsers[0]?.total || 0) / totalUsers[0].total * 100)
                    : 0,
                subscription_rate: totalUsers[0]?.total > 0
                    ? Math.round((activeSubscriptions[0]?.total || 0) / totalUsers[0].total * 100)
                    : 0,
                purchase_rate: totalUsers[0]?.total > 0
                    ? Math.round((usersWithPurchases[0]?.total || 0) / totalUsers[0].total * 100)
                    : 0
            }
        };

        res.json({
            success: true,
            stats
        });
    } catch (err) {
        console.error("Get User Stats Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};