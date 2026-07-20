const db = require("../config/db");

exports.getPlans = async (req, res) => {
    try {

        const [plans] = await db.query(`
            SELECT
                id,
                name,
                price,
                currency,
                duration_days,
                description
            FROM plans
            WHERE status='active'
            ORDER BY price ASC
        `);

        res.json({
            success: true,
            plans
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch plans."
        });

    }
};
