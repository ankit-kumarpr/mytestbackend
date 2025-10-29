const mongoose = require("mongoose");

const VendorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  socialMediaLinks: {
    facebook: {
      type: String,
      trim: true,
      default: ''
    },
    instagram: {
      type: String,
      trim: true,
      default: ''
    },
    twitter: {
      type: String,
      trim: true,
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      default: ''
    },
    youtube: {
      type: String,
      trim: true,
      default: ''
    }
  },
  businessPhotos: [{
    type: String, // File paths
    trim: true
  }],
  businessVideo: {
    type: String, // File path
    trim: true,
    default: ''
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

const VendorProfile = mongoose.model("VendorProfile", VendorProfileSchema);

module.exports = VendorProfile;

