const User = require('../models/User');
const Kyc = require('../models/Kyc');
const BusinessKeyword = require('../models/BusinessKeyword');
const Lead = require('../models/Lead');
const LeadResponse = require('../models/LeadResponse');
const Payment = require('../models/Payment');

// Get All Users with Filters (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { page = 1, limit = 20, search, isVerified, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this'
      });
    }

    // Build query
    const query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    // Sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get lead statistics for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const totalLeads = await Lead.countDocuments({ userId: user._id });
      const acceptedLeads = await Lead.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, total: { $sum: '$totalAccepted' } } }
      ]);

      return {
        ...user.toObject(),
        statistics: {
          totalLeads,
          totalAcceptedResponses: acceptedLeads.length > 0 ? acceptedLeads[0].total : 0
        }
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Get Specific User Complete Details (Admin)
exports.getUserDetails = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { userId } = req.params;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this'
      });
    }

    // Get user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all leads submitted by user
    const leads = await Lead.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Get lead statistics
    const totalLeads = await Lead.countDocuments({ userId });
    const pendingLeads = await Lead.countDocuments({ userId, status: 'pending' });
    const inProgressLeads = await Lead.countDocuments({ userId, status: 'in-progress' });
    const completedLeads = await Lead.countDocuments({ userId, status: 'completed' });

    // Get all responses
    const allResponses = await Lead.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalNotified: { $sum: '$totalVendorsNotified' },
          totalAccepted: { $sum: '$totalAccepted' },
          totalRejected: { $sum: '$totalRejected' }
        }
      }
    ]);

    const responseStats = allResponses.length > 0 ? allResponses[0] : {
      totalNotified: 0,
      totalAccepted: 0,
      totalRejected: 0
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        statistics: {
          leads: {
            total: totalLeads,
            pending: pendingLeads,
            inProgress: inProgressLeads,
            completed: completedLeads,
            cancelled: await Lead.countDocuments({ userId, status: 'cancelled' })
          },
          responses: {
            totalVendorsNotified: responseStats.totalNotified,
            totalAccepted: responseStats.totalAccepted,
            totalRejected: responseStats.totalRejected,
            responseRate: responseStats.totalNotified > 0 
              ? ((responseStats.totalAccepted / responseStats.totalNotified) * 100).toFixed(2) 
              : '0.00'
          }
        },
        recentLeads: leads.slice(0, 10).map(lead => ({
          _id: lead._id,
          searchKeyword: lead.searchKeyword,
          description: lead.description,
          status: lead.status,
          totalVendorsNotified: lead.totalVendorsNotified,
          totalAccepted: lead.totalAccepted,
          totalRejected: lead.totalRejected,
          createdAt: lead.createdAt
        })),
        allLeads: leads
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message
    });
  }
};

// Get All Vendors with Filters (Admin)
exports.getAllVendors = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { page = 1, limit = 20, search, isVerified, hasApprovedBusiness, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this'
      });
    }

    // Build query
    const query = { role: 'vendor' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    // Sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    const vendors = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get statistics for each vendor
    const vendorsWithStats = await Promise.all(vendors.map(async (vendor) => {
      const totalBusinesses = await Kyc.countDocuments({ userId: vendor._id });
      const approvedBusinesses = await Kyc.countDocuments({ userId: vendor._id, status: 'approved' });
      const pendingBusinesses = await Kyc.countDocuments({ userId: vendor._id, status: 'pending' });
      const totalKeywords = await BusinessKeyword.countDocuments({ vendorId: vendor._id });
      const totalLeads = await LeadResponse.countDocuments({ vendorId: vendor._id });
      const acceptedLeads = await LeadResponse.countDocuments({ vendorId: vendor._id, status: 'accepted' });
      const totalPayments = await Payment.countDocuments({ vendorId: vendor._id, status: 'success' });
      
      const totalSpentResult = await Payment.aggregate([
        { $match: { vendorId: vendor._id, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      return {
        ...vendor.toObject(),
        statistics: {
          businesses: {
            total: totalBusinesses,
            approved: approvedBusinesses,
            pending: pendingBusinesses
          },
          keywords: totalKeywords,
          leads: {
            total: totalLeads,
            accepted: acceptedLeads
          },
          payments: {
            total: totalPayments,
            spent: totalSpentResult.length > 0 ? `₹${(totalSpentResult[0].total / 100).toFixed(2)}` : '₹0.00'
          }
        }
      };
    }));

    // Apply additional filter
    let filteredVendors = vendorsWithStats;
    if (hasApprovedBusiness === 'true') {
      filteredVendors = vendorsWithStats.filter(v => v.statistics.businesses.approved > 0);
    } else if (hasApprovedBusiness === 'false') {
      filteredVendors = vendorsWithStats.filter(v => v.statistics.businesses.approved === 0);
    }

    res.status(200).json({
      success: true,
      data: {
        vendors: filteredVendors,
        pagination: {
          total: filteredVendors.length,
          page: parseInt(page),
          pages: Math.ceil(filteredVendors.length / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendors',
      error: error.message
    });
  }
};

// Get Specific Vendor Complete Details (Admin)
exports.getVendorDetails = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { vendorId } = req.params;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this'
      });
    }

    // Get vendor
    const vendor = await User.findById(vendorId).select('-password');
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get all businesses
    const businesses = await Kyc.find({ userId: vendorId })
      .sort({ createdAt: -1 });

    // Get all keywords
    const keywords = await BusinessKeyword.find({ vendorId })
      .populate('businessId', 'businessName')
      .sort({ createdAt: -1 });

    // Get lead responses
    const leadResponses = await LeadResponse.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('leadId', 'searchKeyword description userLocation')
      .populate('businessId', 'businessName');

    // Get payment history
    const payments = await Payment.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'leadResponseId',
        populate: {
          path: 'leadId',
          select: 'searchKeyword'
        }
      });

    // Statistics
    const totalLeads = await LeadResponse.countDocuments({ vendorId });
    const acceptedLeads = await LeadResponse.countDocuments({ vendorId, status: 'accepted' });
    const rejectedLeads = await LeadResponse.countDocuments({ vendorId, status: 'rejected' });
    const pendingLeads = await LeadResponse.countDocuments({ vendorId, status: 'pending' });

    const totalPayments = await Payment.countDocuments({ vendorId, status: 'success' });
    const totalSpentResult = await Payment.aggregate([
      { $match: { vendorId: vendor._id, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          role: vendor.role,
          isVerified: vendor.isVerified,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt
        },
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
          createdAt: b.createdAt,
          approvedAt: b.approvedAt,
          rejectedAt: b.rejectedAt,
          rejectionReason: b.rejectionReason
        })),
        keywords: keywords.map(k => ({
          _id: k._id,
          keyword: k.keyword,
          businessName: k.businessId?.businessName,
          createdAt: k.createdAt
        })),
        statistics: {
          businesses: {
            total: businesses.length,
            approved: businesses.filter(b => b.status === 'approved').length,
            pending: businesses.filter(b => b.status === 'pending').length,
            rejected: businesses.filter(b => b.status === 'rejected').length
          },
          keywords: keywords.length,
          leads: {
            total: totalLeads,
            accepted: acceptedLeads,
            rejected: rejectedLeads,
            pending: pendingLeads,
            acceptanceRate: totalLeads > 0 
              ? ((acceptedLeads / (acceptedLeads + rejectedLeads)) * 100).toFixed(2) 
              : '0.00'
          },
          payments: {
            total: totalPayments,
            totalSpent: totalSpentResult.length > 0 ? `₹${(totalSpentResult[0].total / 100).toFixed(2)}` : '₹0.00',
            averagePerLead: totalPayments > 0 
              ? `₹${((totalSpentResult[0]?.total || 0) / 100 / totalPayments).toFixed(2)}`
              : '₹0.00'
          }
        },
        recentLeads: leadResponses.slice(0, 10),
        recentPayments: payments.slice(0, 10),
        allLeads: leadResponses,
        allPayments: payments
      }
    });

  } catch (error) {
    console.error('Get vendor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor details',
      error: error.message
    });
  }
};

// Get Platform Statistics (Admin Dashboard)
exports.getPlatformStatistics = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this'
      });
    }

    // Users
    const totalUsers = await User.countDocuments({ role: 'user' });
    const verifiedUsers = await User.countDocuments({ role: 'user', isVerified: true });

    // Vendors
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const verifiedVendors = await User.countDocuments({ role: 'vendor', isVerified: true });

    // Businesses
    const totalBusinesses = await Kyc.countDocuments();
    const approvedBusinesses = await Kyc.countDocuments({ status: 'approved' });
    const pendingBusinesses = await Kyc.countDocuments({ status: 'pending' });
    const rejectedBusinesses = await Kyc.countDocuments({ status: 'rejected' });

    // Keywords
    const totalKeywords = await BusinessKeyword.countDocuments();

    // Leads
    const totalLeads = await Lead.countDocuments();
    const pendingLeads = await Lead.countDocuments({ status: 'pending' });
    const inProgressLeads = await Lead.countDocuments({ status: 'in-progress' });
    const completedLeads = await Lead.countDocuments({ status: 'completed' });

    // Lead Responses
    const totalResponses = await LeadResponse.countDocuments();
    const acceptedResponses = await LeadResponse.countDocuments({ status: 'accepted' });
    const rejectedResponses = await LeadResponse.countDocuments({ status: 'rejected' });
    const pendingResponses = await LeadResponse.countDocuments({ status: 'pending' });

    // Payments
    const totalPayments = await Payment.countDocuments({ status: 'success' });
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? (revenueResult[0].total / 100).toFixed(2) : '0.00';

    // Recent activity
    const recentUsers = await User.find({ role: 'user' })
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentVendors = await User.find({ role: 'vendor' })
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentBusinesses = await Kyc.find()
      .select('businessName status createdAt')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentLeads = await Lead.find()
      .select('searchKeyword status createdAt totalVendorsNotified')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            verified: verifiedUsers,
            unverified: totalUsers - verifiedUsers
          },
          vendors: {
            total: totalVendors,
            verified: verifiedVendors,
            unverified: totalVendors - verifiedVendors
          },
          businesses: {
            total: totalBusinesses,
            approved: approvedBusinesses,
            pending: pendingBusinesses,
            rejected: rejectedBusinesses
          },
          keywords: {
            total: totalKeywords
          },
          leads: {
            total: totalLeads,
            pending: pendingLeads,
            inProgress: inProgressLeads,
            completed: completedLeads,
            cancelled: await Lead.countDocuments({ status: 'cancelled' })
          },
          responses: {
            total: totalResponses,
            accepted: acceptedResponses,
            rejected: rejectedResponses,
            pending: pendingResponses,
            acceptanceRate: totalResponses > 0 
              ? ((acceptedResponses / (acceptedResponses + rejectedResponses)) * 100).toFixed(2) 
              : '0.00'
          },
          payments: {
            total: totalPayments,
            revenue: `₹${totalRevenue}`,
            averagePerTransaction: totalPayments > 0 
              ? `₹${(parseFloat(totalRevenue) / totalPayments).toFixed(2)}`
              : '₹0.00'
          }
        },
        recentActivity: {
          users: recentUsers,
          vendors: recentVendors,
          businesses: recentBusinesses,
          leads: recentLeads
        }
      }
    });

  } catch (error) {
    console.error('Get platform statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform statistics',
      error: error.message
    });
  }
};

