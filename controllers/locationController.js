const Kyc = require('../models/Kyc');
const User = require('../models/User');

// Update Business Location (Vendor)
exports.updateBusinessLocation = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { businessId } = req.params;
    const { longitude, latitude } = req.body;

    // Validation
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    // Validate coordinates
    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Longitude must be between -180 and 180, Latitude between -90 and 90'
      });
    }

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can update business location'
      });
    }

    // Find business and check ownership
    const business = await Kyc.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.userId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update location for your own business'
      });
    }

    // Update location
    business.location = {
      type: 'Point',
      coordinates: [lon, lat]
    };

    // Build full address if not exists
    if (!business.businessAddress) {
      business.businessAddress = [
        business.plotNo,
        business.buildingName,
        business.street,
        business.area,
        business.city,
        business.state,
        business.pincode
      ].filter(Boolean).join(', ');
    }

    await business.save();

    res.status(200).json({
      success: true,
      message: 'Business location updated successfully',
      data: {
        businessId: business._id,
        businessName: business.businessName,
        location: business.location,
        address: business.businessAddress
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

// Get Business with Location Details (Vendor)
exports.getBusinessLocation = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { businessId } = req.params;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this'
      });
    }

    // Find business
    const business = await Kyc.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.userId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own business'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        businessId: business._id,
        businessName: business.businessName,
        address: {
          plotNo: business.plotNo,
          buildingName: business.buildingName,
          street: business.street,
          area: business.area,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          fullAddress: business.businessAddress
        },
        location: {
          type: business.location?.type || 'Point',
          coordinates: business.location?.coordinates || [0, 0],
          longitude: business.location?.coordinates?.[0] || 0,
          latitude: business.location?.coordinates?.[1] || 0
        },
        hasLocation: business.location?.coordinates?.[0] !== 0 && business.location?.coordinates?.[1] !== 0
      }
    });

  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location',
      error: error.message
    });
  }
};

// Get All Businesses with Location Status (Vendor)
exports.getAllBusinessesLocation = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this'
      });
    }

    // Find all businesses
    const businesses = await Kyc.find({ userId: vendorId });

    const businessesWithLocation = businesses.map(business => ({
      _id: business._id,
      businessName: business.businessName,
      city: business.city,
      state: business.state,
      status: business.status,
      location: {
        longitude: business.location?.coordinates?.[0] || 0,
        latitude: business.location?.coordinates?.[1] || 0
      },
      hasLocation: business.location?.coordinates?.[0] !== 0 && business.location?.coordinates?.[1] !== 0,
      address: business.businessAddress || `${business.area}, ${business.city}, ${business.state}`
    }));

    const totalBusinesses = businessesWithLocation.length;
    const withLocation = businessesWithLocation.filter(b => b.hasLocation).length;
    const withoutLocation = totalBusinesses - withLocation;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalBusinesses,
          withLocation,
          withoutLocation
        },
        businesses: businessesWithLocation
      }
    });

  } catch (error) {
    console.error('Get all businesses location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get businesses',
      error: error.message
    });
  }
};

// Update Business Location by Admin (Manual Set)
exports.updateBusinessLocationByAdmin = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { businessId } = req.params;
    const { longitude, latitude } = req.body;

    // Check if user is admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update business location'
      });
    }

    // Validation
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Find business
    const business = await Kyc.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Update location
    business.location = {
      type: 'Point',
      coordinates: [lon, lat]
    };

    if (!business.businessAddress) {
      business.businessAddress = [
        business.plotNo,
        business.buildingName,
        business.street,
        business.area,
        business.city,
        business.state,
        business.pincode
      ].filter(Boolean).join(', ');
    }

    await business.save();

    res.status(200).json({
      success: true,
      message: 'Business location updated successfully by admin',
      data: {
        businessId: business._id,
        businessName: business.businessName,
        location: business.location
      }
    });

  } catch (error) {
    console.error('Admin update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

