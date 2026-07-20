// controllers/adminMovieController.js
const db = require("../config/db");
const cloudinary = require("../config/cloudinary");

// ==================== CREATE MOVIE (Single or Series) ====================
exports.createMovie = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            title,
            movie_type,
            country,
            language,
            category,
            year,
            price,
            description,
            more_like_this,
            movie_time,
            seasons
        } = req.body;

        // Validate required fields
        if (!title || !movie_type || !country || !language || !category || !year || !price) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        // Validate movie_type
        if (!['single', 'series'].includes(movie_type)) {
            return res.status(400).json({
                success: false,
                message: "Movie type must be 'single' or 'series'."
            });
        }

        // For single movies, movie_time and video are required
        if (movie_type === 'single') {
            if (!movie_time) {
                return res.status(400).json({
                    success: false,
                    message: "Movie time is required for single movies."
                });
            }

            const hasVideo = req.files && req.files.some(f => f.fieldname === 'video');
            if (!hasVideo) {
                return res.status(400).json({
                    success: false,
                    message: "Movie video is required for single movies."
                });
            }
        }

        // For series, seasons data is required
        if (movie_type === 'series') {
            if (!seasons) {
                return res.status(400).json({
                    success: false,
                    message: "Seasons data is required for series."
                });
            }

            try {
                JSON.parse(seasons);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid seasons JSON format."
                });
            }
        }

        // Helper function to get file by fieldname
        const getFileByFieldname = (fieldname) => {
            if (!req.files) return null;
            const file = req.files.find(f => f.fieldname === fieldname);
            return file || null;
        };

        // Handle poster upload
        let poster = null;
        let posterPublicId = null;
        const posterFile = getFileByFieldname('poster');
        if (posterFile) {
            poster = posterFile.path;
            posterPublicId = posterFile.filename;
        }

        // Handle video upload for single movies
        let video = null;
        let videoPublicId = null;
        if (movie_type === 'single') {
            const videoFile = getFileByFieldname('video');
            if (videoFile) {
                video = videoFile.path;
                videoPublicId = videoFile.filename;
            }
        }

        // Insert movie
        const [movieResult] = await connection.query(
            `INSERT INTO movies (
                title,
                movie_type,
                country,
                language,
                category,
                year,
                price,
                description,
                poster,
                poster_public_id,
                video,
                video_public_id,
                movie_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                movie_type,
                country,
                language,
                category,
                year,
                price,
                description || null,
                poster,
                posterPublicId,
                movie_type === 'single' ? video : null,
                movie_type === 'single' ? videoPublicId : null,
                movie_type === 'single' ? movie_time : null
            ]
        );

        const movieId = movieResult.insertId;

        // Handle more_like_this recommendations
        if (more_like_this) {
            const movies = Array.isArray(more_like_this)
                ? more_like_this
                : [more_like_this];

            for (const related of movies) {
                await connection.query(
                    `INSERT INTO movie_recommendations (movie_id, recommended_movie_id)
                     VALUES (?, ?)`,
                    [movieId, related]
                );
            }
        }

        // ==================== HANDLE SERIES WITH SEASONS AND EPISODES ====================
        if (movie_type === 'series' && seasons) {
            const seasonsData = JSON.parse(seasons);
            
            if (!Array.isArray(seasonsData) || seasonsData.length === 0) {
                throw new Error("Seasons must be a non-empty array.");
            }

            // Build a map of uploaded files by fieldname
            const fileMap = {};
            if (req.files) {
                for (const file of req.files) {
                    fileMap[file.fieldname] = file;
                }
            }

            // Process each season
            let episodeCounter = 0;
            for (let seasonIndex = 0; seasonIndex < seasonsData.length; seasonIndex++) {
                const seasonData = seasonsData[seasonIndex];
                const { season_number, season_name, episodes } = seasonData;

                if (!season_number) {
                    throw new Error("Season number is required for each season.");
                }

                if (!episodes || !Array.isArray(episodes) || episodes.length === 0) {
                    throw new Error(`Season ${season_number} must have at least one episode.`);
                }

                // Insert season
                const [seasonResult] = await connection.query(
                    `INSERT INTO seasons (movie_id, season_number, season_name)
                     VALUES (?, ?, ?)`,
                    [movieId, season_number, season_name || `Season ${season_number}`]
                );

                const seasonId = seasonResult.insertId;

                // Process each episode in the season
                for (let episodeIndex = 0; episodeIndex < episodes.length; episodeIndex++) {
                    const episodeData = episodes[episodeIndex];
                    const { episode_number, episode_title, duration } = episodeData;

                    if (!episode_number) {
                        throw new Error(`Episode number is required for season ${season_number}.`);
                    }

                    // Find the uploaded file for this episode
                    let episodeVideoFile = null;

                    // Try multiple naming patterns
                    const patterns = [
                        `episodes_${seasonIndex}_${episodeIndex}`,
                        `episodes_${seasonIndex}_${episode_number}`,
                        `episodes_${season_number}_${episode_number}`,
                        `episodes_${episodeCounter}`,
                        `episodes_${episodeIndex}`,
                        `episode_${episode_number}`,
                        `${episodeCounter}`,
                        `${episodeIndex}`,
                        `${episode_number}`
                    ];

                    for (const pattern of patterns) {
                        if (fileMap[pattern]) {
                            episodeVideoFile = fileMap[pattern];
                            break;
                        }
                    }

                    // If not found, try to find any video file that hasn't been used yet
                    if (!episodeVideoFile && req.files) {
                        for (const key of Object.keys(fileMap)) {
                            const file = fileMap[key];
                            if (key !== 'poster' && key !== 'video' && 
                                file.mimetype && file.mimetype.startsWith('video/')) {
                                episodeVideoFile = file;
                                break;
                            }
                        }
                    }

                    if (!episodeVideoFile) {
                        throw new Error(
                            `Video is required for episode ${episode_number} in season ${season_number}. ` +
                            `Please upload using field names like: episodes_0, episodes_1, etc.`
                        );
                    }

                    // Insert episode
                    await connection.query(
                        `INSERT INTO episodes (
                            season_id,
                            episode_number,
                            episode_title,
                            video_url,
                            video_public_id,
                            duration
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            seasonId,
                            episode_number,
                            episode_title || `Episode ${episode_number}`,
                            episodeVideoFile.path,
                            episodeVideoFile.filename,
                            duration || null
                        ]
                    );

                    // Remove the file from map so it's not used again
                    delete fileMap[episodeVideoFile.fieldname];
                    episodeCounter++;
                }
            }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: movie_type === 'single' 
                ? "Movie uploaded successfully." 
                : "Series created successfully with seasons and episodes.",
            movieId: movieId
        });

    } catch (err) {
        await connection.rollback();
        console.error("Create Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    } finally {
        connection.release();
    }
};

// ==================== GET ALL MOVIES (Admin) ====================
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
                poster_public_id,
                video,
                video_public_id,
                movie_time,
                created_at
             FROM movies
             ORDER BY id DESC`
        );

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
        recommendations.forEach(item => {
            if (!recommendationMap[item.movie_id]) {
                recommendationMap[item.movie_id] = [];
            }
            recommendationMap[item.movie_id].push({
                id: item.id,
                title: item.title,
                poster: item.poster
            });
        });

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
                    video_url: item.video_url,
                    duration: item.duration
                });
            }
        });

        const formattedMovies = movies.map(movie => {
            const movieData = {
                ...movie,
                more_like_this: recommendationMap[movie.id] || []
            };

            if (movie.movie_type === 'series' && seasonsMap[movie.id]) {
                movieData.seasons = Object.values(seasonsMap[movie.id]);
            }

            return movieData;
        });

        res.json({
            success: true,
            total: formattedMovies.length,
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

// ==================== GET SINGLE MOVIE (Admin) ====================
exports.getMovie = async (req, res) => {
    try {
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
                poster_public_id,
                video,
                video_public_id,
                movie_time,
                created_at
             FROM movies
             WHERE id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Movie not found."
            });
        }

        const movie = rows[0];

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
                    seasonsMap[item.id].episodes.push({
                        id: item.episode_id,
                        episode_number: item.episode_number,
                        episode_title: item.episode_title,
                        video_url: item.video_url,
                        duration: item.duration
                    });
                }
            });

            movie.seasons = Object.values(seasonsMap);
        }

        res.json({
            success: true,
            movie
        });

    } catch (err) {
        console.error("Get Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==================== UPDATE MOVIE ====================
exports.updateMovie = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        const [rows] = await connection.query(
            "SELECT * FROM movies WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Movie not found."
            });
        }

        const movie = rows[0];

        const {
            title,
            movie_type,
            country,
            language,
            category,
            year,
            price,
            description,
            more_like_this,
            movie_time
        } = req.body;

        let poster = movie.poster;
        let posterPublicId = movie.poster_public_id;
        let video = movie.video;
        let videoPublicId = movie.video_public_id;

        // Helper function to get file by fieldname from req.files array
        const getFileByFieldname = (fieldname) => {
            if (!req.files) return null;
            const file = req.files.find(f => f.fieldname === fieldname);
            return file || null;
        };

        // Handle poster upload
        const posterFile = getFileByFieldname('poster');
        if (posterFile) {
            if (posterPublicId) {
                await cloudinary.uploader.destroy(posterPublicId, {
                    resource_type: "image"
                });
            }
            poster = posterFile.path;
            posterPublicId = posterFile.filename;
        }

        // Handle video upload for single movies
        if (movie_type === 'single') {
            const videoFile = getFileByFieldname('video');
            if (videoFile) {
                if (videoPublicId) {
                    await cloudinary.uploader.destroy(videoPublicId, {
                        resource_type: "video"
                    });
                }
                video = videoFile.path;
                videoPublicId = videoFile.filename;
            }
        }

        await connection.query(
            `UPDATE movies SET
                title = ?,
                movie_type = ?,
                country = ?,
                language = ?,
                category = ?,
                year = ?,
                price = ?,
                description = ?,
                poster = ?,
                poster_public_id = ?,
                video = ?,
                video_public_id = ?,
                movie_time = ?
             WHERE id = ?`,
            [
                title,
                movie_type,
                country,
                language,
                category,
                year,
                price,
                description || null,
                poster,
                posterPublicId,
                movie_type === 'single' ? video : null,
                movie_type === 'single' ? videoPublicId : null,
                movie_type === 'single' ? movie_time : null,
                id
            ]
        );

        await connection.query(
            "DELETE FROM movie_recommendations WHERE movie_id = ?",
            [id]
        );

        if (more_like_this) {
            const relatedMovies = Array.isArray(more_like_this)
                ? more_like_this
                : [more_like_this];

            for (const related of relatedMovies) {
                await connection.query(
                    `INSERT INTO movie_recommendations (movie_id, recommended_movie_id)
                     VALUES (?, ?)`,
                    [id, related]
                );
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Movie updated successfully."
        });

    } catch (err) {
        await connection.rollback();
        console.error("Update Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    } finally {
        connection.release();
    }
};

// ==================== DELETE MOVIE ====================
exports.deleteMovie = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        const [rows] = await connection.query(
            "SELECT * FROM movies WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Movie not found."
            });
        }

        const movie = rows[0];

        // Delete poster from Cloudinary
        if (movie.poster_public_id) {
            await cloudinary.uploader.destroy(movie.poster_public_id, {
                resource_type: "image"
            });
        }

        // Delete video from Cloudinary (single movie)
        if (movie.movie_type === 'single' && movie.video_public_id) {
            await cloudinary.uploader.destroy(movie.video_public_id, {
                resource_type: "video"
            });
        }

        // Delete all episode videos (series)
        if (movie.movie_type === 'series') {
            const [episodes] = await connection.query(
                "SELECT video_public_id FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE movie_id = ?)",
                [id]
            );

            for (const episode of episodes) {
                if (episode.video_public_id) {
                    await cloudinary.uploader.destroy(episode.video_public_id, {
                        resource_type: "video"
                    });
                }
            }
        }

        // Delete movie (cascades to seasons, episodes, and recommendations)
        await connection.query("DELETE FROM movies WHERE id = ?", [id]);

        await connection.commit();

        res.json({
            success: true,
            message: "Movie deleted successfully."
        });

    } catch (err) {
        await connection.rollback();
        console.error("Delete Movie Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    } finally {
        connection.release();
    }
};