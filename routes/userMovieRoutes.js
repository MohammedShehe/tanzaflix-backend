const router=require("express").Router();


const {

    authenticate

}=require("../middleware/authMiddleware");


const controller=require("../controllers/userMovieController");



router.get(

"/",

authenticate,

controller.getMovies

);



router.get(

"/:id",

authenticate,

controller.getMovie

);



module.exports=router;
