// middleware/movieAccessMiddleware.js
const db = require("../config/db");

/**
 * Check if user has valid subscription
 */
const hasValidSubscription = async (userId) => {
    const [rows] = await db.query(
        `SELECT id, expires_at FROM subscriptions 
         WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [userId]
    );
    return rows.length > 0 ? rows[0] : null;
};

/**
 * Check if user has purchased this specific movie
 */
const hasPurchasedMovie = async (userId, movieId) => {
    const [rows] = await db.query(
        `SELECT id, status, expires_at FROM movie_purchases 
         WHERE user_id = ? AND movie_id = ? 
         AND status = 'completed' 
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [userId, movieId]
    );
    return rows.length > 0 ? rows[0] : null;
};

/**
 * Check if this is user's first time watching any movie
 */
const isFirstTimeWatcher = async (userId) => {
    const [rows] = await db.query(
        `SELECT has_watched_before, first_watch_at FROM users WHERE id = ?`,
        [userId]
    );
    
    if (rows.length === 0) return false;
    return !rows[0].has_watched_before;
};

/**
 * Check if user already used their free trial on this movie (completed watching)
 */
const hasUsedFreeTrialForMovie = async (userId, movieId) => {
    const [rows] = await db.query(
        `SELECT id, completed FROM movie_access_logs 
         WHERE user_id = ? AND movie_id = ? 
         AND access_type = 'free_trial' AND completed = TRUE
         LIMIT 1`,
        [userId, movieId]
    );
    return rows.length > 0;
};

/**
 * Check if user has pending free trial (started but not completed)
 */
const hasPendingFreeTrial = async (userId, movieId) => {
    const [rows] = await db.query(
        `SELECT id FROM movie_access_logs 
         WHERE user_id = ? AND movie_id = ? 
         AND access_type = 'free_trial' AND completed = FALSE
         ORDER BY id DESC LIMIT 1`,
        [userId, movieId]
    );
    return rows.length > 0;
};

/**
 * Get movie price and validate existence
 */
const getMovieInfo = async (movieId) => {
    const [rows] = await db.query(
        `SELECT id, title, price FROM movies WHERE id = ?`,
        [movieId]
    );
    return rows.length > 0 ? rows[0] : null;
};

/**
 * Log movie access attempt
 */
const logMovieAccess = async (userId, movieId, episodeId, accessType, completed = false, duration = 0) => {
    const movieInfo = await getMovieInfo(movieId);
    if (!movieInfo) {
        console.log(`Movie ${movieId} not found, skipping log`);
        return;
    }

    try {
        await db.query(
            `INSERT INTO movie_access_logs 
             (user_id, movie_id, episode_id, access_type, completed, watched_duration) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, movieId, episodeId, accessType, completed ? 1 : 0, duration]
        );
    } catch (error) {
        console.error("Error logging movie access:", error.message);
    }
};

/**
 * ==================== CONTINUE WATCHING FUNCTIONS ====================
 */

/**
 * Update watch progress for a user
 */
const updateWatchProgress = async (userId, movieId, episodeId, watchedDuration, totalDuration = null) => {
    try {
        if (!userId || !movieId) {
            console.warn('Missing required fields for watch progress');
            return { success: false, error: 'Missing required fields' };
        }

        const duration = Math.max(0, parseInt(watchedDuration) || 0);
        const total = totalDuration ? parseInt(totalDuration) : null;
        
        let percentage = null;
        if (total && total > 0) {
            percentage = Math.min(100, (duration / total) * 100);
        }

        const [existing] = await db.query(
            `SELECT id, watched_duration, completed FROM watch_progress 
             WHERE user_id = ? AND movie_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
             LIMIT 1`,
            [userId, movieId, episodeId || null, episodeId || null]
        );

        const isCompleted = percentage !== null && percentage >= 90;

        if (existing.length > 0) {
            await db.query(
                `UPDATE watch_progress 
                 SET watched_duration = ?,
                     total_duration = COALESCE(?, total_duration),
                     percentage = ?,
                     completed = ?,
                     last_updated = NOW()
                 WHERE id = ?`,
                [
                    duration,
                    total,
                    percentage,
                    isCompleted ? 1 : 0,
                    existing[0].id
                ]
            );
        } else {
            await db.query(
                `INSERT INTO watch_progress 
                 (user_id, movie_id, episode_id, watched_duration, total_duration, percentage, completed)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    movieId,
                    episodeId || null,
                    duration,
                    total,
                    percentage,
                    isCompleted ? 1 : 0
                ]
            );
        }

        return { success: true, percentage, isCompleted };
    } catch (error) {
        console.error('Error updating watch progress:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get continue watching items for a user - FIXED
 */
const getContinueWatching = async (userId, limit = 10) => {
    try {
        // First check if there's any progress for this user
        const [checkProgress] = await db.query(
            `SELECT COUNT(*) as count FROM watch_progress 
             WHERE user_id = ? AND completed = 0 AND percentage < 90 
             AND (percentage > 0 OR watched_duration > 10)`,
            [userId]
        );

        if (checkProgress[0].count === 0) {
            return {
                success: true,
                total: 0,
                hasSubscription: false,
                isFirstTime: false,
                items: []
            };
        }

        // Get watch progress with proper joins
        const [results] = await db.query(
            `SELECT 
                wp.id as progress_id,
                wp.movie_id,
                wp.episode_id,
                wp.watched_duration,
                wp.total_duration,
                wp.percentage,
                wp.last_updated,
                wp.completed,
                m.id as movie_id,
                m.title as movie_title,
                m.poster,
                m.movie_type,
                m.movie_time,
                e.id as episode_id,
                e.episode_number,
                e.episode_title,
                e.duration as episode_duration,
                s.season_number,
                s.season_name
             FROM watch_progress wp
             INNER JOIN movies m ON wp.movie_id = m.id
             LEFT JOIN episodes e ON wp.episode_id = e.id
             LEFT JOIN seasons s ON e.season_id = s.id
             WHERE wp.user_id = ?
                AND wp.completed = 0
                AND wp.percentage < 90
                AND (wp.percentage > 0 OR wp.watched_duration > 10)
             ORDER BY wp.last_updated DESC
             LIMIT ?`,
            [userId, parseInt(limit)]
        );

        // If no results, return empty
        if (!results || results.length === 0) {
            return {
                success: true,
                total: 0,
                hasSubscription: false,
                isFirstTime: false,
                items: []
            };
        }

        // Get subscription status
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

        // Get first time watcher status
        const [userData] = await db.query(
            `SELECT has_watched_before FROM users WHERE id = ?`,
            [userId]
        );
        const isFirstTime = !userData[0]?.has_watched_before;

        const formatted = results.map(item => {
            // Determine if user can watch this content
            let canWatch = hasSubscription || purchasedMovieIds.includes(item.movie_id);
            let accessType = null;
            
            if (hasSubscription) {
                accessType = 'subscription';
            } else if (purchasedMovieIds.includes(item.movie_id)) {
                accessType = 'paid_single';
            } else if (isFirstTime) {
                accessType = 'free_trial_possible';
                canWatch = true;
            } else {
                accessType = 'denied';
                canWatch = false;
            }

            return {
                progress_id: item.progress_id,
                movie_id: item.movie_id,
                episode_id: item.episode_id,
                watched_duration: item.watched_duration || 0,
                total_duration: item.total_duration || item.episode_duration || 0,
                percentage: parseFloat(item.percentage || 0),
                last_updated: item.last_updated,
                completed: item.completed || 0,
                movie_title: item.movie_title || 'Unknown Movie',
                poster: item.poster || null,
                movie_type: item.movie_type || 'single',
                movie_time: item.movie_time || null,
                episode_number: item.episode_number || null,
                episode_title: item.episode_title || null,
                episode_duration: item.episode_duration || null,
                season_number: item.season_number || null,
                season_name: item.season_name || null,
                canWatch: canWatch,
                accessType: accessType,
                resume_at: item.watched_duration || 0,
                display_title: item.episode_title 
                    ? `${item.movie_title} - S${item.season_number || ''}E${item.episode_number || ''}: ${item.episode_title}`
                    : item.movie_title || 'Unknown Movie'
            };
        });

        return {
            success: true,
            total: formatted.length,
            hasSubscription: hasSubscription,
            isFirstTime: isFirstTime,
            items: formatted
        };

    } catch (error) {
        console.error('Error getting continue watching:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark as completed
 */
const markAsCompleted = async (userId, movieId, episodeId = null) => {
    try {
        await db.query(
            `UPDATE watch_progress 
             SET completed = 1, percentage = 100
             WHERE user_id = ? AND movie_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
             LIMIT 1`,
            [userId, movieId, episodeId || null, episodeId || null]
        );

        await db.query(
            `UPDATE movie_access_logs 
             SET completed = 1
             WHERE user_id = ? AND movie_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, movieId, episodeId || null, episodeId || null]
        );

        return { success: true };
    } catch (error) {
        console.error('Error marking as completed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * MAIN ACCESS CONTROL MIDDLEWARE
 */
const checkMovieAccess = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const movieId = req.params.id || req.body.movieId;
        const episodeId = req.params.episodeId || req.body.episodeId;

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required"
            });
        }

        const movieInfo = await getMovieInfo(movieId);
        if (!movieInfo) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        // 1. Check subscription
        const subscription = await hasValidSubscription(userId);
        if (subscription) {
            await logMovieAccess(userId, movieId, episodeId, 'subscription');
            req.accessGranted = true;
            req.accessType = 'subscription';
            req.subscriptionData = subscription;
            req.movieInfo = movieInfo;
            return next();
        }

        // 2. Check purchase
        const purchase = await hasPurchasedMovie(userId, movieId);
        if (purchase) {
            await logMovieAccess(userId, movieId, episodeId, 'paid_single');
            req.accessGranted = true;
            req.accessType = 'paid_single';
            req.purchaseData = purchase;
            req.movieInfo = movieInfo;
            return next();
        }

        // 3. Check first time watcher
        const firstTime = await isFirstTimeWatcher(userId);
        
        if (firstTime) {
            const usedTrial = await hasUsedFreeTrialForMovie(userId, movieId);
            
            if (!usedTrial) {
                await logMovieAccess(userId, movieId, episodeId, 'free_trial', false, 0);
                req.accessGranted = true;
                req.accessType = 'free_trial';
                req.isFirstTime = true;
                req.movieInfo = movieInfo;
                return next();
            } else {
                await logMovieAccess(userId, movieId, episodeId, 'denied');
                return res.status(403).json({
                    success: false,
                    code: 'FREE_TRIAL_USED',
                    message: "You've already used your free trial for this movie",
                    data: {
                        requiresSubscription: true,
                        requiresPurchase: true,
                        moviePrice: movieInfo.price,
                        movieTitle: movieInfo.title,
                        purchaseUrl: `/api/movie-purchases/create/${movieId}`
                    }
                });
            }
        }

        // 5. Deny access
        await logMovieAccess(userId, movieId, episodeId, 'denied');

        return res.status(403).json({
            success: false,
            code: 'ACCESS_DENIED',
            message: "You need to subscribe or purchase this movie to watch",
            data: {
                requiresSubscription: true,
                requiresPurchase: true,
                moviePrice: movieInfo.price,
                movieTitle: movieInfo.title,
                subscriptionPlansUrl: "/api/plans",
                purchaseUrl: `/api/movie-purchases/create/${movieId}`
            }
        });

    } catch (error) {
        console.error("Movie Access Check Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking movie access",
            error: error.message
        });
    }
};

/**
 * Middleware to check if user has ANY access (for listing)
 */
const checkBasicAccess = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const subscription = await hasValidSubscription(userId);
        if (subscription) {
            req.hasSubscription = true;
            req.subscriptionData = subscription;
        }
        
        const firstTime = await isFirstTimeWatcher(userId);
        req.isFirstTime = firstTime;
        
        next();
    } catch (error) {
        console.error("Basic Access Check Error:", error);
        next();
    }
};

module.exports = {
    checkMovieAccess,
    checkBasicAccess,
    hasValidSubscription,
    hasPurchasedMovie,
    isFirstTimeWatcher,
    hasUsedFreeTrialForMovie,
    hasPendingFreeTrial,
    getMovieInfo,
    logMovieAccess,
    updateWatchProgress,
    getContinueWatching,
    markAsCompleted
};