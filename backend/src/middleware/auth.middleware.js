const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/User.model");
const { sendError } = require("../utils/apiResponse");

/**
 * Protect middleware - Authentication check
 * Verifies JWT token and attaches user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. If no token, return error
    if (!token) {
      console.log("❌ No token found in request");
      return sendError(
        res,
        401,
        "You are not logged in. Please login to access this resource.",
      );
    }

    // console.log("🔐 Token found:", token.substring(0, 20) + "...");

    // 3. Verify token
    let decoded;
    try {
      decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log("❌ JWT Verification failed:", jwtError.message);
      if (jwtError.name === "JsonWebTokenError") {
        return sendError(res, 401, "Invalid token. Please login again.");
      }
      if (jwtError.name === "TokenExpiredError") {
        return sendError(
          res,
          401,
          "Your token has expired. Please login again.",
        );
      }
      return sendError(res, 401, "Authentication failed");
    }

    // 4. Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(
        res,
        401,
        "The user belonging to this token no longer exists.",
      );
    }

    // 5. Check if account is active
    if (user.isActive === false) {
      return sendError(res, 401, "Your account has been deactivated.");
    }

    // 6. Check if password changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10,
      );
      if (decoded.iat < changedTimestamp) {
        return sendError(
          res,
          401,
          "Password changed recently. Please login again.",
        );
      }
    }

    // ✅ 7. Set user in request
    req.user = user;

    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error);
    return sendError(res, 500, "Authentication failed");
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "You are not logged in");
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  };
};

/**
 * Check if user owns the resource
 */
const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);

      if (!resource) {
        return sendError(res, 404, "Resource not found");
      }

      // Admin can access any resource
      if (req.user.role === "admin") {
        req.resource = resource;
        return next();
      }

      // Check ownership
      if (
        resource.userId &&
        resource.userId.toString() !== req.user._id.toString()
      ) {
        return sendError(
          res,
          403,
          "You do not have permission to access this resource",
        );
      }

      req.resource = resource;
      next();
    } catch (error) {
      return sendError(res, 500, error.message);
    }
  };
};

module.exports = {
  protect,
  restrictTo,
  checkOwnership,
};
