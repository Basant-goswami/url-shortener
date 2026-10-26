const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    // Short Code - Unique identifier for URL
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      unique: true,
      trim: true,
      // index: true,
    },
    // Original long Url
    longUrl: {
      type: String,
      required: [true, "Long Url is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    // Custom Alias - Given by User or auto-generated
    isCustomAlias: {
      type: Boolean,
      default: false,
    },
    // Click Count - For Analytics

    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    // User Reference - which user has created
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // User model se link
      required: false, // Anonymous users bhi URL bana sakte hain
    },

    // Expiry Date
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    },
    // Status - Active/Expired/Disabled
    status: {
      type: String,
      enum: ["active", "exprired", "disabled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes - For Fast searching
// urlSchema.index({ shortCode: 1 }); // 1 = ascending order
urlSchema.index({ userId: 1, createdAt: -1 }); // -1 = descending
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatic expiry

// Instance methods - for one particular URL
urlSchema.methods.incrementClicks = async function () {
  this.clicks += 1;
  return this.save();
};

// Static methods - Poori collection ke liye
urlSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

urlSchema.statics.getPopularUrls = function (limit = 10) {
  return this.find({ status: "active" }).sort({ clicks: -1 }).limit(limit);
};

const Url = mongoose.model("Url", urlSchema);
module.exports = Url; // ✅ Yeh line honi chahiye
