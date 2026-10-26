const validator = require("validator");

/**
 * ✅ COMPLETE URL VALIDATOR - Handles all types of URLs
 * Including: encoded URLs, long URLs with special characters
 */
const validateUrl = (url) => {
  if (!url) return false;

  // Trim whitespace
  let urlToValidate = url.trim();

  // Add http:// if no protocol is specified
  if (
    !urlToValidate.startsWith("http://") &&
    !urlToValidate.startsWith("https://")
  ) {
    urlToValidate = "http://" + urlToValidate;
  }

  // ============================================================
  // METHOD 1: Try validator.js with flexible options
  // ============================================================
  try {
    const isValid = validator.isURL(urlToValidate, {
      protocols: ["http", "https"],
      require_protocol: false,
      require_valid_protocol: true,
      allow_underscores: true,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: true,
      disallow_auth: false,
      host_whitelist: [],
      host_blacklist: [],
    });

    if (isValid) return true;
  } catch (e) {
    // Validator threw error, continue to next method
  }

  // ============================================================
  // METHOD 2: Try URL constructor (Most reliable)
  // ============================================================
  try {
    const urlObj = new URL(urlToValidate);

    // Check if it has a valid hostname with a dot
    if (!urlObj.hostname || !urlObj.hostname.includes(".")) {
      return false;
    }

    // Check protocol
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }

    return true;
  } catch (e) {
    // URL constructor failed, continue to next method
  }

  // ============================================================
  // METHOD 3: Try decoding URL and validating again
  // ============================================================
  try {
    const decodedUrl = decodeURIComponent(urlToValidate);
    const urlObj = new URL(decodedUrl);

    if (
      urlObj.hostname &&
      urlObj.hostname.includes(".") &&
      ["http:", "https:"].includes(urlObj.protocol)
    ) {
      return true;
    }
  } catch (e) {
    // Decoding failed, continue to next method
  }

  // ============================================================
  // METHOD 4: Enhanced regex for complex URLs
  // ============================================================
  // This regex handles:
  // - Protocol (http/https) optional
  // - Domain with subdomains
  // - Port numbers
  // - Path with special characters
  // - Query parameters with encoded values
  // - Hash fragments
  const urlRegex =
    /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})(:\d+)?([\/\w \.-]*)*\/?(\?[^#]*)?(#.*)?$/i;

  if (urlRegex.test(urlToValidate)) {
    return true;
  }

  // ============================================================
  // METHOD 5: Very lenient check - just ensure it has a domain
  // ============================================================
  const domainRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/i;
  if (domainRegex.test(urlToValidate)) {
    return true;
  }

  return false;
};

/**
 * ✅ VALIDATE CUSTOM ALIAS
 */
const validateCustomAlias = (alias) => {
  if (!alias) return false;

  // Alias should only contain alphanumeric characters and hyphens
  // Must start and end with alphanumeric
  const aliasRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{2,28}[a-zA-Z0-9]$/;
  return aliasRegex.test(alias) && alias.length >= 4 && alias.length <= 30;
};

/**
 * ✅ VALIDATE EMAIL
 */
const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ✅ VALIDATE PASSWORD
 */
const validatePassword = (password) => {
  if (!password) return false;
  // At least 6 characters, at least one letter, at least one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

/**
 * ✅ VALIDATE NAME
 */
const validateName = (name) => {
  if (!name) return false;
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return nameRegex.test(name);
};

module.exports = {
  validateUrl,
  validateCustomAlias,
  validateEmail,
  validateName,
  validatePassword,
};
