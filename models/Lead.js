const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  searchKeyword: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    city: String,
    state: String,
    pincode: String
  },
  matchedKeywords: [{
    type: String
  }],
  radius: {
    type: Number,
    default: 15000 // 15 km in meters
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalVendorsNotified: {
    type: Number,
    default: 0
  },
  totalAccepted: {
    type: Number,
    default: 0
  },
  totalRejected: {
    type: Number,
    default: 0
  },
  totalPending: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
leadSchema.index({ 'userLocation': '2dsphere' });
leadSchema.index({ userId: 1, createdAt: -1 });
leadSchema.index({ searchKeyword: 1 });

module.exports = mongoose.model('Lead', leadSchema);

