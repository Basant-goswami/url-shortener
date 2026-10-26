const urlShortenerService = require("../services/urlShortener.service");
const { sendResponse, sendError, ApiError } = require("../utils/apiResponse");
const { validateUrl, validateCustomAlias } = require("../utils/validators");
const { Url, Analytics } = require("../models");
const { cacheUrl, removeFromCache } = require("../services/cache.service");

class UrlController {
  /**
   * Create short URL
   * POST /api/v1/urls/shorten
   */
  async shortenUrl(req, res) {
    try {
      const { longUrl, customAlias, method = "random", expiresIn } = req.body;
      // const userId = req.user?._id;
      const userId = req.user ? req.user._id : null;

      if (!longUrl) {
        return sendError(res, 400, "Long URL is required");
      }

      // Validate URL with detailed logging
      const isValidUrl = validateUrl(longUrl);

      if (!isValidUrl) {
        return sendError(
          res,
          400,
          "Invalid URL format. Please ensure you have a valid domain (e.g., https://example.com)",
        );
      }

      // Validate custom alias if provided
      if (customAlias && !validateCustomAlias(customAlias)) {
        return sendError(res, 400, "Invalid custom alias format");
      }

      let result;

      // Choose shortening method
      switch (method) {
        case "sequential":
          result = await urlShortenerService.shortenWithSequentialId(
            longUrl,
            userId,
            customAlias,
          );
          break;
        case "hash":
          result = await urlShortenerService.shortenWithHash(
            longUrl,
            userId,
            customAlias,
          );
          break;
        case "random":
        default:
          result = await urlShortenerService.shortenWithRandomCode(
            longUrl,
            userId,
            customAlias,
          );
          break;
      }

      // Add expiry date if specified
      if (expiresIn && result.shortCode) {
        await Url.findOneAndUpdate(
          { shortCode: result.shortCode },
          {
            expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
          },
        );
      }

      return sendResponse(res, 201, result, "URL shortened successfully");
    } catch (error) {
      if (error.message.includes("already taken")) {
        return sendError(res, 409, "Custom alias already taken");
      }
      console.error("Shorten URL error:", error);
      return sendError(res, 500, "Failed to shorten URL");
    }
  }

  /**
   * Redirect to original URL
   * GET /:shortCode
   */
  async redirectToUrl(req, res) {
    try {
      const { shortCode } = req.params;

      const reservedCodes = [
        "my-urls",
        "stats",
        "check-alias",
        "bulk",
        "shorten",
      ];
      if (reservedCodes.includes(shortCode)) {
        return sendError(res, 404, "Invalid short URL");
      }

      // Get long URL
      const longUrl = await urlShortenerService.getLongUrl(shortCode);

      // console.log(`📍 Found longUrl: ${longUrl}`); // Debug log

      if (!longUrl) {
        return sendError(res, 404, "Short URL not found or expired");
      }

      // Log analytics asynchronously (don't wait)
      this.logClickAnalytics(req, shortCode).catch((err) =>
        console.error("Analytics logging error:", err),
      );

      // Redirect with 301 (permanent) for better SEO

      console.log(`🔄 Redirecting to: ${longUrl}`); // Debug log

      return res.redirect(301, longUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      if (error.message.includes("expired")) {
        return sendError(res, 410, "This short URL has expired");
      }
      return sendError(res, 500, "Failed to redirect");
    }
  }

  /**
   * Get URL statistics
   * GET /api/v1/urls/stats/:shortCode
   */
  async getUrlStats(req, res) {
    try {
      const { shortCode } = req.params;

      // Get URL info
      const url = await Url.findOne({ shortCode });
      if (!url) {
        return sendError(res, 404, "URL not found");
      }

      // Get click statistics
      const clickStats = await Analytics.getClickStats(shortCode, 30);

      // Get device statistics
      const deviceStats = await Analytics.aggregate([
        { $match: { shortCode } },
        {
          $group: {
            _id: "$device",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get top referrers
      const refererStats = await Analytics.aggregate([
        { $match: { shortCode, referer: { $ne: null } } },
        {
          $group: {
            _id: "$referer",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      const stats = {
        basicInfo: {
          shortCode: url.shortCode,
          shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
          longUrl: url.longUrl,
          userId: userId,
          createdAt: url.createdAt,
          expiresAt: url.expiresAt,
          status: url.status,
          isCustomAlias: url.isCustomAlias,
          totalClicks: url.clicks,
        },
        analytics: {
          clicksByDay: clickStats,
          devices: deviceStats,
          topReferrers: refererStats,
          last30Days: clickStats.reduce((sum, day) => sum + day.count, 0),
        },
      };

      return sendResponse(res, 200, stats, "Statistics retrieved successfully");
    } catch (error) {
      console.error("Get stats error:", error);
      return sendError(res, 500, "Failed to get statistics");
    }
  }

  /**
   * Update URL
   * PUT /api/v1/urls/:shortCode
   */
  async updateUrl(req, res) {
    try {
      const { shortCode } = req.params;
      const { longUrl } = req.body;
      const userId = req.user?._id;

      // Check if URL exists and user owns it
      const url = await Url.findOne({ shortCode });
      if (!url) {
        return sendError(res, 404, "URL not found");
      }

      // Check ownership (if user is logged in)
      if (userId && url.userId && url.userId.toString() !== userId.toString()) {
        return sendError(
          res,
          403,
          "You do not have permission to update this URL",
        );
      }

      // Update URL
      url.longUrl = longUrl;
      url.updatedAt = new Date();
      await url.save();

      // Update cache
      await urlShortenerService.cacheUrl(shortCode, longUrl);

      return sendResponse(
        res,
        200,
        {
          shortCode: url.shortCode,
          longUrl: url.longUrl,
          updatedAt: url.updatedAt,
        },
        "URL updated successfully",
      );
    } catch (error) {
      console.error("Update URL error:", error);
      return sendError(res, 500, "Failed to update URL");
    }
  }

  /**
   * Delete URL
   * DELETE /api/v1/urls/:shortCode
   */
  async deleteUrl(req, res) {
    try {
      const { shortCode } = req.params;
      const userId = req.user?._id;

      // Check if URL exists and user owns it
      const url = await Url.findOne({ shortCode });
      if (!url) {
        return sendError(res, 404, "URL not found");
      }

      // Check ownership
      if (userId && url.userId && url.userId.toString() !== userId.toString()) {
        return sendError(
          res,
          403,
          "You do not have permission to delete this URL",
        );
      }

      // Soft delete - just mark as disabled
      url.status = "disabled";
      await url.save();

      // Remove from cache
      await urlShortenerService.removeFromCache(shortCode);

      return sendResponse(res, 200, null, "URL deleted successfully");
    } catch (error) {
      console.error("Delete URL error:", error);
      return sendError(res, 500, "Failed to delete URL");
    }
  }

  /**
   * Toggle URL status (active ↔ disabled)
   * PATCH /api/v1/urls/:shortCode/status
   */
  async toggleStatus(req, res) {
    const { shortCode } = req.params;
    const userId = req.user._id;

    const url = await Url.findOne({ shortCode });
    if (!url) {
      return sendError(res, 404, "URL not found");
    }

    // Check ownership
    if (url.userId?.toString() !== userId.toString()) {
      return sendError(res, 403, "Unauthorized");
    }

    // Toggle status
    const newStatus = url.status === "active" ? "disabled" : "active";
    url.status = newStatus;
    await url.save();

    // Update cache (remove if disabled, add if active)
    if (newStatus === "active") {
      await cacheUrl(shortCode, url.longUrl);
    } else {
      await removeFromCache(shortCode);
    }

    sendResponse(
      res,
      200,
      {
        shortCode,
        status: newStatus,
        message: `URL ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
      },
      "Status updated",
    );
  }

  /**
   * Permanent delete (hard delete from DB)
   * DELETE /api/v1/urls/:shortCode/permanent
   */
  async permanentDelete(req, res) {
    const { shortCode } = req.params;
    const userId = req.user._id;

    const url = await Url.findOne({ shortCode });
    if (!url) {
      return sendError(res, 404, "URL not found");
    }

    // Check ownership
    if (url.userId?.toString() !== userId.toString()) {
      return sendError(res, 403, "Unauthorized");
    }

    // Delete from DB
    await Url.deleteOne({ shortCode });

    // Delete all analytics
    await Analytics.deleteMany({ shortCode });

    // Remove from cache
    await removeFromCache(shortCode);

    sendResponse(res, 200, null, "URL permanently deleted");
  }

  /**
   * Bulk shorten URLs
   * POST /api/v1/urls/bulk
   */
  async bulkShorten(req, res) {
    try {
      const { urls } = req.body;
      const userId = req.user?._id;

      const results = [];
      const errors = [];

      for (const urlItem of urls) {
        try {
          if (!validateUrl(urlItem.longUrl)) {
            errors.push({
              url: urlItem.longUrl,
              error: "Invalid URL format",
            });
            continue;
          }

          const result = await urlShortenerService.shortenWithRandomCode(
            urlItem.longUrl,
            userId,
            urlItem.customAlias,
          );

          results.push(result);
        } catch (error) {
          errors.push({
            url: urlItem.longUrl,
            error: error.message,
          });
        }
      }

      return sendResponse(
        res,
        207,
        {
          successful: results,
          failed: errors,
          total: urls.length,
          successCount: results.length,
          failureCount: errors.length,
        },
        "Bulk shortening completed",
      );
    } catch (error) {
      console.error("Bulk shorten error:", error);
      return sendError(res, 500, "Failed to process bulk request");
    }
  }

  /**
   * Get user's all URLs
   * GET /api/v1/urls/my-urls
   */
  async getUserUrls(req, res) {
    try {
      const userId = req.user?._id;

      console.log("🔍 getUserUrls - userId:", userId); // ✅ Debug log
      console.log("🔍 Full user:", req.user);

      if (!userId) {
        return sendError(res, 401, "Please login to view your URLs");
      }

      // ✅ PAGINATION PARAMS
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;

      // ✅ COUNT TOTAL
      const total = await Url.countDocuments({ userId });

      // ✅ FETCH WITH PAGINATION
      const urls = await Url.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return sendResponse(
        res,
        200,
        {
          urls: urls,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        },
        "URLs retrieved successfully",
      );
    } catch (error) {
      console.error("Get user URLs error:", error);
      return sendError(res, 500, "Failed to retrieve URLs");
    }
  }

  /**
   * Check if custom alias is available
   * GET /api/v1/urls/check-alias/:alias
   */
  async checkAliasAvailability(req, res) {
    try {
      const { alias } = req.params;

      if (!validateCustomAlias(alias)) {
        return sendResponse(res, 200, {
          available: false,
          reason: "Invalid alias format",
        });
      }

      const existingUrl = await Url.findOne({ shortCode: alias });

      return sendResponse(res, 200, {
        available: !existingUrl,
        alias: alias,
      });
    } catch (error) {
      console.error("Check alias error:", error);
      return sendError(res, 500, "Failed to check alias availability");
    }
  }

  /**
   * Log click analytics (private method)
   */
  async logClickAnalytics(req, shortCode) {
    try {
      const analyticsData = {
        shortCode,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        referer: req.headers.referer || null,
        device: this.getDeviceType(req.headers["user-agent"]),
        browser: this.getBrowser(req.headers["user-agent"]),
        os: this.getOS(req.headers["user-agent"]),
        responseTime: Date.now() - req.startTime,
      };

      await Analytics.create(analyticsData);
    } catch (error) {
      console.error("Analytics logging error:", error);
    }
  }

  /**
   * Device detection helper
   */
  getDeviceType(userAgent) {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile")) return "mobile";
    if (ua.includes("tablet")) return "tablet";
    if (ua.includes("bot") || ua.includes("crawler")) return "bot";
    return "desktop";
  }

  /**
   * Browser detection helper
   */
  getBrowser(userAgent) {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("chrome")) return "chrome";
    if (ua.includes("firefox")) return "firefox";
    if (ua.includes("safari")) return "safari";
    if (ua.includes("edge")) return "edge";
    return "other";
  }

  /**
   * OS detection helper
   */
  getOS(userAgent) {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("windows")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux")) return "linux";
    if (ua.includes("android")) return "android";
    if (ua.includes("ios")) return "ios";
    return "other";
  }
}

module.exports = new UrlController();
