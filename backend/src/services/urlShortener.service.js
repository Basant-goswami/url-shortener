const { Url, Counter } = require("../models");
const { generateRandomCode, encodeBase62 } = require("../utils/base62");
const { validateUrl, validateCustomAlias } = require("../utils/validators");
const redis = require("../config/redis");
const { AppError } = require("../utils/errorHandler");
const crypto = require("crypto");

class UrlShortenerService {
  /**
   * Method 1: Sequential ID + Base62 Encoding
   */
  async shortenWithSequentialId(longUrl, userId = null, customAlias = null) {
    try {
      // ✅ Use imported validateUrl
      if (!validateUrl(longUrl)) {
        throw new AppError("Invalid URL format", 400);
      }

      if (customAlias) {
        return await this.createWithCustomAlias(longUrl, customAlias, userId);
      }

      const counter = await this.getNextSequence("url_counter");
      const shortCode = encodeBase62(counter);

      const url = await Url.create({
        shortCode,
        longUrl,
        userId,
        isCustomAlias: false,
        clicks: 0,
      });

      await this.cacheUrl(shortCode, longUrl);

      return {
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        longUrl: url.longUrl,
        clicks: url.clicks,
        createdAt: url.createdAt,
      };
    } catch (error) {
      throw new AppError(`Shortening failed: ${error.message}`, 500);
    }
  }

  /**
   * Method 2: Random Generation with Collision Detection
   */
  async shortenWithRandomCode(
    longUrl,
    userId = null,
    customAlias = null,
    retries = 3,
  ) {
    try {
      // ✅ Use imported validateUrl
      if (!validateUrl(longUrl)) {
        throw new AppError("Invalid URL format", 400);
      }

      if (customAlias) {
        return await this.createWithCustomAlias(longUrl, customAlias, userId);
      }

      let attempts = 0;
      let shortCode = null;
      let url = null;

      while (attempts < retries) {
        shortCode = generateRandomCode(6);
        const existingUrl = await Url.findOne({ shortCode });

        if (!existingUrl) {
          console.log("📝 Creating URL with userId:", userId); // Debug log
          url = await Url.create({
            shortCode,
            longUrl,
            userId: userId,
            isCustomAlias: false,
            clicks: 0,
          });
          break;
        }
        attempts++;
      }

      if (!url) {
        throw new AppError(
          "Failed to generate unique code after multiple attempts",
          500,
        );
      }

      await this.cacheUrl(shortCode, longUrl);

      return {
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        longUrl: url.longUrl,
        clicks: url.clicks,
        createdAt: url.createdAt,
      };
    } catch (error) {
      throw new AppError(`Shortening failed: ${error.message}`, 500);
    }
  }

  /**
   * Method 3: MD5 Hash + Base62
   */
  async shortenWithHash(longUrl, userId = null, customAlias = null) {
    try {
      // ✅ Use imported validateUrl
      if (!validateUrl(longUrl)) {
        throw new AppError("Invalid URL format", 400);
      }

      if (customAlias) {
        return await this.createWithCustomAlias(longUrl, customAlias, userId);
      }

      // Check if this URL already has a short code for this user
      const existingUrl = await Url.findOne({ longUrl, userId });
      if (existingUrl) {
        return {
          shortCode: existingUrl.shortCode,
          shortUrl: `${process.env.BASE_URL}/${existingUrl.shortCode}`,
          longUrl: existingUrl.longUrl,
          clicks: existingUrl.clicks,
          message: "URL already shortened",
        };
      }

      const md5Hash = crypto.createHash("md5").update(longUrl).digest("hex");
      const hashNumber = parseInt(md5Hash.substring(0, 8), 16);
      const shortCode = encodeBase62(hashNumber).substring(0, 6);

      const collisionCheck = await Url.findOne({ shortCode });
      if (collisionCheck) {
        const saltedHash = crypto
          .createHash("md5")
          .update(longUrl + Date.now())
          .digest("hex");
        const saltedNumber = parseInt(saltedHash.substring(0, 8), 16);
        const finalCode = encodeBase62(saltedNumber).substring(0, 6);

        const url = await Url.create({
          shortCode: finalCode,
          longUrl,
          userId: userId,
          isCustomAlias: false,
          clicks: 0,
        });

        await this.cacheUrl(finalCode, longUrl);

        return {
          shortCode: url.shortCode,
          shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
          longUrl: url.longUrl,
          createdAt: url.createdAt,
        };
      }

      const url = await Url.create({
        shortCode,
        longUrl,
        userId: userId,
        isCustomAlias: false,
        clicks: 0,
      });

      await this.cacheUrl(shortCode, longUrl);

      return {
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        longUrl: url.longUrl,
        createdAt: url.createdAt,
      };
    } catch (error) {
      throw new AppError(`Shortening failed: ${error.message}`, 500);
    }
  }

  /**
   * Custom Alias Support
   */
  async createWithCustomAlias(longUrl, customAlias, userId = null) {
    // ✅ Use imported validateCustomAlias
    if (!validateCustomAlias(customAlias)) {
      throw new AppError(
        "Custom alias must be 4-30 characters long and contain only alphanumeric characters and hyphens",
        400,
      );
    }

    const existingUrl = await Url.findOne({ shortCode: customAlias });
    if (existingUrl) {
      throw new AppError(
        "This custom alias is already taken. Please choose another one.",
        409,
      );
    }

    const url = await Url.create({
      shortCode: customAlias,
      longUrl,
      userId: userId,
      isCustomAlias: true,
      clicks: 0,
    });

    await this.cacheUrl(customAlias, longUrl);

    return {
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      longUrl: url.longUrl,
      isCustom: true,
      createdAt: url.createdAt,
    };
  }

  /**
   * Get Long URL from Short Code
   */
  async getLongUrl(shortCode) {
    try {
      let longUrl = await this.getCachedUrl(shortCode);

      if (longUrl) {
        return longUrl;
      }

      const url = await Url.findOne({ shortCode, status: "active" });

      if (!url) {
        throw new AppError("Short URL not found or expired", 404);
      }

      if (url.expiresAt && url.expiresAt < new Date()) {
        await this.markAsExpired(shortCode);
        throw new AppError("This short URL has expired", 410);
      }

      await this.cacheUrl(shortCode, url.longUrl);
      url
        .incrementClicks()
        .catch((err) => console.error("Error incrementing clicks:", err));

      return url.longUrl;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get URL Statistics
   */
  async getUrlStats(shortCode) {
    const url = await Url.findOne({ shortCode });

    if (!url) {
      throw new AppError("URL not found", 404);
    }

    return {
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      longUrl: url.longUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
      isCustomAlias: url.isCustomAlias,
      status: url.status,
      expiresAt: url.expiresAt,
    };
  }

  /**
   * Delete/Disable Short URL
   */
  async deleteShortUrl(shortCode, userId = null) {
    const query = { shortCode };
    if (userId) {
      query.userId = userId;
    }

    const url = await Url.findOneAndUpdate(
      query,
      { status: "disabled" },
      { new: true },
    );

    if (!url) {
      throw new AppError("URL not found or unauthorized", 404);
    }

    await this.removeFromCache(shortCode);

    return { message: "URL disabled successfully", shortCode };
  }

  // ============ Helper Methods ============

  async getNextSequence(sequenceName) {
    const counter = await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  async cacheUrl(shortCode, longUrl) {
    try {
      const redisClient = require("../config/redis");
      const client = redisClient.getClient();
      await client.setex(`url:${shortCode}`, 3600, longUrl);
    } catch (error) {
      console.error("Redis caching error:", error);
    }
  }

  async getCachedUrl(shortCode) {
    try {
      const redisClient = require("../config/redis");
      const client = redisClient.getClient();
      return await client.get(`url:${shortCode}`);
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }

  async removeFromCache(shortCode) {
    try {
      const redisClient = require("../config/redis");
      const client = redisClient.getClient();
      await client.del(`url:${shortCode}`);
    } catch (error) {
      console.error("Redis delete error:", error);
    }
  }

  async markAsExpired(shortCode) {
    await Url.findOneAndUpdate({ shortCode }, { status: "expired" });
  }
}

module.exports = new UrlShortenerService();
