const db = require("../config/db");
const fs = require("fs");
const path = require("path");





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

            more_like_this

        } = req.body;

        if (

            !title ||

            !movie_type ||

            !country ||

            !language ||

            !category ||

            !year ||

            !price ||

            !description

        ) {

            return res.status(400).json({

                success: false,

                message: "Please fill all required fields."

            });

        }

        if (!req.files || !req.files.video) {

            return res.status(400).json({

                success: false,

                message: "Movie video is required."

            });

        }

        const video = req.files.video[0].filename;

        const poster = req.files.poster

            ? req.files.poster[0].filename

            : null;

        const [movieResult] = await connection.query(

            `INSERT INTO movies
            (
                title,
                movie_type,
                country,
                language,
                category,
                year,
                price,
                description,
                poster,
                video
            )
            VALUES (?,?,?,?,?,?,?,?,?,?)`,

            [

                title,

                movie_type,

                country,

                language,

                category,

                year,

                price,

                description,

                poster,

                video

            ]

        );

        const movieId = movieResult.insertId;

        if (more_like_this) {

            const movies = Array.isArray(more_like_this)

                ? more_like_this

                : [more_like_this];

            for (const related of movies) {

                await connection.query(

                    `INSERT INTO movie_recommendations
                    (movie_id,recommended_movie_id)
                    VALUES (?,?)`,

                    [

                        movieId,

                        related

                    ]

                );

            }

        }

        await connection.commit();

        res.status(201).json({

            success: true,

            message: "Movie uploaded successfully."

        });

    }

    catch (err) {

        await connection.rollback();

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

    finally {

        connection.release();

    }

};


exports.getMovies = async (req, res) => {

    try {

        // Get all movies
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
                created_at

            FROM movies

            ORDER BY id DESC`

        );


        // Get all movie relationships
        const [recommendations] = await db.query(

            `SELECT

                mr.movie_id,

                m.id,

                m.title,
                m.poster

            FROM movie_recommendations mr

            JOIN movies m

            ON mr.recommended_movie_id = m.id`

        );


        // Group recommendations by movie_id

        const recommendationMap = {};


        recommendations.forEach(item => {


            if (!recommendationMap[item.movie_id]) {

                recommendationMap[item.movie_id] = [];

            }


            recommendationMap[item.movie_id].push({

                id: item.id,

                title: item.title,

                poster: item.poster

                    ? `${req.protocol}://${req.get("host")}/uploads/posters/${item.poster}`

                    : null

            });


        });



        // Attach recommendations + URLs

        const formattedMovies = movies.map(movie => {


            return {


                ...movie,


                poster: movie.poster

                    ? `${req.protocol}://${req.get("host")}/uploads/posters/${movie.poster}`

                    : null,


                video:

                    `${req.protocol}://${req.get("host")}/uploads/movies/videos/${movie.video}`,


                more_like_this:

                    recommendationMap[movie.id] || []


            };


        });



        res.json({

            success:true,

            total:formattedMovies.length,

            movies:formattedMovies

        });


    }


    catch(err){


        res.status(500).json({

            success:false,

            message:err.message

        });


    }


};


exports.getMovie = async (req, res) => {

    try {

        const [rows] = await db.query(

            "SELECT * FROM movies WHERE id=?",

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

            m.title

            FROM movie_recommendations mr

            JOIN movies m

            ON mr.recommended_movie_id=m.id

            WHERE mr.movie_id=?`,

            [movie.id]

        );

        movie.more_like_this = related;

        movie.poster = movie.poster

            ? `${req.protocol}://${req.get("host")}/uploads/posters/${movie.poster}`

            : null;

        movie.video =

            `${req.protocol}://${req.get("host")}/uploads/movies/videos/${movie.video}`;

        res.json({

            success: true,

            movie

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

exports.updateMovie = async (req, res) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const { id } = req.params;

        const [rows] = await connection.query(

            "SELECT * FROM movies WHERE id=?",

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

            more_like_this

        } = req.body;

        let poster = movie.poster;

        let video = movie.video;

        if (req.files && req.files.poster) {

            const oldPoster = path.join(

                "uploads",

                "posters",

                movie.poster || ""

            );

            if (movie.poster && fs.existsSync(oldPoster)) {

                fs.unlinkSync(oldPoster);

            }

            poster = req.files.poster[0].filename;

        }

        if (req.files && req.files.video) {

            const oldVideo = path.join(

                "uploads",

                "movies",

                "videos",

                movie.video

            );

            if (fs.existsSync(oldVideo)) {

                fs.unlinkSync(oldVideo);

            }

            video = req.files.video[0].filename;

        }

        await connection.query(

            `UPDATE movies SET

            title=?,

            movie_type=?,

            country=?,

            language=?,

            category=?,

            year=?,

            price=?,

            description=?,

            poster=?,

            video=?

            WHERE id=?`,

            [

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

                id

            ]

        );

        await connection.query(

            "DELETE FROM movie_recommendations WHERE movie_id=?",

            [id]

        );

        if (more_like_this) {

            const relatedMovies = Array.isArray(more_like_this)

                ? more_like_this

                : [more_like_this];

            for (const related of relatedMovies) {

                await connection.query(

                    `INSERT INTO movie_recommendations

                    (movie_id,recommended_movie_id)

                    VALUES (?,?)`,

                    [

                        id,

                        related

                    ]

                );

            }

        }

        await connection.commit();

        res.json({

            success: true,

            message: "Movie updated successfully."

        });

    }

    catch (err) {

        await connection.rollback();

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

    finally {

        connection.release();

    }

};









exports.deleteMovie = async (req, res) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const { id } = req.params;

        const [rows] = await connection.query(

            "SELECT * FROM movies WHERE id=?",

            [id]

        );

        if (!rows.length) {

            return res.status(404).json({

                success: false,

                message: "Movie not found."

            });

        }

        const movie = rows[0];

        if (movie.poster) {

            const poster = path.join(

                "uploads",

                "posters",

                movie.poster

            );

            if (fs.existsSync(poster)) {

                fs.unlinkSync(poster);

            }

        }

        if (movie.video) {

            const video = path.join(

                "uploads",

                "movies",

                "videos",

                movie.video

            );

            if (fs.existsSync(video)) {

                fs.unlinkSync(video);

            }

        }

        await connection.query(

            "DELETE FROM movies WHERE id=?",

            [id]

        );

        await connection.commit();

        res.json({

            success: true,

            message: "Movie deleted successfully."

        });

    }

    catch (err) {

        await connection.rollback();

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

    finally {

        connection.release();

    }

};
