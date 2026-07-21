// controllers/adminActivitiesController.js
const db = require("../config/db");

// ==================== DASHBOARD OVERVIEW ====================
exports.getDashboardOverview = async (req, res) => {
    try {
        // Get current date and date ranges
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // 1. Total Users
        const [totalUsers] = await db.query(
            `SELECT COUNT(*) as total FROM users WHERE role = 'user'`
        );

        // 2. Active Users (watched in last 7 days)
        const [activeUsers] = await db.query(
            `SELECT COUNT(DISTINCT user_id) as total 
             FROM movie_access_logs 
             WHERE created_at >= ?`,
            [weekAgo]
        );

        // 3. New Users (last 30 days)
        const [newUsers] = await db.query(
            `SELECT COUNT(*) as total 
             FROM users 
             WHERE role = 'user' AND created_at >= ?`,
            [monthAgo]
        );

        // 4. Active Subscriptions
        const [activeSubscriptions] = await db.query(
            `SELECT COUNT(*) as total 
             FROM subscriptions 
             WHERE status = 'active' AND expires_at > NOW()`
        );

        // 5. Total Revenue (last 30 days)
        const [revenue] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM payments 
             WHERE status = 'paid' AND paid_at >= ?`,
            [monthAgo]
        );

        // 6. Average Watch Time
        const [avgWatchTime] = await db.query(
            `SELECT COALESCE(AVG(watched_duration), 0) as avg_time 
             FROM movie_access_logs 
             WHERE created_at >= ? AND watched_duration > 0`,
            [weekAgo]
        );

        // 7. Completion Rate (last 7 days)
        const [completionRate] = await db.query(
            `SELECT 
                COUNT(*) as total_views,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_views
             FROM movie_access_logs 
             WHERE created_at >= ? AND access_type != 'denied'`,
            [weekAgo]
        );

        const totalViews = completionRate[0]?.total_views || 0;
        const completedViews = completionRate[0]?.completed_views || 0;
        const completionRatePercent = totalViews > 0 
            ? Math.round((completedViews / totalViews) * 100) 
            : 0;

        // 8. Total Views (last 7 days)
        const [totalViewsCount] = await db.query(
            `SELECT COUNT(*) as total 
             FROM movie_access_logs 
             WHERE created_at >= ? AND access_type != 'denied'`,
            [weekAgo]
        );

        // 9. User Retention (users who watched in last 7 days vs total)
        const retentionRate = totalUsers[0]?.total > 0
            ? Math.round((activeUsers[0]?.total / totalUsers[0]?.total) * 100)
            : 0;

        // 10. Subscription Rate
        const subscriptionRate = totalUsers[0]?.total > 0
            ? Math.round((activeSubscriptions[0]?.total / totalUsers[0]?.total) * 100)
            : 0;

        // 11. Revenue Breakdown (Subscription vs Single Purchase)
        const [revenueBreakdown] = await db.query(
            `SELECT 
                'subscription' as type,
                COALESCE(SUM(amount), 0) as total
             FROM payments 
             WHERE status = 'paid' AND plan_id IS NOT NULL AND paid_at >= ?
             UNION ALL
             SELECT 
                'purchase' as type,
                COALESCE(SUM(amount), 0) as total
             FROM payments 
             WHERE status = 'paid' AND plan_id IS NULL AND paid_at >= ?`,
            [monthAgo, monthAgo]
        );

        // 12. Daily Activity (last 7 days)
        const [dailyActivity] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as views,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(CASE WHEN access_type = 'free_trial' THEN 1 ELSE 0 END) as free_trials,
                SUM(CASE WHEN access_type = 'subscription' THEN 1 ELSE 0 END) as subscription_views,
                SUM(CASE WHEN access_type = 'paid_single' THEN 1 ELSE 0 END) as paid_views,
                SUM(CASE WHEN access_type = 'denied' THEN 1 ELSE 0 END) as denied_attempts
             FROM movie_access_logs 
             WHERE created_at >= ?
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [weekAgo]
        );

        res.json({
            success: true,
            stats: {
                total_users: totalUsers[0]?.total || 0,
                active_users: activeUsers[0]?.total || 0,
                new_users: newUsers[0]?.total || 0,
                active_subscriptions: activeSubscriptions[0]?.total || 0,
                total_revenue: parseFloat(revenue[0]?.total || 0),
                avg_watch_time: Math.round(avgWatchTime[0]?.avg_time / 60) || 0, // in minutes
                completion_rate: completionRatePercent,
                total_views: totalViewsCount[0]?.total || 0,
                retention_rate: retentionRate,
                subscription_rate: subscriptionRate,
                revenue_breakdown: {
                    subscription: parseFloat(revenueBreakdown[0]?.total || 0),
                    purchase: parseFloat(revenueBreakdown[1]?.total || 0)
                },
                daily_activity: dailyActivity
            }
        });

    } catch (err) {
        console.error("Dashboard Overview Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== USER ACTIVITY DETAILS ====================
exports.getUserActivityDetails = async (req, res) => {
    try {
        const { 
            userId, 
            date_from, 
            date_to, 
            activity_type,
            limit = 50,
            page = 1
        } = req.query;

        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];

        // Base conditions
        if (userId) {
            conditions.push("u.id = ?");
            params.push(userId);
        }

        if (date_from) {
            conditions.push("DATE(mal.created_at) >= ?");
            params.push(date_from);
        }

        if (date_to) {
            conditions.push("DATE(mal.created_at) <= ?");
            params.push(date_to);
        }

        if (activity_type && activity_type !== 'all') {
            conditions.push("mal.access_type = ?");
            params.push(activity_type);
        }

        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';

        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total 
             FROM movie_access_logs mal
             JOIN users u ON mal.user_id = u.id
             ${whereClause}`,
            params
        );

        const total = countResult[0]?.total || 0;

        // Get detailed activity logs
        const [activities] = await db.query(
            `SELECT 
                mal.id,
                mal.user_id,
                u.full_name,
                u.email,
                u.country,
                u.region,
                mal.movie_id,
                m.title as movie_title,
                m.movie_type,
                mal.episode_id,
                e.episode_title,
                e.episode_number,
                mal.access_type,
                mal.watched_duration,
                mal.completed,
                mal.created_at,
                CASE 
                    WHEN mal.access_type = 'free_trial' THEN 'Free Trial'
                    WHEN mal.access_type = 'subscription' THEN 'Subscription'
                    WHEN mal.access_type = 'paid_single' THEN 'Single Purchase'
                    WHEN mal.access_type = 'denied' THEN 'Access Denied'
                END as access_type_label
             FROM movie_access_logs mal
             JOIN users u ON mal.user_id = u.id
             LEFT JOIN movies m ON mal.movie_id = m.id
             LEFT JOIN episodes e ON mal.episode_id = e.id
             ${whereClause}
             ORDER BY mal.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Get user's subscription status if userId provided
        let subscriptionInfo = null;
        if (userId) {
            const [subscription] = await db.query(
                `SELECT 
                    s.id,
                    s.status,
                    s.expires_at,
                    p.name as plan_name,
                    p.price
                 FROM subscriptions s
                 LEFT JOIN plans p ON s.plan_id = p.id
                 WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
                 ORDER BY s.expires_at DESC LIMIT 1`,
                [userId]
            );
            subscriptionInfo = subscription[0] || null;
        }

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit),
            subscription_info: subscriptionInfo,
            activities
        });

    } catch (err) {
        console.error("Get User Activity Details Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== USER ENGAGEMENT METRICS ====================
exports.getUserEngagementMetrics = async (req, res) => {
    try {
        // 1. First-time watcher conversion
        const [conversionData] = await db.query(
            `SELECT 
                COUNT(DISTINCT u.id) as total_first_time,
                COUNT(DISTINCT CASE 
                    WHEN mal.access_type = 'free_trial' AND mal.completed = 1 
                    THEN u.id 
                END) as converted_to_watch,
                COUNT(DISTINCT CASE 
                    WHEN s.id IS NOT NULL AND s.status = 'active' 
                    THEN u.id 
                END) as converted_to_subscribe
             FROM users u
             LEFT JOIN movie_access_logs mal ON u.id = mal.user_id AND mal.access_type = 'free_trial'
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.expires_at > NOW()
             WHERE u.role = 'user'
             GROUP BY u.id`
        );

        // 2. User segments
        const [userSegments] = await db.query(
            `SELECT 
                'Active Users' as segment,
                COUNT(DISTINCT u.id) as count
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user' 
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             UNION ALL
             SELECT 
                'At-Risk Users' as segment,
                COUNT(DISTINCT u.id) as count
             FROM users u
             LEFT JOIN movie_access_logs mal ON u.id = mal.user_id 
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
             WHERE u.role = 'user' 
                AND mal.id IS NULL
                AND u.created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
             UNION ALL
             SELECT 
                'High-Value Users' as segment,
                COUNT(DISTINCT u.id) as count
             FROM users u
             JOIN subscriptions s ON u.id = s.user_id 
             WHERE u.role = 'user' 
                AND s.status = 'active' 
                AND s.expires_at > NOW()
             UNION ALL
             SELECT 
                'Never Watched' as segment,
                COUNT(DISTINCT u.id) as count
             FROM users u
             LEFT JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user' 
                AND mal.id IS NULL
                AND u.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        // 3. Peak watching hours
        const [peakHours] = await db.query(
            `SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as views,
                COUNT(DISTINCT user_id) as unique_users
             FROM movie_access_logs 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND access_type != 'denied'
             GROUP BY HOUR(created_at)
             ORDER BY hour ASC`
        );

        // 4. User activity timeline (last 30 days)
        const [activityTimeline] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_views,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(CASE WHEN access_type = 'free_trial' AND completed = 1 THEN 1 ELSE 0 END) as trials_completed
             FROM movie_access_logs 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND access_type != 'denied'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        res.json({
            success: true,
            metrics: {
                conversion: {
                    first_time_watchers: conversionData.length || 0,
                    completed_free_trial: conversionData.filter(d => d.converted_to_watch).length || 0,
                    converted_to_subscription: conversionData.filter(d => d.converted_to_subscribe).length || 0,
                    trial_to_subscription_rate: conversionData.length > 0 
                        ? Math.round((conversionData.filter(d => d.converted_to_subscribe).length / conversionData.length) * 100)
                        : 0
                },
                user_segments: userSegments,
                peak_watching_hours: peakHours,
                activity_timeline: activityTimeline
            }
        });

    } catch (err) {
        console.error("Get User Engagement Metrics Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== CONTENT PERFORMANCE ====================
exports.getContentPerformance = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);

        // 1. Most watched movies
        const [mostWatched] = await db.query(
            `SELECT 
                m.id,
                m.title,
                m.movie_type,
                m.category,
                m.country,
                COUNT(mal.id) as total_views,
                COUNT(DISTINCT mal.user_id) as unique_viewers,
                SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) as completions,
                ROUND(
                    (SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) / COUNT(mal.id)) * 100, 2
                ) as completion_rate,
                AVG(mal.watched_duration) as avg_watch_duration
             FROM movies m
             LEFT JOIN movie_access_logs mal ON m.id = mal.movie_id
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
             WHERE m.id IS NOT NULL
             GROUP BY m.id
             ORDER BY total_views DESC
             LIMIT 20`,
            [days]
        );

        // 2. Content by category
        const [categoryPerformance] = await db.query(
            `SELECT 
                m.category,
                COUNT(mal.id) as total_views,
                COUNT(DISTINCT mal.user_id) as unique_viewers,
                SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) as completions
             FROM movies m
             LEFT JOIN movie_access_logs mal ON m.id = mal.movie_id
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
             WHERE m.category IS NOT NULL
             GROUP BY m.category
             ORDER BY total_views DESC`,
            [days]
        );

        // 3. Content by country
        const [countryPerformance] = await db.query(
            `SELECT 
                m.country,
                COUNT(mal.id) as total_views,
                COUNT(DISTINCT mal.user_id) as unique_viewers
             FROM movies m
             LEFT JOIN movie_access_logs mal ON m.id = mal.movie_id
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
             WHERE m.country IS NOT NULL
             GROUP BY m.country
             ORDER BY total_views DESC`,
            [days]
        );

        // 4. Drop-off points (for single movies with duration data)
        const [dropOffPoints] = await db.query(
            `SELECT 
                m.title,
                m.movie_time,
                AVG(mal.watched_duration) as avg_watch_duration,
                COUNT(mal.id) as total_views,
                ROUND(
                    (AVG(mal.watched_duration) / 
                    (SELECT AVG(watched_duration) FROM watch_progress WHERE movie_id = m.id)
                    ) * 100, 2
                ) as watch_percentage
             FROM movies m
             JOIN movie_access_logs mal ON m.id = mal.movie_id
             WHERE m.movie_type = 'single'
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
                AND mal.watched_duration > 0
             GROUP BY m.id
             HAVING total_views > 10
             ORDER BY watch_percentage ASC
             LIMIT 10`,
            [days]
        );

        // 5. Series performance
        const [seriesPerformance] = await db.query(
            `SELECT 
                m.id,
                m.title,
                COUNT(DISTINCT s.id) as total_seasons,
                COUNT(DISTINCT e.id) as total_episodes,
                COUNT(mal.id) as total_views,
                COUNT(DISTINCT mal.user_id) as unique_viewers
             FROM movies m
             JOIN seasons s ON m.id = s.movie_id
             JOIN episodes e ON s.id = e.season_id
             LEFT JOIN movie_access_logs mal ON e.id = mal.episode_id
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
             WHERE m.movie_type = 'series'
             GROUP BY m.id
             ORDER BY total_views DESC`,
            [days]
        );

        res.json({
            success: true,
            content_performance: {
                period: `${days} days`,
                most_watched: mostWatched,
                by_category: categoryPerformance,
                by_country: countryPerformance,
                drop_off_points: dropOffPoints,
                series_performance: seriesPerformance
            }
        });

    } catch (err) {
        console.error("Get Content Performance Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== REVENUE ANALYTICS ====================
exports.getRevenueAnalytics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);

        // 1. Revenue trends (daily)
        const [dailyRevenue] = await db.query(
            `SELECT 
                DATE(paid_at) as date,
                COUNT(*) as transactions,
                SUM(amount) as revenue,
                AVG(amount) as avg_transaction_value,
                SUM(CASE WHEN plan_id IS NOT NULL THEN 1 ELSE 0 END) as subscription_transactions,
                SUM(CASE WHEN plan_id IS NOT NULL THEN amount ELSE 0 END) as subscription_revenue,
                SUM(CASE WHEN plan_id IS NULL THEN 1 ELSE 0 END) as purchase_transactions,
                SUM(CASE WHEN plan_id IS NULL THEN amount ELSE 0 END) as purchase_revenue
             FROM payments 
             WHERE status = 'paid' 
                AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(paid_at)
             ORDER BY date DESC`,
            [days]
        );

        // 2. Payment method breakdown
        const [paymentMethods] = await db.query(
            `SELECT 
                payment_method,
                COUNT(*) as total_transactions,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_value
             FROM payments 
             WHERE status = 'paid' 
                AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY payment_method
             ORDER BY total_revenue DESC`,
            [days]
        );

        // 3. Subscription vs Purchase breakdown
        const [revenueBreakdown] = await db.query(
            `SELECT 
                'Subscriptions' as type,
                COUNT(*) as transactions,
                SUM(amount) as revenue,
                AVG(amount) as avg_value
             FROM payments 
             WHERE status = 'paid' 
                AND plan_id IS NOT NULL
                AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             UNION ALL
             SELECT 
                'Single Purchases' as type,
                COUNT(*) as transactions,
                SUM(amount) as revenue,
                AVG(amount) as avg_value
             FROM payments 
             WHERE status = 'paid' 
                AND plan_id IS NULL
                AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days, days]
        );

        // 4. Monthly revenue summary
        const [monthlyRevenue] = await db.query(
            `SELECT 
                DATE_FORMAT(paid_at, '%Y-%m') as month,
                COUNT(*) as transactions,
                SUM(amount) as revenue,
                COUNT(DISTINCT user_id) as unique_customers
             FROM payments 
             WHERE status = 'paid' 
                AND paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
             ORDER BY month DESC`
        );

        // 5. Failed payments analysis
        const [failedPayments] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as failed_count,
                payment_method,
                SUM(amount) as total_amount
             FROM payments 
             WHERE status IN ('failed', 'expired')
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at), payment_method
             ORDER BY date DESC
             LIMIT 20`,
            [days]
        );

        // 6. ARPU (Average Revenue Per User)
        const [arpu] = await db.query(
            `SELECT 
                COUNT(DISTINCT user_id) as paying_users,
                SUM(amount) as total_revenue,
                ROUND(SUM(amount) / COUNT(DISTINCT user_id), 2) as arpu
             FROM payments 
             WHERE status = 'paid' 
                AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );

        // 7. Subscription renewal rate
        const [renewalRate] = await db.query(
            `SELECT 
                COUNT(*) as total_expired,
                SUM(CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM subscriptions s2 
                        WHERE s2.user_id = s.user_id 
                            AND s2.created_at > s.expires_at
                            AND s2.status = 'active'
                    ) THEN 1 ELSE 0 
                END) as renewed
             FROM subscriptions s
             WHERE s.status = 'expired' 
                AND s.expires_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );

        const totalExpired = renewalRate[0]?.total_expired || 0;
        const renewed = renewalRate[0]?.renewed || 0;
        const renewalRatePercent = totalExpired > 0 
            ? Math.round((renewed / totalExpired) * 100) 
            : 0;

        res.json({
            success: true,
            revenue_analytics: {
                period: `${days} days`,
                daily_revenue: dailyRevenue,
                payment_methods: paymentMethods,
                revenue_breakdown: revenueBreakdown,
                monthly_trend: monthlyRevenue,
                failed_payments: failedPayments,
                arpu: {
                    paying_users: arpu[0]?.paying_users || 0,
                    total_revenue: parseFloat(arpu[0]?.total_revenue || 0),
                    arpu: parseFloat(arpu[0]?.arpu || 0)
                },
                subscription_renewal: {
                    total_expired: totalExpired,
                    renewed: renewed,
                    renewal_rate: renewalRatePercent
                }
            }
        });

    } catch (err) {
        console.error("Get Revenue Analytics Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== USER DROP-OFF ANALYSIS ====================
exports.getUserDropOffAnalysis = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        // 1. Users who started but didn't complete
        const [dropOffUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                COUNT(mal.id) as total_starts,
                SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) as completions,
                MAX(mal.created_at) as last_activity,
                DATEDIFF(NOW(), MAX(mal.created_at)) as days_inactive
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type IN ('free_trial', 'subscription', 'paid_single')
             GROUP BY u.id
             HAVING completions < total_starts * 0.5
                AND total_starts > 2
             ORDER BY days_inactive DESC
             LIMIT 50`,
            [days]
        );

        // 2. Drop-off by movie
        const [dropOffMovies] = await db.query(
            `SELECT 
                m.id,
                m.title,
                COUNT(mal.id) as total_views,
                SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) as completions,
                ROUND(
                    ((COUNT(mal.id) - SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END)) / COUNT(mal.id)) * 100, 2
                ) as drop_off_rate
             FROM movies m
             JOIN movie_access_logs mal ON m.id = mal.movie_id
             WHERE mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
                AND mal.watched_duration > 0
             GROUP BY m.id
             HAVING total_views > 10
             ORDER BY drop_off_rate DESC
             LIMIT 20`,
            [days]
        );

        // 3. Drop-off by access type
        const [dropOffByType] = await db.query(
            `SELECT 
                access_type,
                COUNT(*) as total_views,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completions,
                ROUND(
                    ((COUNT(*) - SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END)) / COUNT(*)) * 100, 2
                ) as drop_off_rate
             FROM movie_access_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND access_type != 'denied'
             GROUP BY access_type`,
            [days]
        );

        // 4. Time-based drop-off (after what duration do users stop watching)
        const [timeDropOff] = await db.query(
            `SELECT 
                CASE 
                    WHEN watched_duration < 60 THEN '0-1 min'
                    WHEN watched_duration < 300 THEN '1-5 min'
                    WHEN watched_duration < 600 THEN '5-10 min'
                    WHEN watched_duration < 1800 THEN '10-30 min'
                    WHEN watched_duration < 3600 THEN '30-60 min'
                    ELSE '60+ min'
                END as watch_interval,
                COUNT(*) as views,
                AVG(watched_duration) as avg_duration
             FROM movie_access_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND access_type != 'denied'
                AND watched_duration > 0
             GROUP BY watch_interval
             ORDER BY MIN(watched_duration)`,
            [days]
        );

        res.json({
            success: true,
            drop_off_analysis: {
                users_at_risk: dropOffUsers,
                movies_with_high_dropoff: dropOffMovies,
                by_access_type: dropOffByType,
                watch_time_distribution: timeDropOff
            }
        });

    } catch (err) {
        console.error("Get User Drop-Off Analysis Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET SINGLE USER DETAILS ====================
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. User basic info
        const [userInfo] = await db.query(
            `SELECT 
                id,
                full_name,
                email,
                phone,
                country,
                region,
                profile_image,
                role,
                created_at,
                has_watched_before,
                first_watch_at
             FROM users 
             WHERE id = ? AND role = 'user'`,
            [userId]
        );

        if (!userInfo.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userInfo[0];

        // 2. Subscription history
        const [subscriptions] = await db.query(
            `SELECT 
                s.id,
                s.status,
                s.expires_at,
                s.created_at,
                p.name as plan_name,
                p.price,
                p.duration_days
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ?
             ORDER BY s.created_at DESC`,
            [userId]
        );

        // 3. Purchase history
        const [purchases] = await db.query(
            `SELECT 
                mp.id,
                mp.amount,
                mp.status,
                mp.created_at,
                mp.expires_at,
                m.title as movie_title,
                m.poster
             FROM movie_purchases mp
             LEFT JOIN movies m ON mp.movie_id = m.id
             WHERE mp.user_id = ?
             ORDER BY mp.created_at DESC`,
            [userId]
        );

        // 4. Payment history
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
                created_at
             FROM payments 
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 20`,
            [userId]
        );

        // 5. Watch history with details
        const [watchHistory] = await db.query(
            `SELECT 
                mal.id,
                mal.movie_id,
                m.title as movie_title,
                m.movie_type,
                mal.episode_id,
                e.episode_title,
                e.episode_number,
                mal.access_type,
                mal.watched_duration,
                mal.completed,
                mal.created_at
             FROM movie_access_logs mal
             LEFT JOIN movies m ON mal.movie_id = m.id
             LEFT JOIN episodes e ON mal.episode_id = e.id
             WHERE mal.user_id = ?
             ORDER BY mal.created_at DESC
             LIMIT 50`,
            [userId]
        );

        // 6. Watch time summary
        const [watchSummary] = await db.query(
            `SELECT 
                COUNT(*) as total_views,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_views,
                SUM(watched_duration) as total_watch_time,
                AVG(watched_duration) as avg_watch_time,
                COUNT(DISTINCT movie_id) as unique_movies_watched
             FROM movie_access_logs 
             WHERE user_id = ? AND access_type != 'denied'`,
            [userId]
        );

        // 7. Access attempts (denied)
        const [deniedAttempts] = await db.query(
            `SELECT 
                COUNT(*) as total_denied,
                COUNT(DISTINCT movie_id) as unique_movies_denied
             FROM movie_access_logs 
             WHERE user_id = ? AND access_type = 'denied'`,
            [userId]
        );

        // 8. Current active session (if any)
        const [activeSubscription] = await db.query(
            `SELECT 
                s.id,
                s.expires_at,
                p.name as plan_name
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > NOW()
             LIMIT 1`,
            [userId]
        );

        res.json({
            success: true,
            user: {
                ...user,
                subscriptions,
                purchases,
                payments,
                watch_history: watchHistory,
                watch_summary: {
                    total_views: watchSummary[0]?.total_views || 0,
                    completed_views: watchSummary[0]?.completed_views || 0,
                    total_watch_time_minutes: Math.round((watchSummary[0]?.total_watch_time || 0) / 60),
                    avg_watch_time_minutes: Math.round((watchSummary[0]?.avg_watch_time || 0) / 60),
                    unique_movies_watched: watchSummary[0]?.unique_movies_watched || 0
                },
                access_attempts: {
                    total_denied: deniedAttempts[0]?.total_denied || 0,
                    unique_movies_denied: deniedAttempts[0]?.unique_movies_denied || 0
                },
                active_subscription: activeSubscription[0] || null
            }
        });

    } catch (err) {
        console.error("Get User Details Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET RECENT ACTIVITIES ====================
exports.getRecentActivities = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const [activities] = await db.query(
            `SELECT 
                mal.id,
                mal.user_id,
                u.full_name,
                u.email,
                u.profile_image,
                mal.movie_id,
                m.title as movie_title,
                mal.episode_id,
                e.episode_title,
                e.episode_number,
                mal.access_type,
                CASE 
                    WHEN mal.access_type = 'free_trial' THEN 'Free Trial'
                    WHEN mal.access_type = 'subscription' THEN 'Subscription'
                    WHEN mal.access_type = 'paid_single' THEN 'Single Purchase'
                    WHEN mal.access_type = 'denied' THEN 'Access Denied'
                END as access_type_label,
                mal.completed,
                mal.watched_duration,
                mal.created_at,
                CASE 
                    WHEN TIMESTAMPDIFF(MINUTE, mal.created_at, NOW()) < 1 THEN 'Just now'
                    WHEN TIMESTAMPDIFF(MINUTE, mal.created_at, NOW()) < 60 
                        THEN CONCAT(TIMESTAMPDIFF(MINUTE, mal.created_at, NOW()), 'm ago')
                    WHEN TIMESTAMPDIFF(HOUR, mal.created_at, NOW()) < 24 
                        THEN CONCAT(TIMESTAMPDIFF(HOUR, mal.created_at, NOW()), 'h ago')
                    ELSE DATE_FORMAT(mal.created_at, '%Y-%m-%d %H:%i')
                END as time_ago
             FROM movie_access_logs mal
             LEFT JOIN users u ON mal.user_id = u.id
             LEFT JOIN movies m ON mal.movie_id = m.id
             LEFT JOIN episodes e ON mal.episode_id = e.id
             ORDER BY mal.created_at DESC
             LIMIT ?`,
            [parseInt(limit)]
        );

        res.json({
            success: true,
            total: activities.length,
            activities
        });

    } catch (err) {
        console.error("Get Recent Activities Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET ACTIVITY STATISTICS ====================
exports.getActivityStatistics = async (req, res) => {
    try {
        const { period = '7' } = req.query;
        const days = parseInt(period);

        // 1. Activity by day
        const [activityByDay] = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_activities,
                SUM(CASE WHEN access_type = 'denied' THEN 1 ELSE 0 END) as denied_attempts,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_watches,
                COUNT(DISTINCT user_id) as unique_users
             FROM movie_access_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [days]
        );

        // 2. Activity by hour
        const [activityByHour] = await db.query(
            `SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as total_activities,
                COUNT(DISTINCT user_id) as unique_users
             FROM movie_access_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY HOUR(created_at)
             ORDER BY hour`,
            [days]
        );

        // 3. Activity by access type
        const [activityByType] = await db.query(
            `SELECT 
                access_type,
                COUNT(*) as total,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(watched_duration) as avg_duration
             FROM movie_access_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY access_type`,
            [days]
        );

        // 4. Top active users
        const [topActiveUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                COUNT(mal.id) as activity_count,
                SUM(CASE WHEN mal.completed = 1 THEN 1 ELSE 0 END) as completions,
                SUM(mal.watched_duration) as total_watch_time
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND mal.access_type != 'denied'
             GROUP BY u.id
             ORDER BY activity_count DESC
             LIMIT 10`,
            [days]
        );

        res.json({
            success: true,
            statistics: {
                period: `${days} days`,
                activity_by_day: activityByDay,
                activity_by_hour: activityByHour,
                activity_by_type: activityByType,
                top_active_users: topActiveUsers
            }
        });

    } catch (err) {
        console.error("Get Activity Statistics Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET USER SEGMENT DETAILS ====================
exports.getUserSegments = async (req, res) => {
    try {
        // 1. Active users (watched in last 7 days)
        const [activeUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.country,
                u.created_at,
                COUNT(mal.id) as views_last_7_days,
                SUM(mal.watched_duration) as watch_time
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND mal.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND mal.access_type != 'denied'
             GROUP BY u.id
             ORDER BY views_last_7_days DESC
             LIMIT 50`
        );

        // 2. At-risk users (no activity in 14+ days, but have watched before)
        const [atRiskUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.country,
                u.created_at,
                MAX(mal.created_at) as last_activity,
                DATEDIFF(NOW(), MAX(mal.created_at)) as days_inactive,
                COUNT(mal.id) as total_views
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND u.has_watched_before = 1
                AND NOT EXISTS (
                    SELECT 1 FROM movie_access_logs mal2
                    WHERE mal2.user_id = u.id
                        AND mal2.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                )
             GROUP BY u.id
             ORDER BY days_inactive DESC
             LIMIT 50`
        );

        // 3. High-value users (subscribed or made purchases)
        const [highValueUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.country,
                COUNT(DISTINCT p.id) as total_payments,
                SUM(p.amount) as total_spent,
                MAX(p.paid_at) as last_payment
             FROM users u
             LEFT JOIN payments p ON u.id = p.user_id
             WHERE u.role = 'user'
                AND p.status = 'paid'
             GROUP BY u.id
             HAVING total_spent > 0
             ORDER BY total_spent DESC
             LIMIT 50`
        );

        // 4. Never watched users (registered but never accessed)
        const [neverWatchedUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.country,
                u.created_at,
                DATEDIFF(NOW(), u.created_at) as days_since_registration
             FROM users u
             LEFT JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND mal.id IS NULL
                AND u.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY u.created_at DESC
             LIMIT 50`
        );

        // 5. Trial users (used free trial but didn't convert)
        const [trialUsers] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                COUNT(mal.id) as trial_views,
                MAX(mal.created_at) as last_trial_attempt,
                u.has_watched_before
             FROM users u
             JOIN movie_access_logs mal ON u.id = mal.user_id
             WHERE u.role = 'user'
                AND mal.access_type = 'free_trial'
                AND mal.completed = 1
                AND NOT EXISTS (
                    SELECT 1 FROM subscriptions s
                    WHERE s.user_id = u.id AND s.status = 'active'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM movie_purchases mp
                    WHERE mp.user_id = u.id AND mp.status = 'completed'
                )
             GROUP BY u.id
             ORDER BY last_trial_attempt DESC
             LIMIT 50`
        );

        res.json({
            success: true,
            user_segments: {
                active_users: activeUsers,
                at_risk_users: atRiskUsers,
                high_value_users: highValueUsers,
                never_watched: neverWatchedUsers,
                trial_users_not_converted: trialUsers,
                summary: {
                    active_count: activeUsers.length,
                    at_risk_count: atRiskUsers.length,
                    high_value_count: highValueUsers.length,
                    never_watched_count: neverWatchedUsers.length,
                    trial_not_converted_count: trialUsers.length
                }
            }
        });

    } catch (err) {
        console.error("Get User Segments Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};