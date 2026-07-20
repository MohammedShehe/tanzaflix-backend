// routes/userMovieRoutes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const { checkMovieAccess, checkBasicAccess } = require("../middleware/movieAccessMiddleware");
const controller = require("../controllers/userMovieController");

// Get all movies with access info (no video URLs)
router.get("/", authenticate, checkBasicAccess, controller.getMovies);

// Get single movie - applies access control
router.get("/:id", authenticate, checkMovieAccess, controller.getMovie);

// Mark episode as completed (frontend calls this when user finishes watching)
router.post("/mark-episode-complete", authenticate, controller.markEpisodeComplete);

// Mark movie as completed (frontend calls this when user finishes watching)
router.post("/mark-movie-complete", authenticate, controller.markMovieComplete);

// Get user's watch history
router.get("/history", authenticate, controller.getWatchHistory);

module.exports = router;