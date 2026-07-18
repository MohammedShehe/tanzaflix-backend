require("dotenv").config();

const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());

app.use(express.json());

app.use("/api/auth",require("./routes/authRoutes"));
app.use("/uploads",express.static("uploads"));
app.use("/api/users",require("./routes/userRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));


app.listen(process.env.PORT,()=>{

console.log("Server running");

});
