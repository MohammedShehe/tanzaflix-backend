require("dotenv").config();

const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());

app.use(express.json());

app.use("/api/auth",require("./routes/authRoutes"));
app.use("/api/users",require("./routes/adminUserRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/user/movies", require("./routes/userMovieRoutes"));
app.use("/api/plans", require("./routes/planRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));


app.listen(process.env.PORT,()=>{

console.log("Server running");

});
