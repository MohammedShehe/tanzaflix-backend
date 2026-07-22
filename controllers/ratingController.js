// controllers/ratingController.js
const db = require("../config/db");

// ==================== RATE A MOVIE ====================
exports.rateMovie = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId } = req.params;
        const { rating, review_text } = req.body;

        // Validate rating
        if (!rating || rating < 0 || rating > 10) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 10"
            });
        }

        // Check if movie exists
        const [movie] = await db.query(
            "SELECT id, title, avg_rating, total_ratings FROM movies WHERE id = ?",
            [movieId]
        );

        if (movie.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        // Check if user has access to this movie (watched/completed before)
        const [accessCheck] = await db.query(
            `SELECT id FROM movie_access_logs 
             WHERE user_id = ? AND movie_id = ? 
             AND access_type != 'denied' 
             AND completed = 1
             LIMIT 1`,
            [userId, movieId]
        );

        if (accessCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You can only rate movies you have watched completely"
            });
        }

        // CRITICAL: Check if user already rated this movie (prevent re-rating)
        const [existingRating] = await db.query(
            "SELECT id, rating, created_at FROM movie_ratings WHERE user_id = ? AND movie_id = ?",
            [userId, movieId]
        );

        if (existingRating.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You have already rated this movie. You cannot rate it again.",
                existing_rating: {
                    rating: existingRating[0].rating,
                    rated_at: existingRating[0].created_at
                },
                can_edit: false
            });
        }

        // Insert new rating (no update allowed)
        await db.query(
            `INSERT INTO movie_ratings (user_id, movie_id, rating, review_text) 
             VALUES (?, ?, ?, ?)`,
            [userId, movieId, rating, review_text || null]
        );

        // Get updated movie stats
        const [updatedMovie] = await db.query(
            `SELECT 
                id,
                title,
                avg_rating,
                total_ratings
             FROM movies 
             WHERE id = ?`,
            [movieId]
        );

        // Get the user's rating
        const [userRating] = await db.query(
            `SELECT 
                id,
                rating,
                review_text,
                created_at
             FROM movie_ratings 
             WHERE user_id = ? AND movie_id = ?`,
            [userId, movieId]
        );

        res.status(201).json({
            success: true,
            message: "Rating submitted successfully",
            can_edit: false,
            can_rerate: false,
            data: {
                movie: {
                    id: updatedMovie[0].id,
                    title: updatedMovie[0].title,
                    avg_rating: parseFloat(updatedMovie[0].avg_rating || 0),
                    total_ratings: updatedMovie[0].total_ratings || 0
                },
                user_rating: {
                    rating: userRating[0].rating,
                    review_text: userRating[0].review_text,
                    created_at: userRating[0].created_at
                }
            }
        });

    } catch (err) {
        console.error("Rate Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET MOVIE RATING DETAILS ====================
exports.getMovieRatingDetails = async (req, res) => {
    try {
        const { movieId } = req.params;
        const userId = req.user ? req.user.id : null;

        // Get movie basic info
        const [movie] = await db.query(
            `SELECT 
                id,
                title,
                avg_rating,
                total_ratings
             FROM movies 
             WHERE id = ?`,
            [movieId]
        );

        if (movie.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        // Get rating distribution
        const [distribution] = await db.query(
            `SELECT 
                rating,
                COUNT(*) as count
             FROM movie_ratings 
             WHERE movie_id = ?
             GROUP BY rating
             ORDER BY rating DESC`,
            [movieId]
        );

        // Get recent ratings (last 10)
        const [recentRatings] = await db.query(
            `SELECT 
                mr.id,
                mr.rating,
                mr.review_text,
                mr.created_at,
                u.id as user_id,
                u.full_name,
                u.profile_image
             FROM movie_ratings mr
             JOIN users u ON mr.user_id = u.id
             WHERE mr.movie_id = ?
             ORDER BY mr.created_at DESC
             LIMIT 10`,
            [movieId]
        );

        // Check if current user has rated this movie
        let userRating = null;
        let hasRated = false;
        if (userId) {
            const [rating] = await db.query(
                `SELECT 
                    id,
                    rating,
                    review_text,
                    created_at
                 FROM movie_ratings 
                 WHERE user_id = ? AND movie_id = ?`,
                [userId, movieId]
            );
            if (rating.length > 0) {
                userRating = rating[0];
                hasRated = true;
            }
        }

        // Calculate rating distribution percentages
        const totalRatings = movie[0].total_ratings || 0;
        const distributionWithPercent = distribution.map(item => ({
            rating: item.rating,
            count: item.count,
            percentage: totalRatings > 0 ? Math.round((item.count / totalRatings) * 100) : 0
        }));

        res.json({
            success: true,
            data: {
                movie: {
                    id: movie[0].id,
                    title: movie[0].title,
                    avg_rating: parseFloat(movie[0].avg_rating || 0),
                    total_ratings: totalRatings,
                    rating_display: totalRatings > 0 ? 
                        `${parseFloat(movie[0].avg_rating || 0).toFixed(1)}/10` : 
                        "No ratings yet"
                },
                user_has_rated: hasRated,
                user_rating: userRating,
                can_edit: false, // Users cannot edit ratings
                can_rerate: false, // Users cannot re-rate
                distribution: distributionWithPercent,
                recent_ratings: recentRatings
            }
        });

    } catch (err) {
        console.error("Get Movie Rating Details Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET USER'S RATING FOR A MOVIE ====================
exports.getUserRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId } = req.params;

        const [rating] = await db.query(
            `SELECT 
                id,
                rating,
                review_text,
                created_at
             FROM movie_ratings 
             WHERE user_id = ? AND movie_id = ?`,
            [userId, movieId]
        );

        if (rating.length === 0) {
            return res.json({
                success: true,
                has_rated: false,
                rating: null,
                can_edit: false,
                can_rerate: false
            });
        }

        res.json({
            success: true,
            has_rated: true,
            can_edit: false,
            can_rerate: false,
            rating: {
                id: rating[0].id,
                rating: rating[0].rating,
                review_text: rating[0].review_text,
                created_at: rating[0].created_at
            }
        });

    } catch (err) {
        console.error("Get User Rating Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET TOP RATED MOVIES ====================
exports.getTopRatedMovies = async (req, res) => {
    try {
        const { limit = 10, min_ratings = 5 } = req.query;

        const [movies] = await db.query(
            `SELECT 
                id,
                title,
                movie_type,
                country,
                language,
                category,
                year,
                poster,
                avg_rating,
                total_ratings,
                CONCAT(ROUND(avg_rating, 1), '/10') as rating_display
             FROM movies 
             WHERE total_ratings >= ? AND avg_rating > 0
             ORDER BY avg_rating DESC, total_ratings DESC
             LIMIT ?`,
            [parseInt(min_ratings), parseInt(limit)]
        );

        res.json({
            success: true,
            total: movies.length,
            movies: movies
        });

    } catch (err) {
        console.error("Get Top Rated Movies Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== GET RATING STATISTICS (ADMIN) ====================
exports.getRatingStatistics = async (req, res) => {
    try {
        // Total ratings
        const [totalRatings] = await db.query(
            "SELECT COUNT(*) as total FROM movie_ratings"
        );

        // Average rating across all movies
        const [avgRating] = await db.query(
            "SELECT AVG(rating) as avg FROM movie_ratings"
        );

        // Ratings by movie
        const [ratingsByMovie] = await db.query(
            `SELECT 
                m.id,
                m.title,
                m.avg_rating,
                m.total_ratings,
                COUNT(mr.id) as rating_count
             FROM movies m
             LEFT JOIN movie_ratings mr ON m.id = mr.movie_id
             GROUP BY m.id
             HAVING rating_count > 0
             ORDER BY rating_count DESC
             LIMIT 20`
        );

        // Rating distribution (0-10)
        const [distribution] = await db.query(
            `SELECT 
                rating,
                COUNT(*) as count
             FROM movie_ratings 
             GROUP BY rating
             ORDER BY rating DESC`
        );

        // Most active raters
        const [topRaters] = await db.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                COUNT(mr.id) as ratings_count,
                AVG(mr.rating) as avg_rating
             FROM users u
             JOIN movie_ratings mr ON u.id = mr.user_id
             GROUP BY u.id
             ORDER BY ratings_count DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            statistics: {
                total_ratings: totalRatings[0]?.total || 0,
                overall_average: parseFloat(avgRating[0]?.avg || 0),
                movies_with_ratings: ratingsByMovie.length,
                ratings_by_movie: ratingsByMovie,
                rating_distribution: distribution,
                top_raters: topRaters
            }
        });

    } catch (err) {
        console.error("Get Rating Statistics Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};