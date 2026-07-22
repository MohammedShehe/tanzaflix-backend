const db = require("../config/db");
const { logMovieAccess } = require("../middleware/movieAccessMiddleware");

// Helper function to determine if user watched enough
const hasWatchedEnough = (watchedDuration, totalDuration) => {
    // Minimum 30% of the movie OR at least 5 minutes (300 seconds)
    if (!totalDuration || totalDuration === 0) return false;
    const percentage = (watchedDuration / totalDuration) * 100;
    return percentage >= 30 || watchedDuration >= 300;
};

// Helper function to get movie rating info
const getMovieRatingInfo = async (movieId, userId = null) => {
    try {
        // Get movie rating stats
        const [movieRating] = await db.query(
            `SELECT 
                avg_rating,
                total_ratings
             FROM movies 
             WHERE id = ?`,
            [movieId]
        );

        const ratingInfo = {
            average: parseFloat(movieRating[0]?.avg_rating || 0),
            total: movieRating[0]?.total_ratings || 0,
            display: movieRating[0]?.total_ratings > 0 ? 
                `${parseFloat(movieRating[0]?.avg_rating || 0).toFixed(1)}/10` : 
                "Not rated yet"
        };

        // If userId provided, check if user has rated this movie
        if (userId) {
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

            ratingInfo.user_has_rated = userRating.length > 0;
            ratingInfo.user_rating = userRating.length > 0 ? {
                id: userRating[0].id,
                rating: userRating[0].rating,
                review_text: userRating[0].review_text,
                created_at: userRating[0].created_at
            } : null;
            ratingInfo.can_rate = !(userRating.length > 0);
            ratingInfo.can_edit = false;
            ratingInfo.can_rerate = false;
        }

        return ratingInfo;
    } catch (error) {
        console.error("Error getting rating info:", error);
        return {
            average: 0,
            total: 0,
            display: "Not rated yet",
            user_has_rated: false,
            user_rating: null,
            can_rate: true,
            can_edit: false,
            can_rerate: false
        };
    }
};

exports.getMovies = async (req, res) => {
    try {
        const userId = req.user.id;

        const [movies] = await db.query(
            `SELECT
                id,
                title,
                movie_type,
                country,
                language,
                category,
                is_translated,
                year,
                price,
                description,
                poster,
                movie_time,
                created_at,
                avg_rating,
                total_ratings
             FROM movies
             ORDER BY id DESC`
        );

        // Get recommendations
        const [recommendations] = await db.query(
            `SELECT
                mr.movie_id,
                m.id,
                m.title,
                m.poster
             FROM movie_recommendations mr
             JOIN movies m ON mr.recommended_movie_id = m.id`
        );

        const recommendationMap = {};
        recommendations.forEach(movie => {
            if (!recommendationMap[movie.movie_id]) {
                recommendationMap[movie.movie_id] = [];
            }
            recommendationMap[movie.movie_id].push({
                id: movie.id,
                title: movie.title,
                poster: movie.poster
            });
        });

        // Get seasons data
        const [seasonsData] = await db.query(
            `SELECT 
                s.movie_id,
                s.id as season_id,
                s.season_number,
                s.season_name,
                e.id as episode_id,
                e.episode_number,
                e.episode_title,
                e.video_url,
                e.duration
             FROM seasons s
             LEFT JOIN episodes e ON s.id = e.season_id
             ORDER BY s.season_number, e.episode_number`
        );

        const seasonsMap = {};
        seasonsData.forEach(item => {
            if (!seasonsMap[item.movie_id]) {
                seasonsMap[item.movie_id] = {};
            }
            if (!seasonsMap[item.movie_id][item.season_id]) {
                seasonsMap[item.movie_id][item.season_id] = {
                    id: item.season_id,
                    season_number: item.season_number,
                    season_name: item.season_name,
                    episodes: []
                };
            }
            if (item.episode_id) {
                seasonsMap[item.movie_id][item.season_id].episodes.push({
                    id: item.episode_id,
                    episode_number: item.episode_number,
                    episode_title: item.episode_title,
                    duration: item.duration
                });
            }
        });

        // Get user's access status
        const [subscription] = await db.query(
            `SELECT id, expires_at FROM subscriptions 
             WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
             LIMIT 1`,
            [userId]
        );
        const hasSubscription = subscription.length > 0;

        // Get user's purchased movies
        const [purchases] = await db.query(
            `SELECT movie_id FROM movie_purchases 
             WHERE user_id = ? AND status = 'completed' 
             AND (expires_at IS NULL OR expires_at > NOW())`,
            [userId]
        );
        const purchasedMovieIds = purchases.map(p => p.movie_id);

        // Check if first time
        const [userData] = await db.query(
            `SELECT has_watched_before FROM users WHERE id = ?`,
            [userId]
        );
        const isFirstTime = !userData[0]?.has_watched_before;

        // Get rating for each movie and check if user has rated
        const formattedMovies = [];
        for (const movie of movies) {
            // Get rating info for this movie
            const ratingInfo = await getMovieRatingInfo(movie.id, userId);

            const movieData = {
                ...movie,
                is_translated: Boolean(movie.is_translated),
                more_like_this: recommendationMap[movie.id] || [],
                canWatch: hasSubscription || purchasedMovieIds.includes(movie.id),
                hasSubscription: hasSubscription,
                isPurchased: purchasedMovieIds.includes(movie.id),
                isFirstTime: isFirstTime,
                rating: {
                    average: ratingInfo.average,
                    total: ratingInfo.total,
                    display: ratingInfo.display,
                    user_has_rated: ratingInfo.user_has_rated,
                    user_rating: ratingInfo.user_rating,
                    can_rate: ratingInfo.can_rate,
                    can_edit: ratingInfo.can_edit,
                    can_rerate: ratingInfo.can_rerate
                }
            };

            if (movie.movie_type === 'series' && seasonsMap[movie.id]) {
                movieData.seasons = Object.values(seasonsMap[movie.id]);
            }

            // Remove video_url from listing - only show in single view with access
            delete movieData.video;

            formattedMovies.push(movieData);
        }

        res.json({
            success: true,
            total: formattedMovies.length,
            hasSubscription,
            isFirstTime,
            movies: formattedMovies
        });

    } catch (err) {
        console.error("Get Movies Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.getMovie = async (req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.params.id;

        // Get movie with access info
        const [rows] = await db.query(
            `SELECT
                id,
                title,
                movie_type,
                country,
                language,
                category,
                is_translated,
                year,
                price,
                description,
                poster,
                video,
                movie_time,
                created_at,
                avg_rating,
                total_ratings
             FROM movies
             WHERE id = ?`,
            [movieId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Movie not found."
            });
        }

        const movie = rows[0];
        movie.is_translated = Boolean(movie.is_translated);

        // Get recommendations
        const [related] = await db.query(
            `SELECT
                m.id,
                m.title,
                m.poster
             FROM movie_recommendations mr
             JOIN movies m ON mr.recommended_movie_id = m.id
             WHERE mr.movie_id = ?`,
            [movie.id]
        );
        movie.more_like_this = related;

        // Check user access
        const [subscription] = await db.query(
            `SELECT id, expires_at FROM subscriptions 
             WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
             LIMIT 1`,
            [userId]
        );
        const hasSubscription = subscription.length > 0;

        const [purchase] = await db.query(
            `SELECT id FROM movie_purchases 
             WHERE user_id = ? AND movie_id = ? 
             AND status = 'completed' 
             AND (expires_at IS NULL OR expires_at > NOW())
             LIMIT 1`,
            [userId, movieId]
        );
        const hasPurchased = purchase.length > 0;

        const [userData] = await db.query(
            `SELECT has_watched_before FROM users WHERE id = ?`,
            [userId]
        );
        const isFirstTime = !userData[0]?.has_watched_before;

        // Determine if can watch
        let canWatch = false;
        let accessType = null;
        let accessMessage = null;

        if (hasSubscription) {
            canWatch = true;
            accessType = 'subscription';
            accessMessage = "You have an active subscription";
        } else if (hasPurchased) {
            canWatch = true;
            accessType = 'paid_single';
            accessMessage = "You have purchased this movie";
        } else if (isFirstTime) {
            // Check if already used free trial on this movie (completed)
            const [trialUsed] = await db.query(
                `SELECT id FROM movie_access_logs 
                 WHERE user_id = ? AND movie_id = ? 
                 AND access_type = 'free_trial' AND completed = TRUE
                 LIMIT 1`,
                [userId, movieId]
            );
            
            if (trialUsed.length === 0) {
                canWatch = true;
                accessType = 'free_trial';
                accessMessage = "Free trial - first time watching";
            } else {
                accessType = 'trial_used';
                accessMessage = "You already used your free trial for this movie";
            }
        } else {
            accessType = 'denied';
            accessMessage = "Subscribe or purchase to watch this movie";
        }

        // If can watch, include video URL
        if (canWatch) {
            await logMovieAccess(userId, movieId, null, accessType);
        }

        // If series, get seasons with episodes
        if (movie.movie_type === 'series') {
            const [seasons] = await db.query(
                `SELECT 
                    s.id,
                    s.season_number,
                    s.season_name,
                    e.id as episode_id,
                    e.episode_number,
                    e.episode_title,
                    e.video_url,
                    e.duration
                 FROM seasons s
                 LEFT JOIN episodes e ON s.id = e.season_id
                 WHERE s.movie_id = ?
                 ORDER BY s.season_number, e.episode_number`,
                [movie.id]
            );

            const seasonsMap = {};
            seasons.forEach(item => {
                if (!seasonsMap[item.id]) {
                    seasonsMap[item.id] = {
                        id: item.id,
                        season_number: item.season_number,
                        season_name: item.season_name,
                        episodes: []
                    };
                }
                if (item.episode_id) {
                    const episodeData = {
                        id: item.episode_id,
                        episode_number: item.episode_number,
                        episode_title: item.episode_title,
                        duration: item.duration
                    };
                    
                    if (canWatch) {
                        episodeData.video_url = item.video_url;
                    }
                    
                    seasonsMap[item.id].episodes.push(episodeData);
                }
            });

            movie.seasons = Object.values(seasonsMap);
        }

        // Remove video field from main movie object if can't watch
        if (!canWatch) {
            delete movie.video;
        }

        // Get rating info for this movie
        const ratingInfo = await getMovieRatingInfo(movieId, userId);

        // Prepare response
        const response = {
            success: true,
            movie: {
                ...movie,
                canWatch,
                accessType,
                accessMessage,
                hasSubscription,
                hasPurchased,
                isFirstTime,
                rating: {
                    average: ratingInfo.average,
                    total: ratingInfo.total,
                    display: ratingInfo.display,
                    user_has_rated: ratingInfo.user_has_rated,
                    user_rating: ratingInfo.user_rating,
                    can_rate: ratingInfo.can_rate,
                    can_edit: ratingInfo.can_edit,
                    can_rerate: ratingInfo.can_rerate
                },
                subscriptionPlans: !hasSubscription ? "/api/plans" : null,
                purchaseAction: !hasSubscription && !hasPurchased && !isFirstTime ? 
                    `/api/payments/create-movie-purchase/${movieId}` : null
            }
        };

        res.json(response);

    } catch (err) {
        console.error("Get Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// MARK: Mark episode as completed (for tracking free trial)
exports.markEpisodeComplete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId, episodeId, duration, totalDuration } = req.body;

        if (!movieId || !episodeId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID and Episode ID are required"
            });
        }

        const [accessLog] = await db.query(
            `SELECT id, access_type, completed FROM movie_access_logs 
             WHERE user_id = ? AND movie_id = ? AND episode_id = ? 
             AND access_type = 'free_trial'
             ORDER BY id DESC LIMIT 1`,
            [userId, movieId, episodeId]
        );

        if (accessLog.length > 0 && accessLog[0].access_type === 'free_trial') {
            if (!accessLog[0].completed) {
                const watchedEnough = hasWatchedEnough(duration || 0, totalDuration || 0);
                
                if (watchedEnough) {
                    await db.query(
                        `UPDATE users SET 
                         has_watched_before = TRUE,
                         first_watch_at = COALESCE(first_watch_at, NOW())
                         WHERE id = ? AND has_watched_before = FALSE`,
                        [userId]
                    );
                    
                    await db.query(
                        `UPDATE movie_access_logs 
                         SET completed = TRUE, watched_duration = ?
                         WHERE id = ?`,
                        [duration || 0, accessLog[0].id]
                    );
                    
                    console.log(`User ${userId} completed free trial for episode ${episodeId} of movie ${movieId}`);
                } else {
                    await db.query(
                        `UPDATE movie_access_logs 
                         SET watched_duration = ?
                         WHERE id = ?`,
                        [duration || 0, accessLog[0].id]
                    );
                }
            }
        } else {
            await db.query(
                `INSERT INTO movie_access_logs 
                 (user_id, movie_id, episode_id, access_type, completed, watched_duration) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, movieId, episodeId, 'watched', true, duration || 0]
            );
        }

        res.json({
            success: true,
            message: "Episode progress saved"
        });

    } catch (err) {
        console.error("Mark Episode Complete Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// MARK: Mark single movie as completed
exports.markMovieComplete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId, duration, totalDuration } = req.body;

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required"
            });
        }

        const [accessLog] = await db.query(
            `SELECT id, access_type, completed FROM movie_access_logs 
             WHERE user_id = ? AND movie_id = ? 
             AND episode_id IS NULL
             AND access_type = 'free_trial'
             ORDER BY id DESC LIMIT 1`,
            [userId, movieId]
        );

        if (accessLog.length > 0 && accessLog[0].access_type === 'free_trial') {
            if (!accessLog[0].completed) {
                const watchedEnough = hasWatchedEnough(duration || 0, totalDuration || 0);
                
                if (watchedEnough) {
                    await db.query(
                        `UPDATE users SET 
                         has_watched_before = TRUE,
                         first_watch_at = COALESCE(first_watch_at, NOW())
                         WHERE id = ? AND has_watched_before = FALSE`,
                        [userId]
                    );
                    
                    await db.query(
                        `UPDATE movie_access_logs 
                         SET completed = TRUE, watched_duration = ?
                         WHERE id = ?`,
                        [duration || 0, accessLog[0].id]
                    );
                    
                    console.log(`User ${userId} completed free trial for movie ${movieId}`);
                } else {
                    await db.query(
                        `UPDATE movie_access_logs 
                         SET watched_duration = ?
                         WHERE id = ?`,
                        [duration || 0, accessLog[0].id]
                    );
                }
            }
        } else {
            await db.query(
                `INSERT INTO movie_access_logs 
                 (user_id, movie_id, episode_id, access_type, completed, watched_duration) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, movieId, null, 'watched', true, duration || 0]
            );
        }

        res.json({
            success: true,
            message: "Movie progress saved"
        });

    } catch (err) {
        console.error("Mark Movie Complete Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// MARK: Get user's watch history
exports.getWatchHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const [history] = await db.query(
            `SELECT 
                mal.movie_id,
                mal.episode_id,
                mal.access_type,
                mal.completed,
                mal.watched_duration,
                mal.created_at,
                m.title as movie_title,
                m.poster,
                e.episode_title,
                e.episode_number
             FROM movie_access_logs mal
             LEFT JOIN movies m ON mal.movie_id = m.id
             LEFT JOIN episodes e ON mal.episode_id = e.id
             WHERE mal.user_id = ?
             ORDER BY mal.created_at DESC
             LIMIT 50`,
            [userId]
        );

        res.json({
            success: true,
            history
        });

    } catch (err) {
        console.error("Get Watch History Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};