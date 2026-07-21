// routes/adminActivitiesRoutes.js
const router = require("express").Router();
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const controller = require("../controllers/adminActivitiesController");

// ==================== DASHBOARD ROUTES ====================

// Dashboard Overview - Main stats
router.get(
    "/dashboard/overview",
    authenticate,
    isAdmin,
    controller.getDashboardOverview
);

// Recent Activities - Live feed
router.get(
    "/recent",
    authenticate,
    isAdmin,
    controller.getRecentActivities
);

// ==================== USER ACTIVITY ROUTES ====================

// User Activity Details with filters
router.get(
    "/user-activity",
    authenticate,
    isAdmin,
    controller.getUserActivityDetails
);

// Get Single User Detailed Activity
router.get(
    "/user/:userId/details",
    authenticate,
    isAdmin,
    controller.getUserDetails
);

// User Engagement Metrics
router.get(
    "/engagement/metrics",
    authenticate,
    isAdmin,
    controller.getUserEngagementMetrics
);

// User Segments
router.get(
    "/segments",
    authenticate,
    isAdmin,
    controller.getUserSegments
);

// User Drop-off Analysis
router.get(
    "/drop-off-analysis",
    authenticate,
    isAdmin,
    controller.getUserDropOffAnalysis
);

// ==================== CONTENT ROUTES ====================

// Content Performance
router.get(
    "/content/performance",
    authenticate,
    isAdmin,
    controller.getContentPerformance
);

// ==================== REVENUE ROUTES ====================

// Revenue Analytics
router.get(
    "/revenue/analytics",
    authenticate,
    isAdmin,
    controller.getRevenueAnalytics
);

// ==================== STATISTICS ROUTES ====================

// Activity Statistics
router.get(
    "/statistics",
    authenticate,
    isAdmin,
    controller.getActivityStatistics
);

module.exports = router;