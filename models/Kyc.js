const mongoose = require("mongoose");

const KycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Removed unique: true to allow multiple businesses per user
  },
  
  // Business Details
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['vendor', 'individual'],
    default: function() {
      // Auto-detect: if GST exists, it's vendor, else individual
      return this.gstNumber && this.gstNumber.trim() ? 'vendor' : 'individual';
    }
  },
  
  // Business Address (for vendor or individual with GST)
  businessPlotNo: {
    type: String,
    trim: true
  },
  businessBuildingName: {
    type: String,
    trim: true
  },
  businessStreet: {
    type: String,
    trim: true
  },
  businessLandmark: {
    type: String,
    trim: true
  },
  businessArea: {
    type: String,
    trim: true
  },
  businessPincode: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{6}$/.test(v);
      },
      message: 'Business pincode must be exactly 6 digits'
    }
  },
  businessState: {
    type: String,
    trim: true
  },
  businessCity: {
    type: String,
    trim: true
  },
  businessAddress: {
    type: String,
    trim: true
  },
  
  // Personal Address (for individual without GST or when different from business)
  personalPlotNo: {
    type: String,
    trim: true
  },
  personalBuildingName: {
    type: String,
    trim: true
  },
  personalStreet: {
    type: String,
    trim: true
  },
  personalLandmark: {
    type: String,
    trim: true
  },
  personalArea: {
    type: String,
    trim: true
  },
  personalPincode: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{6}$/.test(v);
      },
      message: 'Personal pincode must be exactly 6 digits'
    }
  },
  personalState: {
    type: String,
    trim: true
  },
  personalCity: {
    type: String,
    trim: true
  },
  personalAddress: {
    type: String,
    trim: true
  },
  
  // Legacy Address Fields (for backward compatibility - will be migrated)
  plotNo: {
    type: String,
    trim: true
  },
  buildingName: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  area: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{6}$/.test(v);
      },
      message: 'Pincode must be exactly 6 digits'
    }
  },
  state: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  
  // Location (Geospatial for radius search)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  
  // Old fields (for backward compatibility - will be migrated to location object)
  latitude: {
    type: String
  },
  longitude: {
    type: String
  },
  
  // Personal Data
  title: {
    type: String,
    enum: ['Mr', 'Mrs', 'Miss', 'Dr', 'Prof'],
    required: true
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 digits'
    }
  },
  whatsappNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'WhatsApp number must be exactly 10 digits'
    }
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // Working Days (array of selected days)
  workingDays: {
    type: [String],
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one working day must be selected'
    }
  },
  
  // Business Hours
  businessHoursOpen: {
    type: String,
    required: true
  },
  businessHoursClose: {
    type: String,
    required: true
  },
  
  // Documents
  aadharNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{12}$/.test(v);
      },
      message: 'Aadhar number must be exactly 12 digits'
    }
  },
  aadharImage: {
    type: String, // File path/URL
    required: true
  },
  videoKyc: {
    type: String, // File path/URL
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Rejection details
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  rejectedAt: {
    type: Date
  },
  
  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
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

// Geospatial index for location-based queries
KycSchema.index({ location: '2dsphere' });
KycSchema.index({ status: 1, location: 1 });

const Kyc = mongoose.model("Kyc", KycSchema);

module.exports = Kyc;

