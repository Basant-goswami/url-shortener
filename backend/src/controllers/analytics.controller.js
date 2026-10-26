const { Analytics, Url } = require("../models");
const { sendResponse, sendError } = require("../utils/apiResponse");
const { catchAsync } = require("../utils/errorHandler");

/**
 * Get complete analytics for a specific URL
 * GET /api/v1/analytics/:shortCode?days=30
 */
exports.getUrlAnalytics = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const { days = 30 } = req.query;

  // Validate shortCode
  if (!shortCode) {
    return sendError(res, 400, "Short code is required");
  }

  // Check if URL exists
  const url = await Url.findOne({ shortCode });
  if (!url) {
    return sendError(res, 404, "URL not found");
  }

  // Parse days as integer
  const daysInt = parseInt(days) || 30;

  // Get complete analytics
  const analyticsData = await Analytics.getCompleteAnalytics(
    shortCode,
    daysInt,
  );

  // ============ Prepare Response ============
  const basicInfo = {
    shortCode: url.shortCode,
    shortUrl: `${process.env.BASE_URL || "http://localhost:5000"}/${url.shortCode}`,
    longUrl: url.longUrl,
    totalClicks: url.clicks || 0,
    createdAt: url.createdAt,
    expiresAt: url.expiresAt || null,
    status: url.status || "active",
    isCustomAlias: url.isCustomAlias || false,
  };

  // Calculate summary statistics
  const totalClicks = url.clicks || 0;
  const uniqueVisitors = analyticsData.uniqueVisitors || 0;
  const last30Days = analyticsData.clicksByDay.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const averagePerDay =
    analyticsData.clicksByDay.length > 0
      ? Math.round((last30Days / analyticsData.clicksByDay.length) * 10) / 10
      : 0;

  const summary = {
    totalClicks,
    uniqueVisitors,
    last30Days,
    averagePerDay,
  };

  // ============ Send Response ============
  sendResponse(
    res,
    200,
    {
      basicInfo,
      summary,
      clicksByDay: analyticsData.clicksByDay || [],
      deviceStats: analyticsData.deviceStats || [],
      browserStats: analyticsData.browserStats || [],
      osStats: analyticsData.osStats || [],
      countryStats: analyticsData.countryStats || [],
      referrerStats: analyticsData.referrerStats || [],
      hourlyStats: analyticsData.hourlyStats || [],
      recentClicks: analyticsData.recentClicks || [],
    },
    "Analytics retrieved successfully",
  );
});

/**
 * Get overall analytics for all user URLs
 * GET /api/v1/analytics/overall?days=30
 */
exports.getOverallAnalytics = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  const { days = 30 } = req.query;

  if (!userId) {
    return sendError(res, 401, "Please login to view analytics");
  }

  // Get all user's URLs
  const urls = await Url.find({ userId, status: "active" });
  const shortCodes = urls.map((url) => url.shortCode);

  if (shortCodes.length === 0) {
    return sendResponse(
      res,
      200,
      {
        totalUrls: 0,
        totalClicks: 0,
        recentActivity: [],
        topUrls: [],
      },
      "No URLs found",
    );
  }

  const daysInt = parseInt(days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysInt);

  // Total clicks
  const totalClicks = await Analytics.countDocuments({
    shortCode: { $in: shortCodes },
    clickedAt: { $gte: startDate },
  });

  // Top performing URLs
  const topUrls = await Analytics.aggregate([
    {
      $match: {
        shortCode: { $in: shortCodes },
        clickedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$shortCode",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "urls",
        localField: "_id",
        foreignField: "shortCode",
        as: "urlInfo",
      },
    },
    {
      $unwind: {
        path: "$urlInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        shortCode: "$_id",
        count: 1,
        longUrl: "$urlInfo.longUrl",
        shortUrl: {
          $concat: [
            process.env.BASE_URL || "http://localhost:5000",
            "/",
            "$_id",
          ],
        },
      },
    },
  ]);

  // Recent activity
  const recentActivity = await Analytics.find({
    shortCode: { $in: shortCodes },
  })
    .sort({ clickedAt: -1 })
    .limit(10)
    .populate("shortCode", "longUrl shortCode")
    .select("clickedAt device browser country shortCode");

  sendResponse(
    res,
    200,
    {
      totalUrls: urls.length,
      totalClicks,
      topUrls: topUrls || [],
      recentActivity: recentActivity || [],
      urls,
    },
    "Overall analytics retrieved",
  );
});

/**
 * Export analytics as CSV
 * GET /api/v1/analytics/:shortCode/export?format=csv
 */
exports.exportAnalytics = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const { format = "csv" } = req.query;

  // Check if URL exists
  const url = await Url.findOne({ shortCode });
  if (!url) {
    return sendError(res, 404, "URL not found");
  }

  // Get all analytics data
  const analytics = await Analytics.find({ shortCode })
    .sort({ clickedAt: -1 })
    .select("clickedAt ipAddress device browser os country referer userAgent");

  if (format === "csv") {
    // Generate CSV header
    let csv = "Date,IP Address,Device,Browser,OS,Country,Referer,User Agent\n";

    // Add data rows
    analytics.forEach((record) => {
      const date = record.clickedAt
        ? new Date(record.clickedAt).toLocaleString()
        : "N/A";
      const ip = record.ipAddress || "N/A";
      const device = record.device || "N/A";
      const browser = record.browser || "N/A";
      const os = record.os || "N/A";
      const country = record.country || "N/A";
      const referer = record.referer || "Direct";
      const userAgent = record.userAgent || "N/A";

      // Escape commas and quotes in fields
      const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;

      csv += `${escape(date)},${escape(ip)},${escape(device)},${escape(browser)},${escape(os)},${escape(country)},${escape(referer)},${escape(userAgent)}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics-${shortCode}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    return res.send(csv);
  }

  // JSON format
  sendResponse(res, 200, analytics, "Analytics exported successfully");
});

/**
 * Clear all analytics for a URL
 * DELETE /api/v1/analytics/:shortCode
 */
exports.clearAnalytics = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const userId = req.user?._id;

  // Check if URL exists and belongs to user
  const url = await Url.findOne({ shortCode });
  if (!url) {
    return sendError(res, 404, "URL not found");
  }

  // Check ownership
  if (url.userId && userId && url.userId.toString() !== userId.toString()) {
    return sendError(res, 403, "You do not have permission to clear analytics");
  }

  // Delete all analytics
  const result = await Analytics.deleteMany({ shortCode });

  // Reset click count
  url.clicks = 0;
  await url.save();

  sendResponse(
    res,
    200,
    {
      deletedCount: result.deletedCount || 0,
      shortCode,
    },
    "Analytics cleared successfully",
  );
});

/**
 * Get real-time analytics (last 5 minutes)
 * GET /api/v1/analytics/:shortCode/realtime
 */
exports.getRealtimeAnalytics = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const minutes = 5;

  const startDate = new Date();
  startDate.setMinutes(startDate.getMinutes() - minutes);

  const realtimeData = await Analytics.find({
    shortCode,
    clickedAt: { $gte: startDate },
  })
    .sort({ clickedAt: -1 })
    .limit(50)
    .select("clickedAt device browser country ipAddress");

  sendResponse(
    res,
    200,
    {
      count: realtimeData.length,
      clicks: realtimeData,
      timeRange: `${minutes} minutes`,
    },
    "Realtime analytics retrieved",
  );
});
