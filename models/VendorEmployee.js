const mongoose = require("mongoose");

const VendorEmployeeSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  individualId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'removed'],
    default: 'active'
  },
  hiredAt: {
    type: Date,
    default: Date.now
  },
  removedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Ensure a vendor can only hire an individual once (unique combination)
VendorEmployeeSchema.index({ vendorId: 1, individualId: 1 }, { unique: true });

// Index for active employees
VendorEmployeeSchema.index({ vendorId: 1, status: 1 });

const VendorEmployee = mongoose.model("VendorEmployee", VendorEmployeeSchema);

module.exports = VendorEmployee;

