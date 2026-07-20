require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ============================
// MIDDLEWARE
// ============================
app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================
// ROUTES
// ============================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/adminUserRoutes"));
app.use("/api/movies", require("./routes/movieRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/user/movies", require("./routes/userMovieRoutes"));
app.use("/api/plans", require("./routes/planRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// ============================
// HEALTH CHECK
// ============================
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================
// ERROR HANDLING
// ============================
app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// ============================
// START SERVER
// ============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});