const db = require("../config/db");



exports.getMovies = async (req, res) => {

    try {


        const [movies] = await db.query(

        `
        SELECT

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
        video_public_id,
        created_at

        FROM movies

        ORDER BY id DESC

        `

        );



        const [recommendations] = await db.query(

        `
        SELECT

        mr.movie_id,

        m.id,

        m.title,

        m.poster

        FROM movie_recommendations mr

        JOIN movies m

        ON mr.recommended_movie_id=m.id

        `

        );



        const recommendationMap = {};



        recommendations.forEach(movie => {


            if(!recommendationMap[movie.movie_id]){

                recommendationMap[movie.movie_id] = [];

            }



            recommendationMap[movie.movie_id].push({

                id: movie.id,

                title: movie.title,

                poster: movie.poster

            });


        });



        const formattedMovies = movies.map(movie => ({


            ...movie,


            more_like_this:

                recommendationMap[movie.id] || []



        }));



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







exports.getMovie = async (req,res)=>{


    try{


        const {id} = req.params;



        const [rows] = await db.query(

        `
        SELECT

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
        video_public_id,
        created_at

        FROM movies

        WHERE id=?

        `,

        [id]

        );



        if(!rows.length){


            return res.status(404).json({

                success:false,

                message:"Movie not found."

            });


        }



        const movie = rows[0];



        const [related] = await db.query(

        `
        SELECT

        m.id,

        m.title,

        m.poster


        FROM movie_recommendations mr


        JOIN movies m


        ON mr.recommended_movie_id=m.id


        WHERE mr.movie_id=?

        `,

        [id]

        );



        movie.more_like_this = related;



        res.json({

            success:true,

            movie

        });



    }


    catch(err){


        res.status(500).json({

            success:false,

            message:err.message

        });


    }


};
