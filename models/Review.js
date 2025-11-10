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

ReviewSchema.index(
  { vendorId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

ReviewSchema.index({ vendorId: 1, createdAt: -1 });

const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;


