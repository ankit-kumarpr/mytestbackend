const express = require('express');
const router = express.Router();
const {
  createLeadAcceptanceOrder,
  verifyPaymentAndAcceptLead,
  rejectLead,
  getVendorPaymentHistory
} = require('../controllers/paymentController');
const { authenticate } = require('../middelware/auth');

// All routes are protected (vendor only)

// Create Razorpay order for lead acceptance (9 Rs payment)
router.post('/create-order/:leadResponseId', authenticate, createLeadAcceptanceOrder);

// Verify payment and accept lead
router.post('/verify-and-accept/:leadResponseId', authenticate, verifyPaymentAndAcceptLead);

// Reject lead (no payment required)
router.post('/reject/:leadResponseId', authenticate, rejectLead);

// Get payment history
router.get('/history', authenticate, getVendorPaymentHistory);

module.exports = router;

