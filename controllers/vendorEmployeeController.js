const VendorEmployee = require('../models/VendorEmployee');
const User = require('../models/User');
const Kyc = require('../models/Kyc');
const { isVendor, isIndividual } = require('../utils/roleHelper');

// Add Individual to Vendor's Team
exports.addIndividual = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    // Check if user is vendor
    if (!isVendor(vendor)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can hire individuals'
      });
    }

    const { individualId, notes } = req.body;

    if (!individualId) {
      return res.status(400).json({
        success: false,
        message: 'Individual ID is required'
      });
    }

    // Check if individual exists and is actually an individual
    const individual = await User.findById(individualId);
    if (!individual) {
      return res.status(404).json({
        success: false,
        message: 'Individual not found'
      });
    }

    if (!isIndividual(individual)) {
      return res.status(400).json({
        success: false,
        message: 'User must be an individual to be hired'
      });
    }

    // Check if vendor is trying to hire themselves
    if (vendorId.toString() === individualId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vendor cannot hire themselves'
      });
    }

    // Check if individual is already hired by this vendor
    const existingHire = await VendorEmployee.findOne({
      vendorId,
      individualId,
      status: { $in: ['active', 'inactive'] }
    });

    if (existingHire) {
      // If previously removed, reactivate
      if (existingHire.status === 'inactive') {
        existingHire.status = 'active';
        existingHire.hiredAt = new Date();
        existingHire.removedAt = null;
        if (notes) existingHire.notes = notes;
        await existingHire.save();

        return res.status(200).json({
          success: true,
          message: 'Individual rehired successfully',
          data: {
            vendorEmployeeId: existingHire._id,
            vendorId: vendor._id,
            vendorName: vendor.name,
            individualId: individual._id,
            individualName: individual.name,
            individualEmail: individual.email,
            status: existingHire.status,
            hiredAt: existingHire.hiredAt
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Individual is already hired by this vendor'
      });
    }

    // Create new hire record
    const vendorEmployee = await VendorEmployee.create({
      vendorId,
      individualId,
      status: 'active',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Individual hired successfully',
      data: {
        vendorEmployeeId: vendorEmployee._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        individualId: individual._id,
        individualName: individual.name,
        individualEmail: individual.email,
        status: vendorEmployee.status,
        hiredAt: vendorEmployee.hiredAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Individual is already hired by this vendor'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to hire individual',
      error: error.message
    });
  }
};

// Remove Individual from Vendor's Team
exports.removeIndividual = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    // Check if user is vendor
    if (!isVendor(vendor)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can remove individuals'
      });
    }

    const { individualId } = req.params;

    if (!individualId) {
      return res.status(400).json({
        success: false,
        message: 'Individual ID is required'
      });
    }

    // Find the hire record
    const vendorEmployee = await VendorEmployee.findOne({
      vendorId,
      individualId,
      status: 'active'
    });

    if (!vendorEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Individual is not hired by this vendor'
      });
    }

    // Get individual details before removing
    const individual = await User.findById(individualId);

    // Mark as removed
    vendorEmployee.status = 'removed';
    vendorEmployee.removedAt = new Date();
    await vendorEmployee.save();

    res.status(200).json({
      success: true,
      message: 'Individual removed successfully',
      data: {
        vendorEmployeeId: vendorEmployee._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        individualId: individual._id,
        individualName: individual.name,
        individualEmail: individual.email,
        status: vendorEmployee.status,
        removedAt: vendorEmployee.removedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove individual',
      error: error.message
    });
  }
};

// Get All Individuals Under Vendor (Active Employees)
exports.getMyEmployees = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    // Check if user is vendor
    if (!isVendor(vendor)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can view their employees'
      });
    }

    const { status } = req.query;
    let filter = { vendorId };

    // Filter by status if provided
    if (status && ['active', 'inactive', 'removed'].includes(status)) {
      filter.status = status;
    } else {
      // Default: show only active employees
      filter.status = 'active';
    }

    const vendorEmployees = await VendorEmployee.find(filter)
      .populate('individualId', 'name email phone role')
      .sort({ hiredAt: -1 });

    const employees = vendorEmployees.map(emp => ({
      vendorEmployeeId: emp._id,
      individualId: emp.individualId._id,
      individualName: emp.individualId.name,
      individualEmail: emp.individualId.email,
      individualPhone: emp.individualId.phone,
      role: emp.individualId.role,
      status: emp.status,
      hiredAt: emp.hiredAt,
      removedAt: emp.removedAt,
      notes: emp.notes
    }));

    res.status(200).json({
      success: true,
      message: 'Employees fetched successfully',
      data: {
        vendorId: vendor._id,
        vendorName: vendor.name,
        totalEmployees: employees.length,
        employees
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
};

// Get Individual Profile (Hired by Vendor)
exports.getIndividualProfile = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    // Check if user is vendor
    if (!isVendor(vendor)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can view individual profiles'
      });
    }

    const { individualId } = req.params;

    if (!individualId) {
      return res.status(400).json({
        success: false,
        message: 'Individual ID is required'
      });
    }

    // Check if individual is hired by this vendor
    const vendorEmployee = await VendorEmployee.findOne({
      vendorId,
      individualId,
      status: 'active'
    });

    if (!vendorEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Individual is not hired by this vendor or is not active'
      });
    }

    // Get individual details
    const individual = await User.findById(individualId).select('name email phone role location');

    if (!individual) {
      return res.status(404).json({
        success: false,
        message: 'Individual not found'
      });
    }

    // Get individual's KYC details
    const kyc = await Kyc.findOne({
      userId: individualId,
      status: 'approved'
    }).select('businessName contactPerson mobileNumber email businessType personalAddress businessAddress');

    // Get individual's services count
    const ServiceCatalog = require('../models/ServiceCatalog');
    const servicesCount = await ServiceCatalog.countDocuments({ vendorId: individualId });

    res.status(200).json({
      success: true,
      message: 'Individual profile fetched successfully',
      data: {
        vendorEmployeeId: vendorEmployee._id,
        hiredAt: vendorEmployee.hiredAt,
        notes: vendorEmployee.notes,
        individual: {
          id: individual._id,
          name: individual.name,
          email: individual.email,
          phone: individual.phone,
          role: individual.role,
          location: individual.location
        },
        kyc: kyc ? {
          businessName: kyc.businessName,
          contactPerson: kyc.contactPerson,
          mobileNumber: kyc.mobileNumber,
          email: kyc.email,
          businessType: kyc.businessType,
          personalAddress: kyc.personalAddress,
          businessAddress: kyc.businessAddress
        } : null,
        servicesCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch individual profile',
      error: error.message
    });
  }
};

// Search Individuals (For Vendors to find individuals to hire)
exports.searchIndividuals = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await User.findById(vendorId);

    // Check if user is vendor
    if (!isVendor(vendor)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can search for individuals'
      });
    }

    const {
      search,
      city,
      state,
      pincode,
      businessName,
      page = 1,
      limit = 10
    } = req.query;

    // Build search query for individuals
    const userQuery = { role: 'individual' };
    
    // Exclude already hired individuals
    const hiredIndividuals = await VendorEmployee.find({
      vendorId,
      status: { $in: ['active', 'inactive'] }
    }).select('individualId');
    
    const hiredIndividualIds = hiredIndividuals.map(emp => emp.individualId);
    if (hiredIndividualIds.length > 0) {
      userQuery._id = { $nin: hiredIndividualIds };
    }

    // Search by name, email, or phone
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by location
    if (city) {
      userQuery['location.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      userQuery['location.state'] = { $regex: state, $options: 'i' };
    }
    if (pincode) {
      userQuery['location.pincode'] = pincode;
    }

    // Get individuals matching user criteria
    const individuals = await User.find(userQuery)
      .select('name email phone role location isVerified')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    // Get KYC details for these individuals
    const individualIds = individuals.map(ind => ind._id);
    const kycs = await Kyc.find({
      userId: { $in: individualIds },
      status: 'approved'
    }).select('userId businessName contactPerson mobileNumber email businessType personalCity personalState personalPincode businessCity businessState businessPincode');

    // Create a map of userId to KYC
    const kycMap = {};
    kycs.forEach(kyc => {
      if (!kycMap[kyc.userId]) {
        kycMap[kyc.userId] = [];
      }
      kycMap[kyc.userId].push(kyc);
    });

    // Filter by business name if provided
    let filteredIndividuals = individuals;
    if (businessName) {
      const matchingKycUserIds = kycs
        .filter(kyc => kyc.businessName && kyc.businessName.toLowerCase().includes(businessName.toLowerCase()))
        .map(kyc => kyc.userId.toString());
      
      filteredIndividuals = individuals.filter(ind => 
        matchingKycUserIds.includes(ind._id.toString())
      );
    }

    // Get service counts for individuals
    const ServiceCatalog = require('../models/ServiceCatalog');
    const serviceCounts = await ServiceCatalog.aggregate([
      { $match: { vendorId: { $in: individualIds } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } }
    ]);

    const serviceCountMap = {};
    serviceCounts.forEach(item => {
      serviceCountMap[item._id.toString()] = item.count;
    });

    // Format response
    const formattedIndividuals = filteredIndividuals.map(individual => {
      const individualKycs = kycMap[individual._id.toString()] || [];
      const servicesCount = serviceCountMap[individual._id.toString()] || 0;

      return {
        individualId: individual._id,
        name: individual.name,
        email: individual.email,
        phone: individual.phone,
        role: individual.role,
        isVerified: individual.isVerified,
        location: individual.location,
        businesses: individualKycs.map(kyc => ({
          businessName: kyc.businessName,
          contactPerson: kyc.contactPerson,
          mobileNumber: kyc.mobileNumber,
          email: kyc.email,
          businessType: kyc.businessType,
          city: kyc.personalCity || kyc.businessCity,
          state: kyc.personalState || kyc.businessState,
          pincode: kyc.personalPincode || kyc.businessPincode
        })),
        servicesCount,
        createdAt: individual.createdAt
      };
    });

    // Get total count
    const total = await User.countDocuments(userQuery);

    res.status(200).json({
      success: true,
      message: 'Individuals found successfully',
      data: {
        individuals: formattedIndividuals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          search: search || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          businessName: businessName || null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search individuals',
      error: error.message
    });
  }
};

