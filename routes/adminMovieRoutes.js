// routes/adminMovieRoutes.js
const router = require("express").Router();
const upload = require("../middleware/movieUpload");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const controller = require("../controllers/adminMovieController");

// ==================== STATS ROUTE ====================
// Get movie statistics (dashboard stats)
// IMPORTANT: This MUST come before the /:id route to avoid conflicts
router.get("/stats", authenticate, isAdmin, controller.getMovieStats);

// ==================== MOVIE ROUTES ====================

// Create movie (handles both single and series)
router.post(
    "/",
    authenticate,
    isAdmin,
    upload,
    controller.createMovie
);

// Get all movies
router.get("/", authenticate, isAdmin, controller.getMovies);

// Get single movie - This must come AFTER /stats
router.get("/:id", authenticate, isAdmin, controller.getMovie);

// Update movie
router.put(
    "/:id",
    authenticate,
    isAdmin,
    upload,
    controller.updateMovie
);

// Delete movie
router.delete("/:id", authenticate, isAdmin, controller.deleteMovie);

module.exports = router;