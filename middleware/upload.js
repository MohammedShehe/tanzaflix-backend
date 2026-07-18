const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");


const storage = new CloudinaryStorage({

    cloudinary,

    params: {

        folder: "profiles",

        resource_type: "image",

        allowed_formats: [

            "jpg",
            "jpeg",
            "png",
            "webp"

        ]

    }

});



const fileFilter = (req, file, cb) => {


    const allowed = [

        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp"

    ];



    if (allowed.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("Only images are allowed"));

    }


};



module.exports = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 5 * 1024 * 1024

    }

});
