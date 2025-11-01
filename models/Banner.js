const mongoose = require("mongoose");

const BannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String, // File path/URL
    required: true,
    trim: true
  },
  link: {
    type: String, // Optional link when banner is clicked
    trim: true,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0 // Lower number = higher priority/display first
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Index for active banners query
BannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
BannerSchema.index({ displayOrder: 1 });

// Virtual to check if banner is currently active based on dates
BannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now;
});

// Method to check if banner is valid
BannerSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now &&
         this.startDate <= this.endDate;
};

const Banner = mongoose.model("Banner", BannerSchema);

module.exports = Banner;

