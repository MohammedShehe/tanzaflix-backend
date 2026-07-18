const router = require("express").Router();

const upload = require("../middleware/movieUpload");

const {

    authenticate,

    isAdmin

} = require("../middleware/authMiddleware");

const controller = require("../controllers/adminMovieController");

router.post(

    "/",

    authenticate,

    isAdmin,

    upload.fields([

        {

            name: "poster",

            maxCount: 1

        },

        {

            name: "video",

            maxCount: 1

        }

    ]),

    controller.createMovie

);

router.get(

    "/",

    authenticate,

    isAdmin,

    controller.getMovies

);

router.get(

    "/:id",

    authenticate,

    isAdmin,

    controller.getMovie

);

router.put(

    "/:id",

    authenticate,

    isAdmin,

    upload.fields([

        {

            name: "poster",

            maxCount: 1

        },

        {

            name: "video",

            maxCount: 1

        }

    ]),

    controller.updateMovie

);

router.delete(

    "/:id",

    authenticate,

    isAdmin,

    controller.deleteMovie

);

module.exports = router;
