const User = require('../models/User');

// Add or Update User Location
exports.addOrUpdateLocation = async (req, res) => {
  try {
    const userId = req.user._id; // From authentication middleware
    const {
      latitude,
      longitude,
      streetAddress,
      city,
      state,
      pincode,
      country
    } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate pincode if provided
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be exactly 6 digits'
      });
    }

    // Validate latitude and longitude if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    // Initialize location object if it doesn't exist
    if (!user.location) {
      user.location = {};
    }

    // Update location fields (only if provided)
    if (latitude !== undefined) user.location.latitude = parseFloat(latitude);
    if (longitude !== undefined) user.location.longitude = parseFloat(longitude);
    if (streetAddress !== undefined) user.location.streetAddress = streetAddress;
    if (city !== undefined) user.location.city = city;
    if (state !== undefined) user.location.state = state;
    if (pincode !== undefined) user.location.pincode = pincode;
    if (country !== undefined) user.location.country = country;

    // Save user
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: user.location
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

// Get User Location
exports.getUserLocation = async (req, res) => {
  try {
    const userId = req.user._id; // From authentication middleware

    // Find user
    const user = await User.findById(userId).select('name email phone location');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        location: user.location || {
          latitude: null,
          longitude: null,
          streetAddress: null,
          city: null,
          state: null,
          pincode: null,
          country: 'India'
        }
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

// Delete User Location
exports.deleteUserLocation = async (req, res) => {
  try {
    const userId = req.user._id; // From authentication middleware

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Clear location
    user.location = {
      latitude: undefined,
      longitude: undefined,
      streetAddress: undefined,
      city: undefined,
      state: undefined,
      pincode: undefined,
      country: 'India'
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message
    });
  }
};

// Get User Profile with Location (for any user - by userId)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId).select('name email phone role location createdAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt
        },
        location: user.location || null
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

