// routes/userMovieRoutes.js - COMPLETE CORRECTED FILE
const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const { checkMovieAccess, checkBasicAccess } = require("../middleware/movieAccessMiddleware");
const controller = require("../controllers/userMovieController");

// ==================== GET ALL MOVIES ====================
// Get all movies with access info (no video URLs)
router.get("/", authenticate, checkBasicAccess, controller.getMovies);

// ==================== CONTINUE WATCHING ROUTES ====================
// IMPORTANT: These MUST come before /:id route to avoid conflicts

// Get continue watching list - NO ACCESS CHECK NEEDED
router.get("/continue-watching", authenticate, controller.getContinueWatching);

// Update watch progress (called periodically while watching)
router.post("/progress", authenticate, controller.updateProgress);

// Manually mark as completed
router.post("/mark-completed", authenticate, controller.markCompleted);

// ===== WATCH HISTORY =====
// Get user's watch history
router.get("/history", authenticate, controller.getWatchHistory);

// ===== MARK COMPLETE ROUTES =====
// Mark episode as completed
router.post("/mark-episode-complete", authenticate, controller.markEpisodeComplete);

// Mark movie as completed
router.post("/mark-movie-complete", authenticate, controller.markMovieComplete);

// ==================== SINGLE MOVIE ====================
// IMPORTANT: This MUST come LAST to avoid catching /continue-watching, /history, etc.
// Get single movie - applies access control
router.get("/:id", authenticate, checkMovieAccess, controller.getMovie);

module.exports = router;