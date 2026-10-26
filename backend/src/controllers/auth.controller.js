const { User } = require("../models");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResponse, sendError } = require("../utils/apiResponse");
const { catchAsync } = require("../utils/errorHandler");
const { validateEmail, validatePassword } = require("../utils/validators");
const { sendPasswordResetEmail } = require("../utils/email");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = generateToken(user._id);

  // Remove password from output
  const userData = user.toObject();
  delete userData.password;
  delete userData.__v;

  res.status(statusCode).json({
    success: true,
    data: {
      user: userData,
      token,
    },
    message,
    timestamp: new Date().toISOString(),
  });
};

// ============ REGISTER ============
exports.register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input
  if (!name || !email || !password) {
    return sendError(res, 400, "Please provide all required fields");
  }

  if (!validateEmail(email)) {
    return sendError(res, 400, "Please provide a valid email");
  }

  if (!validatePassword(password)) {
    return sendError(
      res,
      400,
      "Password must be at least 6 characters and contain at least one letter and one number",
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 409, "User already exists with this email");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
  });

  sendTokenResponse(user, 201, res, "User registered successfully");
});

// ============ LOGIN ============
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "Please provide email and password");
  }

  // Find user with password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return sendError(res, 401, "Invalid credentials");
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    return sendError(res, 401, "Invalid credentials");
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, "Login successful");
});

// ============ GET CURRENT USER ============
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  const userData = user.toObject();
  delete userData.password;
  delete userData.__v;

  sendResponse(res, 200, userData, "User profile retrieved");
});

// ============ UPDATE PROFILE ============
exports.updateProfile = catchAsync(async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user._id;

  // Check if email is being changed and if it's already taken
  if (email) {
    const existingUser = await User.findOne({
      email,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return sendError(res, 409, "Email already taken");
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      name: name || req.user.name,
      email: email || req.user.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  const userData = user.toObject();
  delete userData.password;
  delete userData.__v;

  sendResponse(res, 200, userData, "Profile updated successfully");
});

// ============ CHANGE PASSWORD ============
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, "Please provide current and new password");
  }

  // Get user with password
  const user = await User.findById(userId).select("+password");

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  // Check current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    return sendError(res, 401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  sendResponse(res, 200, { token }, "Password changed successfully");
});

// ============ FORGOT PASSWORD ============

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendError(res, 400, "Please provide email");
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Security: Don't reveal if email exists
    return sendResponse(
      res,
      200,
      null,
      "If an account exists with this email, a reset link has been sent",
    );
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = resetTokenHash;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // ✅ Send email
  const emailResult = await sendPasswordResetEmail(
    user.email,
    resetUrl,
    user.name,
  );

  // ✅ Development mode: Log token for testing
  if (process.env.NODE_ENV === "development") {
    console.log("\n🔐 ========== RESET TOKEN (DEV ONLY) ==========");
    console.log(`📧 Email: ${user.email}`);
    console.log(`🎫 Token: ${resetToken}`);
    console.log(`🔗 URL: ${resetUrl}`);
    console.log(
      `📮 Email Status: ${emailResult.success ? "✅ Sent" : "❌ Failed"}`,
    );
    console.log("==============================================\n");
  }

  // ✅ Always return generic message (security)
  const message = emailResult.success
    ? "Password reset link sent to your email"
    : "If an account exists, a reset link has been sent";

  sendResponse(res, 200, { emailSent: emailResult.success }, message);
});

// ============ RESET PASSWORD ============
exports.resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return sendError(res, 400, "Please provide token and new password");
  }

  // Hash token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return sendError(res, 400, "Invalid or expired reset token");
  }

  // Update password
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  // Generate new token
  const newToken = generateToken(user._id);

  sendResponse(res, 200, { token: newToken }, "Password reset successful");
});

// ============ DELETE ACCOUNT ============
exports.deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user._id;

  // Soft delete - mark as inactive
  await User.findByIdAndUpdate(userId, {
    isActive: false,
    status: "deleted",
  });

  sendResponse(res, 200, null, "Account deleted successfully");
});
