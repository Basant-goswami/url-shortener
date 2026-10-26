const express = require("express");
const router = express.Router();
const urlController = require("../controllers/url.controller");
const {
  validate,
  urlValidationRules,
  bulkValidationRules,
} = require("../middleware/validation.middleware");
const { protect } = require("../middleware/auth.middleware");
const {
  urlCreationLimiter,
  getRequestsLimiter,
} = require("../middleware/rateLimiter.middleware");

// ✅ 1. SPECIFIC GET ROUTES - PEHLE
router.get("/my-urls", protect, urlController.getUserUrls.bind(urlController));
router.get(
  "/stats/:shortCode",
  protect,
  urlController.getUrlStats.bind(urlController),
);
router.get(
  "/check-alias/:alias",
  urlController.checkAliasAvailability.bind(urlController),
);

// ✅ 2. POST ROUTES
router.post("/shorten", protect, urlController.shortenUrl.bind(urlController));
router.post("/bulk", protect, urlController.bulkShorten.bind(urlController));

// ✅ 3. PUT/DELETE ROUTES
router.put("/:shortCode", protect, urlController.updateUrl.bind(urlController));
router.delete(
  "/:shortCode",
  protect,
  urlController.deleteUrl.bind(urlController),
);

// Toggle status (enable/disable)
router.patch("/:shortCode/status", protect, urlController.toggleStatus);

// Permanent delete (hard delete)
router.delete("/:shortCode/permanent", protect, urlController.permanentDelete);

// ✅ 4. REDIRECT ROUTE - SABSE LAST MEIN!
router.get("/:shortCode", urlController.redirectToUrl.bind(urlController));

module.exports = router;
