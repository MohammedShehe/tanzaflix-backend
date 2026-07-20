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
    
    // If has_watched_before is NULL or FALSE, it's first time
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
    // First validate that the movie exists
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
            [userId, movieId, episodeId, accessType, completed, duration]
        );
    } catch (error) {
        // Log the error but don't fail the request
        console.error("Error logging movie access:", error.message);
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

        // VALIDATE: Check if movie exists
        const movieInfo = await getMovieInfo(movieId);
        if (!movieInfo) {
            return res.status(404).json({
                success: false,
                message: "Movie not found"
            });
        }

        // 1. CHECK: Does user have valid subscription?
        const subscription = await hasValidSubscription(userId);
        if (subscription) {
            // User has valid subscription - GRANT ACCESS
            await logMovieAccess(userId, movieId, episodeId, 'subscription');
            
            // Add subscription info to request
            req.accessGranted = true;
            req.accessType = 'subscription';
            req.subscriptionData = subscription;
            req.movieInfo = movieInfo;
            return next();
        }

        // 2. CHECK: Did user purchase this specific movie?
        const purchase = await hasPurchasedMovie(userId, movieId);
        if (purchase) {
            // User purchased this movie - GRANT ACCESS
            await logMovieAccess(userId, movieId, episodeId, 'paid_single');
            
            req.accessGranted = true;
            req.accessType = 'paid_single';
            req.purchaseData = purchase;
            req.movieInfo = movieInfo;
            return next();
        }

        // 3. CHECK: Is this the user's first time watching ANY movie?
        const firstTime = await isFirstTimeWatcher(userId);
        
        if (firstTime) {
            // 4. CHECK: Did user already use their free trial on THIS movie (completed)?
            const usedTrial = await hasUsedFreeTrialForMovie(userId, movieId);
            
            if (!usedTrial) {
                // First time ever + haven't completed trial on this movie - GRANT FREE TRIAL
                // REMOVED: Immediate marking of has_watched_before
                // Now we just log the access attempt without marking as completed
                await logMovieAccess(userId, movieId, episodeId, 'free_trial', false, 0);
                
                req.accessGranted = true;
                req.accessType = 'free_trial';
                req.isFirstTime = true;
                req.movieInfo = movieInfo;
                return next();
            } else {
                // Already completed free trial on this movie - DENY
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

        // 5. NOT first time, no subscription, no purchase - DENY
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
        
        // Check subscription
        const subscription = await hasValidSubscription(userId);
        if (subscription) {
            req.hasSubscription = true;
            req.subscriptionData = subscription;
        }
        
        // Check if first time
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
    logMovieAccess
};