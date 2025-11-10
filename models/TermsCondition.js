const mongoose = require("mongoose");

const TermsConditionSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

TermsConditionSchema.index({ heading: 1 });

const TermsCondition = mongoose.model("TermsCondition", TermsConditionSchema);

module.exports = TermsCondition;


