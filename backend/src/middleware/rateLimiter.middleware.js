const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit"); // ✅ Use built-in IPv6-safe key generator

// Conditionally import Redis store only if enabled
let RedisStore = null;
let Redis = null;
let useRedis = false;

if (process.env.REDIS_ENABLED === "true") {
  try {
    Redis = require("ioredis");
    RedisStore = require("rate-limit-redis").RedisStore;
    useRedis = true;
  } catch (error) {
    console.warn(
      "⚠️ Redis modules not available, falling back to memory store",
    );
    useRedis = false;
  }
}

// Memory store for when Redis is not available
const memoryStore = new Map();

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt && entry.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

// ============ Helper to get rate limit options ============
const getRateLimitOptions = (windowMs, max, message) => {
  const options = {
    windowMs,
    max,
    message: message || "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    // ✅ CORRECT keyGenerator using ipKeyGenerator for IPv6 safety
    keyGenerator: (req) => {
      // If user is authenticated, use user ID (prevents IP-based limits for same user)
      if (req.user && req.user._id) {
        return `user:${req.user._id}`;
      }
      // Otherwise use the IPv6-safe IP key generator
      return ipKeyGenerator(req);
    },
    validate: {
      xForwardedForHeader: false,
      default: false,
    },
  };

  // Use Redis store only if enabled and available
  if (useRedis && Redis && RedisStore) {
    try {
      const redisClient = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });

      options.store = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
      });
    } catch (error) {
      console.warn("⚠️ Redis store creation failed, using memory store");
      useRedis = false;
    }
  }

  // If Redis not available, use memory store
  if (!useRedis) {
    options.store = {
      async increment(key) {
        const now = Date.now();
        const entry = memoryStore.get(key) || {
          count: 0,
          expiresAt: now + windowMs,
        };
        entry.count += 1;
        memoryStore.set(key, entry);
        return { totalHits: entry.count, resetTime: new Date(entry.expiresAt) };
      },
      async decrement(key) {
        const entry = memoryStore.get(key);
        if (entry) {
          entry.count = Math.max(0, entry.count - 1);
          memoryStore.set(key, entry);
        }
      },
      async resetKey(key) {
        memoryStore.delete(key);
      },
    };
  }

  return options;
};

// ============ EXPORT LIMITERS ============

exports.authLimiter = rateLimit(
  getRateLimitOptions(
    15 * 60 * 1000,
    5,
    "Too many login attempts, please try again after 15 minutes",
  ),
);

exports.urlCreationLimiter = rateLimit(
  getRateLimitOptions(
    60 * 60 * 1000,
    50,
    "Too many URLs created, please try again after an hour",
  ),
);

exports.getRequestsLimiter = rateLimit(
  getRateLimitOptions(60 * 1000, 100, "Too many requests, please slow down"),
);

exports.apiLimiter = rateLimit(
  getRateLimitOptions(
    1000,
    10,
    "Rate limit exceeded. Please wait before making more requests.",
  ),
);

exports.createTieredLimiter = (tier) => {
  const limits = {
    free: { windowMs: 60 * 60 * 1000, max: 20 },
    premium: { windowMs: 60 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 60 * 60 * 1000, max: 5000 },
  };
  const tierLimit = limits[tier] || limits.free;
  return rateLimit(
    getRateLimitOptions(
      tierLimit.windowMs,
      tierLimit.max,
      `You've exceeded your ${tier} tier rate limit`,
    ),
  );
};
