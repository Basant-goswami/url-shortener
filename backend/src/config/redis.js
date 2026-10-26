// backend/src/config/redis.js
// ✅ ZERO ERRORS - No ioredis import when disabled

let Redis = null;
try {
  // Only import if enabled
  if (process.env.REDIS_ENABLED === "true") {
    Redis = require("ioredis");
  }
} catch (_) {
  // ignore
}

class RedisClient {
  constructor() {
    this.client = null;
    this.isEnabled = false;
  }

  async connect() {
    // If not enabled, return mock immediately
    if (process.env.REDIS_ENABLED !== "true") {
      console.log(
        "⚠️ Redis is disabled (REDIS_ENABLED != true) - using in-memory cache",
      );
      this.client = this.getMockRedis();
      return this.client;
    }

    // Redis is enabled, try to connect
    if (!Redis) {
      console.log("⚠️ ioredis not installed, using mock");
      this.client = this.getMockRedis();
      return this.client;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          // Stop retrying after 2 attempts
          if (times > 2) {
            console.log("⚠️ Redis connection failed, switching to mock");
            this.client = this.getMockRedis();
            return null; // stop retrying
          }
          return Math.min(times * 100, 1000);
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      // ✅ SILENCE ERROR EVENTS - No flood
      this.client.on("error", (err) => {
        if (err.code === "ECONNREFUSED") {
          // Only log once
          if (!this._connectionRefusedLogged) {
            console.log("⚠️ Redis not available, using in-memory cache");
            this._connectionRefusedLogged = true;
          }
          // Switch to mock
          if (this.client) {
            this.client.disconnect();
          }
          this.client = this.getMockRedis();
        } else {
          console.error("❌ Redis error:", err.message);
        }
      });

      this.client.on("connect", () => {
        console.log("✅ Redis connected successfully");
        this.isEnabled = true;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.log("⚠️ Redis connection failed, using in-memory cache");
      this.client = this.getMockRedis();
      return this.client;
    }
  }

  getMockRedis() {
    const store = new Map();
    return {
      async get(key) {
        const item = store.get(key);
        if (item && item.expiry > Date.now()) return item.value;
        store.delete(key);
        return null;
      },
      async setex(key, seconds, value) {
        store.set(key, { value, expiry: Date.now() + seconds * 1000 });
        return "OK";
      },
      async set(key, value) {
        store.set(key, { value, expiry: Infinity });
        return "OK";
      },
      async del(key) {
        store.delete(key);
        return 1;
      },
      async ping() {
        return "PONG";
      },
      on() {},
      disconnect() {},
      quit() {
        return Promise.resolve();
      },
    };
  }

  getClient() {
    if (!this.client) return this.getMockRedis();
    return this.client;
  }
}

module.exports = new RedisClient();
