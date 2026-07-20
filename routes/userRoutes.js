const router = require("express").Router();
const upload = require("../middleware/upload");


const {

    authenticate

} = require("../middleware/authMiddleware");


const controller = require("../controllers/userController");



// User registration
router.post(

    "/register",

    upload.single("profile_image"),

    controller.createUser

);



// User profile
router.get(

    "/profile",

    authenticate,

    controller.getProfile

);



// User update own profile
router.put(

    "/profile",

    authenticate,

    upload.single("profile_image"),

    controller.updateProfile

);


module.exports = router;
