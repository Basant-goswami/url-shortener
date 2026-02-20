const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const urlRoutes = require("./routes/url.routes");
const userRoutes = require("./routes/user.routes");
const analyticsRoutes = require("./routes/analytics.routes");

// Initialize Express app
const app = express();

// security middlewares

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: ture,
  }),
);

// logging middleware
app.use(morgan("combined"));

// compression middleware
app.use(compression());

// rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/urls", urlRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);

// health check endpoint
app.get("/api/health", (req,res) => {
    res.status(200).json({
        status : 'OK',
        timestamp : new Date().toISOString(),
        uptime : process.uptime()
    });
});

// 404 handler
app.use('*', (req,res) => {
    res.status(400).json({
        success : false,
        message : "Route not found"
    });
});

//error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success : false,
        message : err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {stack : err.stack})
    });
});

// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log("connected to mongoDB");

    const port = process.env.PORT || 5000;

    app.listen(port => {
        console.log(`Server running on Port ${port}`);
        console.log(`Environment : ${process.env.NODE_ENV}`);
    })
}).catch(err => {
    console.log("MongoDB connection error : " ,err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', ()=> {
    console.log('SIGTERM signal received: closing HTTP server');

    mongoose.connection.close(false).then(()=>{
        console.log("MongoDB connection closed");
        process.exit(0);
    });
});

module.exports = app;   // for testing
