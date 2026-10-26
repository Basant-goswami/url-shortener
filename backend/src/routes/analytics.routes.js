const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { protect } = require("../middleware/auth.middleware");
const { getRequestsLimiter } = require("../middleware/rateLimiter.middleware");

// ============ PUBLIC ROUTES ============
// Get analytics for a specific URL (public)
router.get(
  "/:shortCode",
  getRequestsLimiter,
  analyticsController.getUrlAnalytics,
);

// Get realtime analytics (public)
router.get(
  "/:shortCode/realtime",
  getRequestsLimiter,
  analyticsController.getRealtimeAnalytics,
);

// ============ PROTECTED ROUTES ============
// Get overall analytics for user
router.get("/overall", protect, analyticsController.getOverallAnalytics);

// Export analytics as CSV
router.get("/:shortCode/export", protect, analyticsController.exportAnalytics);

// Clear all analytics for a URL
router.delete("/:shortCode", protect, analyticsController.clearAnalytics);

module.exports = router;
