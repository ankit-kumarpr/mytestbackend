const User = require('../models/User');
const Kyc = require('../models/Kyc');
const BusinessKeyword = require('../models/BusinessKeyword');
const LeadResponse = require('../models/LeadResponse');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');

// Get Complete Profile (Common API for User/Vendor/Admin)
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user with basic details
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let profileData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Role-based additional data
    if (user.role === 'vendor') {
      // Vendor specific data
      
      // Get all businesses (KYC)
      const businesses = await Kyc.find({ userId })
        .select('-aadharImage -videoKyc -aadharNumber')
        .sort({ createdAt: -1 });

      // Get keywords count
      const totalKeywords = await BusinessKeyword.countDocuments({ vendorId: userId });

      // Get lead statistics
      const totalLeadsReceived = await LeadResponse.countDocuments({ vendorId: userId });
      const acceptedLeads = await LeadResponse.countDocuments({ vendorId: userId, status: 'accepted' });
      const rejectedLeads = await LeadResponse.countDocuments({ vendorId: userId, status: 'rejected' });
      const pendingLeads = await LeadResponse.countDocuments({ vendorId: userId, status: 'pending' });

      // Get payment statistics
      const totalPayments = await Payment.countDocuments({ vendorId: userId, status: 'success' });
      const totalSpentResult = await Payment.aggregate([
        { $match: { vendorId: userId, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalSpent = totalSpentResult.length > 0 ? (totalSpentResult[0].total / 100).toFixed(2) : '0.00';

      // Recent leads
      const recentLeads = await LeadResponse.find({ vendorId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('leadId', 'searchKeyword description userLocation')
        .populate('businessId', 'businessName city')
        .select('status matchedKeywords distance createdAt respondedAt');

      profileData.vendorData = {
        businesses: businesses.map(b => ({
          _id: b._id,
          businessName: b.businessName,
          gstNumber: b.gstNumber,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
          email: b.email,
          mobileNumber: b.mobileNumber,
          status: b.status,
          location: b.location,
          businessAddress: b.businessAddress,
          workingDays: b.workingDays,
          businessHoursOpen: b.businessHoursOpen,
          businessHoursClose: b.businessHoursClose,
          createdAt: b.createdAt,
          approvedAt: b.approvedAt
        })),
        statistics: {
          totalBusinesses: businesses.length,
          approvedBusinesses: businesses.filter(b => b.status === 'approved').length,
          pendingBusinesses: businesses.filter(b => b.status === 'pending').length,
          rejectedBusinesses: businesses.filter(b => b.status === 'rejected').length,
          totalKeywords,
          leads: {
            total: totalLeadsReceived,
            accepted: acceptedLeads,
            rejected: rejectedLeads,
            pending: pendingLeads,
            acceptanceRate: totalLeadsReceived > 0 
              ? ((acceptedLeads / (acceptedLeads + rejectedLeads)) * 100).toFixed(2) 
              : '0.00'
          },
          payments: {
            totalPayments,
            totalSpent: `₹${totalSpent}`,
            averagePerLead: totalPayments > 0 
              ? `₹${(parseFloat(totalSpent) / totalPayments).toFixed(2)}`
              : '₹0.00'
          }
        },
        recentActivity: recentLeads
      };

      // Profile completion status (Vendor)
      const completionWeights = {
        basicInfo: 20,
        verification: 20,
        kycSubmitted: 20,
        kycApproved: 15,
        keywordsAdded: 10,
        paymentsMade: 5,
        leadResponses: 5,
        acceptedLeads: 5
      };

      const completionCriteria = {
        basicInfo: Boolean(user.name && user.phone),
        verification: Boolean(user.isVerified),
        kycSubmitted: businesses.length > 0,
        kycApproved: businesses.some(b => b.status === 'approved'),
        keywordsAdded: totalKeywords > 0,
        paymentsMade: totalPayments > 0,
        leadResponses: totalLeadsReceived > 0,
        acceptedLeads: acceptedLeads > 0
      };

      const completionPercentage = Object.entries(completionWeights).reduce(
        (sum, [key, weight]) => sum + (completionCriteria[key] ? weight : 0),
        0
      );

      profileData.vendorData.completionStatus = {
        percentage: completionPercentage,
        criteria: completionCriteria
      };

    } else if (user.role === 'user') {
      // User specific data
      
      // Get submitted leads
      const totalLeads = await Lead.countDocuments({ userId });
      const pendingLeads = await Lead.countDocuments({ userId, status: 'pending' });
      const inProgressLeads = await Lead.countDocuments({ userId, status: 'in-progress' });
      const completedLeads = await Lead.countDocuments({ userId, status: 'completed' });
      const cancelledLeads = await Lead.countDocuments({ userId, status: 'cancelled' });

      // Get total responses from vendors
      const leadsWithResponses = await Lead.find({ userId })
        .select('totalVendorsNotified totalAccepted totalRejected totalPending');

      const totalVendorsNotified = leadsWithResponses.reduce((sum, lead) => sum + lead.totalVendorsNotified, 0);
      const totalAccepted = leadsWithResponses.reduce((sum, lead) => sum + lead.totalAccepted, 0);
      const totalRejected = leadsWithResponses.reduce((sum, lead) => sum + lead.totalRejected, 0);

      // Recent leads
      const recentLeads = await Lead.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('searchKeyword description status totalVendorsNotified totalAccepted totalRejected createdAt');

      profileData.userData = {
        statistics: {
          leads: {
            total: totalLeads,
            pending: pendingLeads,
            inProgress: inProgressLeads,
            completed: completedLeads,
            cancelled: cancelledLeads
          },
          responses: {
            totalVendorsNotified,
            totalAccepted,
            totalRejected,
            responseRate: totalVendorsNotified > 0 
              ? ((totalAccepted / totalVendorsNotified) * 100).toFixed(2) 
              : '0.00'
          }
        },
        recentLeads: recentLeads.map(lead => ({
          _id: lead._id,
          searchKeyword: lead.searchKeyword,
          description: lead.description,
          status: lead.status,
          totalVendorsNotified: lead.totalVendorsNotified,
          totalAccepted: lead.totalAccepted,
          totalRejected: lead.totalRejected,
          createdAt: lead.createdAt
        }))
      };

    } else if (user.role === 'admin') {
      // Admin specific data
      
      const totalUsers = await User.countDocuments({ role: 'user' });
      const totalVendors = await User.countDocuments({ role: 'vendor' });
      const totalBusinesses = await Kyc.countDocuments();
      const pendingKyc = await Kyc.countDocuments({ status: 'pending' });
      const approvedKyc = await Kyc.countDocuments({ status: 'approved' });
      const totalLeads = await Lead.countDocuments();
      const totalPayments = await Payment.countDocuments({ status: 'success' });

      profileData.adminData = {
        statistics: {
          users: {
            total: totalUsers,
            verified: await User.countDocuments({ role: 'user', isVerified: true })
          },
          vendors: {
            total: totalVendors,
            verified: await User.countDocuments({ role: 'vendor', isVerified: true })
          },
          businesses: {
            total: totalBusinesses,
            pending: pendingKyc,
            approved: approvedKyc,
            rejected: await Kyc.countDocuments({ status: 'rejected' })
          },
          leads: {
            total: totalLeads,
            active: await Lead.countDocuments({ status: { $in: ['pending', 'in-progress'] } })
          },
          payments: {
            total: totalPayments,
            revenue: await Payment.aggregate([
              { $match: { status: 'success' } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).then(result => result.length > 0 ? `₹${(result[0].total / 100).toFixed(2)}` : '₹0.00')
          }
        }
      };
    }

    res.status(200).json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update Profile (Basic Info)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone } = req.body;

    // Validation
    if (!name && !phone) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name or phone) is required to update'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) {
      // Validate phone number
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits'
        });
      }
      updateData.phone = phone;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

