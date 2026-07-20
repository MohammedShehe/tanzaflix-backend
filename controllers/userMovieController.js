// controllers/userMovieController.js
const db = require("../config/db");

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
                video,
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
                video,
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