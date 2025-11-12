const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Unique index: one review per user per vendor (only if not deleted)
ReviewSchema.index(
  { userId: 1, vendorId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Index for vendor reviews (approved only)
ReviewSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

// Index for admin to see pending reviews
ReviewSchema.index({ status: 1, createdAt: -1 });

const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;


