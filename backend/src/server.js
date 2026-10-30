require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");

// Import configs
const connectDB = require("./config/database");
const swaggerDocs = require("./config/swagger");
const redisClient = require("./config/redis");

// Import routes
const urlRoutes = require("./routes/url.routes");
const userRoutes = require("./routes/user.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const { protect } = require("./middleware/auth.middleware");
const qrRoutes = require("./routes/qr.routes");

// Import middleware
// const { apiLimiter } = require("./middleware/rateLimiter.middleware");
const { sendError } = require("./utils/apiResponse");

const { getLocationInfo } = require("./utils/geolocation");

const app = express();

/**
 * Detect device type from user agent
 */
function getDeviceType(userAgent) {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile")) return "mobile";
  if (ua.includes("tablet")) return "tablet";
  if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider"))
    return "bot";
  return "desktop";
}

/**
 * Detect browser from user agent
 */
function getBrowser(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("brave"))
    return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opera")) return "Opera";
  if (ua.includes("brave")) return "Brave";
  return "Other";
}

/**
 * Detect OS from user agent
 */
function getOS(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux") && !ua.includes("android")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad"))
    return "iOS";
  return "Other";
}

// ============================================================
//  MIDDLEWARE
// ============================================================

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Compression
app.use(compression());

// Logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Global rate limiting
// app.use("/api/", apiLimiter);

app.use("/api/v1/qr", qrRoutes);

// ============================================================
//  IP ADDRESS HELPER
// ============================================================

const getRealIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "Unknown"
  );
};

// ============================================================
//  HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    redis: redisClient.client ? "Connected" : "Disconnected",
  });
});

// ============================================================
//  API ROUTES
// ============================================================

const apiV1 = "/api/v1";

app.use(`${apiV1}/urls`, urlRoutes);
app.use(`${apiV1}/users`, userRoutes);
app.use(`${apiV1}/analytics`, analyticsRoutes);

// ============================================================
//  DIRECT TEST ROUTE - MY URLS
// ============================================================

app.get("/api/v1/urls/my-urls", protect, async (req, res) => {
  try {
    const Url = require("./models/Url.model");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const total = await Url.countDocuments({ userId: req.user._id });

    const urls = await Url.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const urlsWithShortUrl = urls.map((url) => ({
      ...url.toObject(),
      shortUrl: `${baseUrl}/${url.shortCode}`,
    }));

    res.json({
      statusCode: 200,
      success: true,
      message: "URLs retrieved successfully",
      data: urlsWithShortUrl,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in /my-urls:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
//  ROOT ENDPOINT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    name: "URL Shortener API",
    version: "1.0.0",
    documentation: "/api-docs",
    health: "/health",
    endpoints: {
      shorten: "POST /api/v1/urls/shorten",
      redirect: "GET /:shortCode",
      stats: "GET /api/v1/urls/stats/:shortCode",
      userUrls: "GET /api/v1/urls/my-urls",
      bulkShorten: "POST /api/v1/urls/bulk",
    },
  });
});

// ============================================================
//  SWAGGER DOCUMENTATION
// ============================================================

swaggerDocs(app, process.env.PORT || 5000);

// ============================================================
//  REDIRECT ROUTE - WITH GEOLOCATION
// ============================================================

app.get("/:shortCode", async (req, res) => {
  console.log(`🚨 REDIRECT HIT: ${req.params.shortCode}`);

  try {
    const { shortCode } = req.params;

    const reserved = ["api", "api-docs", "health", "test", "favicon.ico"];
    if (reserved.includes(shortCode)) {
      return res.status(404).json({ success: false, message: "Invalid" });
    }

    const Url = require("./models/Url.model");
    const Analytics = require("./models/Analytics.model");

    const url = await Url.findOne({ shortCode, status: "active" });
    if (!url) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Increment clicks
    url.clicks += 1;
    await url.save();

    // ============ ANALYTICS WITH GEOLOCATION ============
    try {
      const userAgent = req.headers["user-agent"] || "";
      const realIP = getRealIP(req);

      // Device detection
      const ua = userAgent.toLowerCase();
      let device = "unknown";
      let browser = "Unknown";
      let os = "Unknown";

      if (ua.includes("mobile")) device = "mobile";
      else if (ua.includes("tablet")) device = "tablet";
      else if (ua.includes("bot") || ua.includes("crawler")) device = "bot";
      else device = "desktop";

      if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("brave"))
        browser = "Chrome";
      else if (ua.includes("firefox")) browser = "Firefox";
      else if (ua.includes("safari") && !ua.includes("chrome"))
        browser = "Safari";
      else if (ua.includes("edg")) browser = "Edge";
      else if (ua.includes("brave")) browser = "Brave";

      if (ua.includes("windows")) os = "Windows";
      else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
      else if (ua.includes("linux") && !ua.includes("android")) os = "Linux";
      else if (ua.includes("android")) os = "Android";
      else if (
        ua.includes("ios") ||
        ua.includes("iphone") ||
        ua.includes("ipad")
      )
        os = "iOS";

      // ✅ GET LOCATION FROM IP
      let location = {
        country: "Unknown",
        city: "Unknown",
        region: "Unknown",
        countryCode: "Unknown",
      };

      // Only call geolocation API if not localhost
      if (
        realIP !== "::1" &&
        realIP !== "127.0.0.1" &&
        realIP !== "localhost"
      ) {
        try {
          location = await getLocationInfo(realIP);
          // console.log(`📍 Location: ${location.city}, ${location.country}`);
        } catch (locError) {
          console.error("Location error:", locError.message);
        }
      } else {
        console.log(`📍 Localhost request - skipping geolocation`);
      }

      // ✅ SAVE ANALYTICS WITH LOCATION
      const analyticsData = {
        shortCode,
        ipAddress: realIP,
        userAgent: userAgent,
        referer: req.headers.referer || null,
        device,
        browser,
        os,
        country: location.country || "Unknown",
        countryCode: location.countryCode || "Unknown",
        city: location.city || "Unknown",
        region: location.region || "Unknown",
        responseTime: Date.now() - (req.startTime || Date.now()),
      };

      console.log("📊 Analytics with location:", {
        ip: realIP,
        country: location.country,
        city: location.city,
      });

      await Analytics.create(analyticsData);
      // console.log(`✅ Analytics saved with location`);
    } catch (analyticsErr) {
      console.error("❌ Analytics error:", analyticsErr.message);
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.redirect(302, url.longUrl);
  } catch (error) {
    // console.error("Redirect error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================================
//  404 HANDLER
// ============================================================

app.use("*", (req, res) => {
  sendError(res, 404, `Cannot ${req.method} ${req.originalUrl}`);
});

// ============================================================
//  GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("Global error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, errors.join(", "));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendError(res, 409, `${field} already exists`);
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "Token expired");
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  sendError(res, statusCode, message);
});

// ============================================================
//  START SERVER
// ============================================================

const startServer = async () => {
  try {
    await connectDB();
    await redisClient.connect().catch((err) => {
      console.log("⚠️ Redis connection failed, continuing without caching");
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();

module.exports = app;
