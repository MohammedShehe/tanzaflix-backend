// routes/ratingRoutes.js
const router = require("express").Router();
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const controller = require("../controllers/ratingController");

// ==================== USER RATING ROUTES ====================

// Rate a movie (POST) - User can only rate once, no editing allowed
router.post("/movie/:movieId/rate", authenticate, controller.rateMovie);

// Get rating details for a movie (including user's rating if authenticated)
router.get("/movie/:movieId/ratings", authenticate, controller.getMovieRatingDetails);

// Get user's rating for a specific movie
router.get("/movie/:movieId/my-rating", authenticate, controller.getUserRating);

// Get top rated movies (public)
router.get("/top-rated", authenticate, controller.getTopRatedMovies);

// ==================== ADMIN ROUTES ====================
// Get rating statistics (admin only)
router.get("/admin/stats", authenticate, isAdmin, controller.getRatingStatistics);

module.exports = router;