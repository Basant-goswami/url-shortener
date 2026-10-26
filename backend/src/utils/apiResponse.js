/**
 * Standard API Response Formatter
 * Why? - Consistent response structure from all endpoints
 */

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.success = false;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Response helper functions
const sendResponse = (res, statusCode, data, message) => {
  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, data, message));
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  ApiResponse,
  ApiError,
  sendResponse,
  sendError,
};
