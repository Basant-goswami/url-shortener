const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  validate,
  userValidationRules,
} = require("../middleware/validation.middleware");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter.middleware");

// ============ PUBLIC ROUTES ============

// Register
router.post(
  "/register",
  authLimiter,
  userValidationRules.register,
  validate,
  authController.register,
);

// Login
router.post(
  "/login",
  authLimiter,
  userValidationRules.login,
  validate,
  authController.login,
);

// Forgot Password
router.post("/forgot-password", authLimiter, authController.forgotPassword);

// Reset Password
router.post("/reset-password", authLimiter, authController.resetPassword);

// ============ PROTECTED ROUTES ============

// Get current user
router.get("/profile", protect, authController.getMe);

// Update profile
router.put(
  "/profile",
  protect,
  userValidationRules.update,
  validate,
  authController.updateProfile,
);

// Change password
router.put("/change-password", protect, authController.changePassword);

// Delete account
router.delete("/account", protect, authController.deleteAccount);

module.exports = router;
