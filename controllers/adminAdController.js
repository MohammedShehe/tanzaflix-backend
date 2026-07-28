const db = require("../config/db");
const cloudinary = require("../config/cloudinary");

// ==================== CREATE AD ====================
exports.createAd = async (req, res) => {
    try {
        const { title, url } = req.body;

        if (!title || !url) {
            return res.status(400).json({
                success: false,
                message: "Title and URL are required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Ad image is required"
            });
        }

        const image_url = req.file.path;
        const image_public_id = req.file.filename;

        const [result] = await db.query(
            `INSERT INTO ads (title, url, image_url, image_public_id, status) 
             VALUES (?, ?, ?, ?, 'active')`,
            [title, url, image_url, image_public_id]
        );

        res.status(201).json({
            success: true,
            message: "Ad created successfully",
            adId: result.insertId
        });

    } catch (err) {
        console.error("Create Ad Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET ALL ADS ====================
exports.getAds = async (req, res) => {
    try {
        const [ads] = await db.query(
            `SELECT 
                id,
                title,
                url,
                image_url,
                status,
                clicks,
                views,
                created_at,
                updated_at
             FROM ads
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            total: ads.length,
            ads
        });

    } catch (err) {
        console.error("Get Ads Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET ACTIVE ADS (FOR USERS) ====================
exports.getActiveAds = async (req, res) => {
    try {
        const [ads] = await db.query(
            `SELECT 
                id,
                title,
                url,
                image_url,
                created_at
             FROM ads
             WHERE status = 'active'
             ORDER BY created_at DESC`
        );

        // Increment views for each ad
        for (const ad of ads) {
            await db.query(
                `UPDATE ads SET views = views + 1 WHERE id = ?`,
                [ad.id]
            );
        }

        res.json({
            success: true,
            total: ads.length,
            ads
        });

    } catch (err) {
        console.error("Get Active Ads Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET SINGLE AD ====================
exports.getAd = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT 
                id,
                title,
                url,
                image_url,
                status,
                clicks,
                views,
                created_at,
                updated_at
             FROM ads
             WHERE id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Ad not found"
            });
        }

        res.json({
            success: true,
            ad: rows[0]
        });

    } catch (err) {
        console.error("Get Ad Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== UPDATE AD ====================
exports.updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, status } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM ads WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Ad not found"
            });
        }

        const ad = rows[0];

        let image_url = ad.image_url;
        let image_public_id = ad.image_public_id;

        if (req.file) {
            // Delete old image from Cloudinary
            if (image_public_id) {
                await cloudinary.uploader.destroy(image_public_id, {
                    resource_type: "image"
                });
            }
            image_url = req.file.path;
            image_public_id = req.file.filename;
        }

        await db.query(
            `UPDATE ads SET
                title = ?,
                url = ?,
                status = ?,
                image_url = ?,
                image_public_id = ?
             WHERE id = ?`,
            [
                title || ad.title,
                url || ad.url,
                status || ad.status,
                image_url,
                image_public_id,
                id
            ]
        );

        res.json({
            success: true,
            message: "Ad updated successfully"
        });

    } catch (err) {
        console.error("Update Ad Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== DELETE AD ====================
exports.deleteAd = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM ads WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Ad not found"
            });
        }

        const ad = rows[0];

        // Delete image from Cloudinary
        if (ad.image_public_id) {
            await cloudinary.uploader.destroy(ad.image_public_id, {
                resource_type: "image"
            });
        }

        await db.query("DELETE FROM ads WHERE id = ?", [id]);

        res.json({
            success: true,
            message: "Ad deleted successfully"
        });

    } catch (err) {
        console.error("Delete Ad Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== TOGGLE AD STATUS ====================
exports.toggleAdStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT status FROM ads WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Ad not found"
            });
        }

        const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';

        await db.query(
            "UPDATE ads SET status = ? WHERE id = ?",
            [newStatus, id]
        );

        res.json({
            success: true,
            message: `Ad ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
            status: newStatus
        });

    } catch (err) {
        console.error("Toggle Ad Status Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== TRACK AD CLICK ====================
exports.trackAdClick = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT id, url FROM ads WHERE id = ? AND status = 'active'",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Ad not found or inactive"
            });
        }

        await db.query(
            `UPDATE ads SET clicks = clicks + 1 WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            url: rows[0].url
        });

    } catch (err) {
        console.error("Track Ad Click Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET AD STATISTICS ====================
exports.getAdStats = async (req, res) => {
    try {
        const [total] = await db.query(
            `SELECT 
                COUNT(*) as total_ads,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_ads,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_ads,
                SUM(clicks) as total_clicks,
                SUM(views) as total_views
             FROM ads`
        );

        const [topAds] = await db.query(
            `SELECT 
                id,
                title,
                clicks,
                views,
                status,
                ROUND((clicks / NULLIF(views, 0)) * 100, 2) as ctr
             FROM ads
             WHERE views > 0
             ORDER BY clicks DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            statistics: {
                total_ads: total[0]?.total_ads || 0,
                active_ads: total[0]?.active_ads || 0,
                inactive_ads: total[0]?.inactive_ads || 0,
                total_clicks: total[0]?.total_clicks || 0,
                total_views: total[0]?.total_views || 0,
                overall_ctr: total[0]?.total_views > 0 
                    ? Math.round((total[0]?.total_clicks / total[0]?.total_views) * 100 * 100) / 100
                    : 0
            },
            top_ads: topAds
        });

    } catch (err) {
        console.error("Get Ad Stats Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};