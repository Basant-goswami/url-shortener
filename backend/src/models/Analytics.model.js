const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    shortCode: {
      type: String,
      required: true,
      index: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // IP & Location
    ipAddress: {
      type: String,
      default: "Unknown",
    },
    country: {
      type: String,
      default: "Unknown",
    },
    countryCode: {
      type: String,
      default: "Unknown",
    },
    city: {
      type: String,
      default: "Unknown",
    },
    region: {
      type: String,
      default: "Unknown",
    },
    userAgent: {
      type: String,
      default: "",
    },
    referer: {
      type: String,
      default: null,
    },
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    responseTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// ✅ INDEXES ONLY - NO PRE-SAVE HOOK
analyticsSchema.index({ shortCode: 1, clickedAt: -1 });
analyticsSchema.index({ shortCode: 1, country: 1 });

// ✅ STATIC METHOD (simple)
analyticsSchema.statics.getCompleteAnalytics = async function (
  shortCode,
  days = 30,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const clicksByDay = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: "$clickedAt" },
          month: { $month: "$clickedAt" },
          day: { $dayOfMonth: "$clickedAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  const deviceStats = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: "$device", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // ... (add other aggregations if needed, but for now keep simple)
  const browserStats = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: "$browser", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const osStats = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: "$os", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const countryStats = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const referrerStats = await this.aggregate([
    {
      $match: {
        shortCode,
        clickedAt: { $gte: startDate },
        referer: { $ne: null, $ne: "" },
      },
    },
    { $group: { _id: "$referer", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const hourlyStats = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: { $hour: "$clickedAt" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const recentClicks = await this.find({ shortCode })
    .sort({ clickedAt: -1 })
    .limit(20)
    .select("clickedAt ipAddress device browser country");

  const uniqueVisitorsResult = await this.aggregate([
    { $match: { shortCode, clickedAt: { $gte: startDate } } },
    { $group: { _id: "$ipAddress" } },
    { $count: "uniqueCount" },
  ]);

  return {
    clicksByDay,
    deviceStats,
    browserStats,
    osStats,
    countryStats,
    referrerStats,
    hourlyStats,
    recentClicks,
    uniqueVisitors: uniqueVisitorsResult[0]?.uniqueCount || 0,
  };
};

const Analytics = mongoose.model("Analytics", analyticsSchema);
module.exports = Analytics;
