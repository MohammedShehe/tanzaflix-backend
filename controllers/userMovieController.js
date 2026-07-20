const db = require("../config/db");
const { logMovieAccess } = require("../middleware/movieAccessMiddleware");

exports.getMovies = async (req, res) => {
    try {
        const [movies] = await db.query(
            `SELECT
                id,
                title,
                movie_type,
                country,
                language,
                category,
                year,
                price,
                description,
                poster,
                movie_time,
                created_at
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
                    // video_url hidden - will be shown only on access check
                });
            }
        });

        // Get user's access status
        const userId = req.user.id;
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

        const formattedMovies = movies.map(movie => {
            const movieData = {
                ...movie,
                more_like_this: recommendationMap[movie.id] || [],
                canWatch: hasSubscription || purchasedMovieIds.includes(movie.id),
                hasSubscription: hasSubscription,
                isPurchased: purchasedMovieIds.includes(movie.id),
                isFirstTime: isFirstTime
            };

            if (movie.movie_type === 'series' && seasonsMap[movie.id]) {
                movieData.seasons = Object.values(seasonsMap[movie.id]);
            }

            // Remove video_url from listing - only show in single view with access
            delete movieData.video;

            return movieData;
        });

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
                year,
                price,
                description,
                poster,
                video,
                movie_time,
                created_at
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
            // Check if already used free trial on this movie
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
            // Log the access
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
                    
                    // Only include video URL if can watch
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

// NEW: Mark episode as completed (for tracking free trial)
exports.markEpisodeComplete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId, episodeId, duration } = req.body;

        await db.query(
            `UPDATE movie_access_logs 
             SET completed = TRUE, watched_duration = ?
             WHERE user_id = ? AND movie_id = ? AND episode_id = ? 
             AND access_type = 'free_trial'
             ORDER BY id DESC LIMIT 1`,
            [duration || 0, userId, movieId, episodeId]
        );

        res.json({
            success: true,
            message: "Episode marked as completed"
        });

    } catch (err) {
        console.error("Mark Episode Complete Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// NEW: Mark single movie as completed
exports.markMovieComplete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieId, duration } = req.body;

        await db.query(
            `UPDATE movie_access_logs 
             SET completed = TRUE, watched_duration = ?
             WHERE user_id = ? AND movie_id = ? 
             AND episode_id IS NULL
             AND access_type = 'free_trial'
             ORDER BY id DESC LIMIT 1`,
            [duration || 0, userId, movieId]
        );

        res.json({
            success: true,
            message: "Movie marked as completed"
        });

    } catch (err) {
        console.error("Mark Movie Complete Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};