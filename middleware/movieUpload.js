const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");


// Video storage

const videoStorage = new CloudinaryStorage({

    cloudinary,

    params: {

        folder: "movies/videos",

        resource_type: "video",

        allowed_formats: [

            "mp4",
            "mkv",
            "mov",
            "webm",
            "avi"

        ]

    }

});



// Poster storage

const posterStorage = new CloudinaryStorage({

    cloudinary,

    params: {

        folder: "movies/posters",

        resource_type: "image",

        allowed_formats: [

            "jpg",
            "jpeg",
            "png",
            "webp"

        ]

    }

});



// Custom multer storage selector

const storage = {

    _handleFile(req, file, cb) {


        let selectedStorage;


        if(file.fieldname === "video"){

            selectedStorage = videoStorage;

        }

        else if(file.fieldname === "poster"){

            selectedStorage = posterStorage;

        }

        else {

            return cb(
                new Error("Invalid upload field")
            );

        }


        selectedStorage._handleFile(req,file,cb);

    },


    _removeFile(req,file,cb){


        let selectedStorage;


        if(file.fieldname === "video"){

            selectedStorage = videoStorage;

        }

        else if(file.fieldname === "poster"){

            selectedStorage = posterStorage;

        }


        if(selectedStorage){

            selectedStorage._removeFile(req,file,cb);

        }

        else{

            cb(null);

        }


    }

};




// File validation

const fileFilter = (req,file,cb)=>{


    if(file.fieldname === "poster"){


        const allowedImages=[

            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp"

        ];


        if(allowedImages.includes(file.mimetype)){

            return cb(null,true);

        }


        return cb(
            new Error("Only image files are allowed for posters")
        );


    }



    if(file.fieldname === "video"){


        const allowedVideos=[

            "video/mp4",
            "video/x-matroska",
            "video/quicktime",
            "video/webm",
            "video/x-msvideo"

        ];


        if(allowedVideos.includes(file.mimetype)){

            return cb(null,true);

        }


        return cb(
            new Error("Unsupported video format")
        );


    }


    cb(
        new Error("Invalid file field")
    );


};





module.exports = multer({

    storage,

    fileFilter,

    limits:{

        fileSize:1024 * 1024 * 1024 * 2

    }

});
