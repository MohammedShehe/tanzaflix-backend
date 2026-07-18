const db = require("../config/db");
const cloudinary = require("../config/cloudinary");


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

                success:false,

                message:"Please fill all required fields."

            });

        }


        if(!req.files || !req.files.video){

            return res.status(400).json({

                success:false,

                message:"Movie video is required."

            });

        }


        const videoFile = req.files.video[0];

        const posterFile = req.files.poster
            ? req.files.poster[0]
            : null;


        const video = videoFile.path;

        const videoPublicId = videoFile.filename;


        const poster = posterFile
            ? posterFile.path
            : null;


        const posterPublicId = posterFile
            ? posterFile.filename
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
                video,
                poster_public_id,
                video_public_id
            )

            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,

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
                posterPublicId,
                videoPublicId

            ]

        );


        const movieId = movieResult.insertId;



        if(more_like_this){

            const movies = Array.isArray(more_like_this)
                ? more_like_this
                : [more_like_this];


            for(const related of movies){

                await connection.query(

                    `INSERT INTO movie_recommendations
                    (movie_id,recommended_movie_id)

                    VALUES(?,?)`,

                    [

                        movieId,

                        related

                    ]

                );

            }

        }



        await connection.commit();


        res.status(201).json({

            success:true,

            message:"Movie uploaded successfully."

        });


    }

    catch(err){

        await connection.rollback();

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

    finally{

        connection.release();

    }

};





exports.getMovies = async(req,res)=>{

try{


const [movies] = await db.query(

`SELECT * FROM movies ORDER BY id DESC`

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



const recommendationMap={};



recommendations.forEach(item=>{


if(!recommendationMap[item.movie_id]){

recommendationMap[item.movie_id]=[];

}



recommendationMap[item.movie_id].push({

id:item.id,

title:item.title,

poster:item.poster

});


});



const formattedMovies = movies.map(movie=>({

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





exports.getMovie = async(req,res)=>{

try{


const [rows]=await db.query(

"SELECT * FROM movies WHERE id=?",

[req.params.id]

);



if(!rows.length){

return res.status(404).json({

success:false,

message:"Movie not found."

});

}



const movie=rows[0];



const [related]=await db.query(

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

[movie.id]

);



movie.more_like_this=related;



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





exports.updateMovie = async(req,res)=>{


const connection = await db.getConnection();


try{


await connection.beginTransaction();


const {id}=req.params;



const [rows]=await connection.query(

"SELECT * FROM movies WHERE id=?",

[id]

);



if(!rows.length){

return res.status(404).json({

success:false,

message:"Movie not found."

});

}



const movie=rows[0];



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

}=req.body;



let poster=movie.poster;

let video=movie.video;

let posterPublicId=movie.poster_public_id;

let videoPublicId=movie.video_public_id;



if(req.files && req.files.poster){


await cloudinary.uploader.destroy(

posterPublicId,

{

resource_type:"image"

}

);



poster=req.files.poster[0].path;

posterPublicId=req.files.poster[0].filename;


}



if(req.files && req.files.video){


await cloudinary.uploader.destroy(

videoPublicId,

{

resource_type:"video"

}

);



video=req.files.video[0].path;

videoPublicId=req.files.video[0].filename;


}



await connection.query(

`
UPDATE movies SET

title=?,

movie_type=?,

country=?,

language=?,

category=?,

year=?,

price=?,

description=?,

poster=?,

video=?,

poster_public_id=?,

video_public_id=?

WHERE id=?

`,

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
posterPublicId,
videoPublicId,
id

]

);




await connection.query(

"DELETE FROM movie_recommendations WHERE movie_id=?",

[id]

);



if(more_like_this){


const relatedMovies = Array.isArray(more_like_this)

? more_like_this

: [more_like_this];



for(const related of relatedMovies){


await connection.query(

`
INSERT INTO movie_recommendations

(movie_id,recommended_movie_id)

VALUES(?,?)

`,

[id,related]

);


}

}



await connection.commit();



res.json({

success:true,

message:"Movie updated successfully."

});


}


catch(err){

await connection.rollback();


res.status(500).json({

success:false,

message:err.message

});


}

finally{

connection.release();

}


};






exports.deleteMovie = async(req,res)=>{


const connection=await db.getConnection();


try{


await connection.beginTransaction();



const {id}=req.params;



const [rows]=await connection.query(

"SELECT * FROM movies WHERE id=?",

[id]

);



if(!rows.length){

return res.status(404).json({

success:false,

message:"Movie not found."

});

}



const movie=rows[0];



if(movie.poster_public_id){

await cloudinary.uploader.destroy(

movie.poster_public_id,

{

resource_type:"image"

}

);

}



if(movie.video_public_id){

await cloudinary.uploader.destroy(

movie.video_public_id,

{

resource_type:"video"

}

);

}



await connection.query(

"DELETE FROM movies WHERE id=?",

[id]

);



await connection.commit();



res.json({

success:true,

message:"Movie deleted successfully."

});


}


catch(err){

await connection.rollback();


res.status(500).json({

success:false,

message:err.message

});


}


finally{

connection.release();

}


};
