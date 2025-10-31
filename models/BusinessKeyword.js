const mongoose = require("mongoose");

const BusinessKeywordSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kyc',
    required: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster search
BusinessKeywordSchema.index({ businessId: 1, keyword: 1 });
BusinessKeywordSchema.index({ vendorId: 1 });

const BusinessKeyword = mongoose.model("BusinessKeyword", BusinessKeywordSchema);

module.exports = BusinessKeyword;

