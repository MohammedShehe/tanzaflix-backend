const router = require("express").Router();
const { authenticate } = require("../middleware/authMiddleware");
const { checkMovieAccess, checkBasicAccess } = require("../middleware/movieAccessMiddleware");
const controller = require("../controllers/userMovieController");

// Get all movies with access info (no video URLs)
router.get("/", authenticate, checkBasicAccess, controller.getMovies);

// Get single movie - applies access control
router.get("/:id", authenticate, checkMovieAccess, controller.getMovie);

// Mark episode as completed
router.post("/mark-episode-complete", authenticate, controller.markEpisodeComplete);

// Mark movie as completed
router.post("/mark-movie-complete", authenticate, controller.markMovieComplete);

module.exports = router;