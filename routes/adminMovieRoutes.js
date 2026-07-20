// routes/adminMovieRoutes.js
const router = require("express").Router();
const upload = require("../middleware/movieUpload");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const controller = require("../controllers/adminMovieController");

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

// Get single movie
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