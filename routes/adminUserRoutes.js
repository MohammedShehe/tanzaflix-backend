const router = require("express").Router();

const upload = require("../middleware/upload");

const {

    authenticate,

    isAdmin

} = require("../middleware/authMiddleware");

const controller = require("../controllers/adminUserController");

router.post(

    "/create",

    authenticate,

    isAdmin,

    upload.single("profile_image"),

    controller.createUser

);

router.get(

    "/",

    authenticate,

    isAdmin,

    controller.getUsers

);

router.put(

    "/:id",

    authenticate,

    isAdmin,

    upload.single("profile_image"),

    controller.updateUser

);

router.delete(

    "/:id",

    authenticate,

    isAdmin,

    controller.deleteUser

);

module.exports = router;
