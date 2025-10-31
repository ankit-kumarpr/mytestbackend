const mongoose = require("mongoose");

// Schema for quantity-based pricing (array of quantity ranges with prices)
const QuantityPriceSchema = new mongoose.Schema({
  quantityFrom: {
    type: Number,
    required: true
  },
  quantityTo: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const ServiceCatalogSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  serviceImage: {
    type: String, // file path or URL
    trim: true
  },
  priceType: {
    type: String,
    required: true,
    enum: ['single', 'range', 'quantity']
  },
  // For single price type
  actualPrice: {
    type: Number
  },
  discountPrice: {
    type: Number
  },
  unit: {
    type: String,
    trim: true
  },
  // For price range type
  minPrice: {
    type: Number
  },
  maxPrice: {
    type: Number
  },
  // For quantity based pricing
  quantityPricing: [QuantityPriceSchema],
  description: {
    type: String,
    trim: true
  },
  attachments: [{
    type: String // path/URL to attachment (image/pdf/etc)
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const ServiceCatalog = mongoose.model("ServiceCatalog", ServiceCatalogSchema);

module.exports = ServiceCatalog;

