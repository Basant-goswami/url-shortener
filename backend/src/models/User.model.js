const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // By default password include mat karo in queries
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },

    passwordResetToken: String,
    passwordResetExpires: Date,

    // Optional: For social login
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },

    providerId: String,
    avatar: String,
  },
  {
    timestamps: true,
  },
);

// Indexes
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

// **Why Virtual Populate?** - User ke saare URLs la sakte hain bina extra query ke
userSchema.virtual("urls", {
  ref: "Url",
  localField: "_id",
  foreignField: "userId",
});

// **Why Pre-save Hook?** - Password hash karne ke liye
userSchema.pre("save", async function (next) {
  // Sirf agar password modify hua hai to hash karo
  if (!this.isModified("password")) return;

  try {
    // Generate salt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// **Why Methods?** - Password compare karne ke liye
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
