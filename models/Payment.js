const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadResponseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadResponse',
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    required: true, // Amount in paise (900 paise = 9 Rs)
    default: 900
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'success', 'failed'],
    default: 'created'
  },
  paymentMethod: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ vendorId: 1, createdAt: -1 });
paymentSchema.index({ leadResponseId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

