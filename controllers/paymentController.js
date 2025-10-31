const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const LeadResponse = require('../models/LeadResponse');
const Lead = require('../models/Lead');
const User = require('../models/User');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order for Lead Acceptance (Vendor)
exports.createLeadAcceptanceOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { leadResponseId } = req.params;

    // Check if user is vendor
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can accept leads'
      });
    }

    // Find lead response
    const leadResponse = await LeadResponse.findById(leadResponseId)
      .populate('leadId', 'searchKeyword description')
      .populate('businessId', 'businessName');

    if (!leadResponse) {
      return res.status(404).json({
        success: false,
        message: 'Lead response not found'
      });
    }

    // Check ownership
    if (leadResponse.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept your own leads'
      });
    }

    // Check if already responded
    if (leadResponse.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This lead has already been ${leadResponse.status}`
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      leadResponseId,
      status: { $in: ['created', 'pending', 'success'] }
    });

    if (existingPayment && existingPayment.status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this lead'
      });
    }

    // Create Razorpay order
    const amount = 900; // 9 Rs in paise
    const currency = 'INR';

    const options = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: `lead_accept_${leadResponseId}_${Date.now()}`,
      notes: {
        leadResponseId: leadResponseId.toString(),
        vendorId: vendorId.toString(),
        businessId: leadResponse.businessId._id.toString(),
        leadKeyword: leadResponse.leadId.searchKeyword,
        purpose: 'lead_acceptance'
      }
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      vendorId,
      leadResponseId,
      razorpayOrderId: order.id,
      amount,
      currency,
      status: 'created'
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: order.id,
        amount: amount,
        amountRs: (amount / 100).toFixed(2),
        currency: currency,
        leadDetails: {
          keyword: leadResponse.leadId.searchKeyword,
          description: leadResponse.leadId.description,
          business: leadResponse.businessId.businessName
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment._id
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify Payment and Accept Lead (Vendor)
exports.verifyPaymentAndAcceptLead = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { leadResponseId } = req.params;
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      notes 
    } = req.body;

    // Validation
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment details are required'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({
      leadResponseId,
      razorpayOrderId,
      vendorId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      // Invalid signature
      payment.status = 'failed';
      payment.notes = 'Payment verification failed - Invalid signature';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Signature verified - Update payment
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'success';
    await payment.save();

    // Find and update lead response
    const leadResponse = await LeadResponse.findById(leadResponseId);
    
    if (!leadResponse) {
      return res.status(404).json({
        success: false,
        message: 'Lead response not found'
      });
    }

    // Update lead response to accepted
    leadResponse.status = 'accepted';
    leadResponse.respondedAt = new Date();
    if (notes) {
      leadResponse.notes = notes;
    }
    await leadResponse.save();

    // Update lead statistics
    const lead = await Lead.findById(leadResponse.leadId);
    if (lead) {
      lead.totalAccepted += 1;
      lead.totalPending -= 1;
      if (lead.status === 'pending') {
        lead.status = 'in-progress';
      }
      await lead.save();
    }

    // Populate and return
    const populatedResponse = await LeadResponse.findById(leadResponseId)
      .populate('leadId')
      .populate('businessId', 'businessName city state')
      .populate({
        path: 'leadId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    res.status(200).json({
      success: true,
      message: 'Payment verified and lead accepted successfully',
      data: {
        payment: {
          id: payment._id,
          orderId: payment.razorpayOrderId,
          paymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          amountRs: (payment.amount / 100).toFixed(2),
          status: payment.status
        },
        leadResponse: populatedResponse
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Reject Lead (Free - No Payment)
exports.rejectLead = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { leadResponseId } = req.params;
    const { notes } = req.body;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can reject leads'
      });
    }

    // Find lead response
    const leadResponse = await LeadResponse.findById(leadResponseId);
    if (!leadResponse) {
      return res.status(404).json({
        success: false,
        message: 'Lead response not found'
      });
    }

    // Check ownership
    if (leadResponse.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject your own leads'
      });
    }

    // Check if already responded
    if (leadResponse.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This lead has already been ${leadResponse.status}`
      });
    }

    // Update lead response to rejected (NO PAYMENT NEEDED)
    leadResponse.status = 'rejected';
    leadResponse.respondedAt = new Date();
    if (notes) {
      leadResponse.notes = notes;
    }
    await leadResponse.save();

    // Update lead statistics
    const lead = await Lead.findById(leadResponse.leadId);
    if (lead) {
      lead.totalRejected += 1;
      lead.totalPending -= 1;
      await lead.save();
    }

    // Populate and return
    const populatedResponse = await LeadResponse.findById(leadResponseId)
      .populate('leadId', 'searchKeyword description')
      .populate('businessId', 'businessName city state');

    res.status(200).json({
      success: true,
      message: 'Lead rejected successfully (No payment required)',
      data: populatedResponse
    });

  } catch (error) {
    console.error('Reject lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject lead',
      error: error.message
    });
  }
};

// Get Vendor Payment History
exports.getVendorPaymentHistory = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this'
      });
    }

    const query = { vendorId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('leadResponseId', 'matchedKeywords distance')
      .populate({
        path: 'leadResponseId',
        populate: [
          { path: 'leadId', select: 'searchKeyword description' },
          { path: 'businessId', select: 'businessName' }
        ]
      });

    const total = await Payment.countDocuments(query);

    // Calculate total spent
    const totalSpent = await Payment.aggregate([
      { $match: { vendorId: vendorId, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        totalSpent: totalSpent.length > 0 ? (totalSpent[0].total / 100).toFixed(2) : '0.00',
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
};

