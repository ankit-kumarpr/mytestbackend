const mongoose = require("mongoose");

const OfferBannerSchema = new mongoose.Schema({
  place: {
    type: String,
    enum: ['top', 'middle', 'bottom'],
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String, // File path/URL (optional during purchase, required for upload)
    trim: true
  },
  link: {
    type: String, // Optional link
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
  duration: {
    type: Number, // Duration in days (7, 14, 21, 30)
    required: true,
    enum: [7, 14, 21, 30]
  },
  price: {
    type: Number, // Price in paise (paid by vendor)
    required: true,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentId: {
    type: String, // Razorpay payment ID
    trim: true
  },
  paymentOrderId: {
    type: String, // Razorpay order ID
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByRole: {
    type: String,
    enum: ['admin', 'superadmin', 'vendor', 'user'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  purchaseDate: {
    type: Date, // When payment was completed - used for ordering (earlier purchase = first)
    default: Date.now
  },
  isBannerUploaded: {
    type: Boolean,
    default: false // True when banner image is uploaded
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

// Index for queries
OfferBannerSchema.index({ place: 1, isActive: 1, startDate: 1, endDate: 1 });
OfferBannerSchema.index({ uploadedBy: 1 });
OfferBannerSchema.index({ paymentStatus: 1 });
OfferBannerSchema.index({ purchaseDate: 1 }); // For ordering by purchase time

// Virtual to check if banner is currently active
OfferBannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.isPaid &&
         this.paymentStatus === 'completed' &&
         this.startDate <= now && 
         this.endDate >= now;
});

const OfferBanner = mongoose.model("OfferBanner", OfferBannerSchema);

module.exports = OfferBanner;

