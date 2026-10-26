const { body, param, query, validationResult } = require("express-validator");
const { sendError } = require("../utils/apiResponse");
const { validateUrl, validateCustomAlias } = require("../utils/validators");

// Generic validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));

    return sendError(res, 400, "Validation failed", formattedErrors);
  }
  next();
};

// ============================================================
// URL Validation Rules
// ============================================================
const urlValidationRules = {
  create: [
    body("longUrl")
      .notEmpty()
      .withMessage("Long URL is required")
      .trim()
      .custom((value) => {
        // ✅ Use the validateUrl function
        if (!validateUrl(value)) {
          throw new Error(
            "Invalid URL format. Please enter a valid URL with domain (e.g., https://example.com)",
          );
        }
        return true;
      }),

    body("customAlias")
      .optional()
      .isLength({ min: 4, max: 30 })
      .withMessage("Custom alias must be between 4 and 30 characters")
      .custom((value) => {
        if (!validateCustomAlias(value)) {
          throw new Error(
            "Custom alias must contain only letters, numbers, and hyphens, and must start/end with a letter or number",
          );
        }
        return true;
      }),

    body("expiresIn")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Expiry days must be between 1 and 365"),

    body("method")
      .optional()
      .isIn(["sequential", "random", "hash"])
      .withMessage("Method must be sequential, random, or hash"),
  ],

  update: [
    param("shortCode")
      .notEmpty()
      .withMessage("Short code is required")
      .isLength({ min: 4, max: 30 })
      .withMessage("Invalid short code length"),

    body("longUrl")
      .optional()
      .trim()
      .custom((value) => {
        if (!validateUrl(value)) {
          throw new Error("Invalid URL format");
        }
        return true;
      }),
  ],

  getStats: [
    param("shortCode")
      .notEmpty()
      .withMessage("Short code is required")
      .isLength({ min: 1, max: 30 })
      .withMessage("Invalid short code"),
  ],
};

// ============================================================
// User Validation Rules
// ============================================================
const userValidationRules = {
  register: [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage("Name can only contain letters and spaces"),

    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail()
      .custom(async (email) => {
        const User = require("../models/User.model");
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new Error("Email already registered");
        }
        return true;
      }),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage("Password must contain at least one letter and one number"),

    body("confirmPassword")
      .notEmpty()
      .withMessage("Please confirm your password")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
  ],

  login: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
  ],

  update: [
    body("name")
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage("Name can only contain letters and spaces"),

    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
  ],
};

// ============================================================
// Analytics Validation Rules
// ============================================================
const analyticsValidationRules = {
  getStats: [
    param("shortCode").notEmpty().withMessage("Short code is required"),

    query("days")
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage("Days must be between 1 and 90")
      .toInt(),
  ],
};

// ============================================================
// Bulk Operation Validation
// ============================================================
const bulkValidationRules = {
  create: [
    body("urls")
      .isArray({ min: 1, max: 100 })
      .withMessage("Please provide an array of 1-100 URLs"),

    body("urls.*.longUrl")
      .notEmpty()
      .withMessage("Each URL must have a longUrl field")
      .custom((value) => {
        if (!validateUrl(value)) {
          throw new Error("Invalid URL format in array");
        }
        return true;
      }),

    body("urls.*.customAlias")
      .optional()
      .custom((value) => {
        if (value && !validateCustomAlias(value)) {
          throw new Error("Invalid custom alias format");
        }
        return true;
      }),
  ],
};

module.exports = {
  validate,
  urlValidationRules,
  userValidationRules,
  analyticsValidationRules,
  bulkValidationRules,
};
