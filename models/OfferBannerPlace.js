const mongoose = require("mongoose");

const OfferBannerPlaceSchema = new mongoose.Schema({
  place: {
    type: String,
    enum: ['top', 'middle', 'bottom'],
    required: true,
    unique: true
  },
  price7Days: {
    type: Number, // Price in paise (for Razorpay)
    required: true,
    default: 0
  },
  price14Days: {
    type: Number,
    required: true,
    default: 0
  },
  price21Days: {
    type: Number,
    required: true,
    default: 0
  },
  price30Days: {
    type: Number, // 1 month
    required: true,
    default: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

const OfferBannerPlace = mongoose.model("OfferBannerPlace", OfferBannerPlaceSchema);

module.exports = OfferBannerPlace;

