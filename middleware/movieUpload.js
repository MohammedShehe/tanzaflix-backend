const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create folders if they don't exist
const videoDir = "uploads/movies/videos";
const posterDir = "uploads/posters";

if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
}

if (!fs.existsSync(posterDir)) {
    fs.mkdirSync(posterDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination(req, file, cb) {

        if (file.fieldname === "video") {

            cb(null, videoDir);

        } else if (file.fieldname === "poster") {

            cb(null, posterDir);

        }

    },

    filename(req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

function fileFilter(req, file, cb) {

    if (file.fieldname === "poster") {

        const allowed = [

            "image/jpeg",

            "image/png",

            "image/jpg",

            "image/webp"

        ];

        if (allowed.includes(file.mimetype)) {

            return cb(null, true);

        }

        return cb(new Error("Poster must be an image"));

    }

    if (file.fieldname === "video") {

        const allowed = [

            "video/mp4",

            "video/x-matroska",

            "video/quicktime",

            "video/webm",

            "video/x-msvideo"

        ];

        if (allowed.includes(file.mimetype)) {

            return cb(null, true);

        }

        return cb(new Error("Unsupported video format"));

    }

}

module.exports = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 1024 * 1024 * 1024 * 2 // 2GB

    }

});
