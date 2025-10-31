const mongoose = require('mongoose');

const leadResponseSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kyc',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  matchedKeywords: [{
    type: String
  }],
  distance: {
    type: Number // Distance in meters
  },
  respondedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
});

// Indexes
leadResponseSchema.index({ leadId: 1, vendorId: 1 }, { unique: true });
leadResponseSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
leadResponseSchema.index({ businessId: 1, createdAt: -1 });
leadResponseSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('LeadResponse', leadResponseSchema);

