const Kyc = require('../models/Kyc');
const User = require('../models/User');
const { sendMail, kycSubmissionTemplate, kycApprovalTemplate, kycRejectionTemplate } = require('../utils/email');
const path = require('path');
const axios = require('axios');

// Helper function to get coordinates from address using Google Geocoding API or Positionstack
const getCoordinatesFromAddress = async (addressComponents) => {
  try {
    // Build full address string
    const fullAddress = [
      addressComponents.plotNo,
      addressComponents.buildingName,
      addressComponents.street,
      addressComponents.area,
      addressComponents.city,
      addressComponents.state,
      addressComponents.pincode,
      'India'
    ].filter(Boolean).join(', ');

    console.log('Geocoding address:', fullAddress);

    // Try Google Maps API first (if key available)
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: fullAddress,
            key: process.env.GOOGLE_MAPS_API_KEY,
            region: 'in'
          },
          timeout: 5000
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          console.log('Google Geocoding successful:', location);
          return {
            longitude: location.lng,
            latitude: location.lat,
            address: fullAddress
          };
        }
      } catch (googleError) {
        console.warn('Google Geocoding failed:', googleError.message);
      }
    }

    // Try Positionstack API as fallback (if key available)
    if (process.env.POSITIONSTACK_API_KEY) {
      try {
        const response = await axios.get('http://api.positionstack.com/v1/forward', {
          params: {
            access_key: process.env.POSITIONSTACK_API_KEY,
            query: fullAddress,
            country: 'IN',
            limit: 1
          },
          timeout: 5000
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
          const location = response.data.data[0];
          console.log('Positionstack Geocoding successful:', location);
          return {
            longitude: location.longitude,
            latitude: location.latitude,
            address: fullAddress
          };
        }
      } catch (positionstackError) {
        console.warn('Positionstack Geocoding failed:', positionstackError.message);
      }
    }

    // Final fallback: Use India's approximate center
    console.warn('No geocoding API available or all failed. Using approximate location for India.');
    return {
      longitude: 78.9629,
      latitude: 20.5937,
      address: fullAddress
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    // Return approximate center of India as fallback
    return {
      longitude: 78.9629,
      latitude: 20.5937,
      address: [
        addressComponents.plotNo,
        addressComponents.buildingName,
        addressComponents.street,
        addressComponents.area,
        addressComponents.city,
        addressComponents.state,
        addressComponents.pincode
      ].filter(Boolean).join(', ')
    };
  }
};

// Submit KYC/Business Registration (Multiple businesses allowed)
exports.submitKyc = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate required fields first
    const {
      businessName,
      gstNumber,
      // Legacy address fields (for backward compatibility)
      plotNo,
      buildingName,
      street,
      landmark,
      area,
      pincode,
      state,
      city,
      // New business address fields
      businessPlotNo,
      businessBuildingName,
      businessStreet,
      businessLandmark,
      businessArea,
      businessPincode,
      businessState,
      businessCity,
      businessAddress,
      // Personal address fields
      personalPlotNo,
      personalBuildingName,
      personalStreet,
      personalLandmark,
      personalArea,
      personalPincode,
      personalState,
      personalCity,
      personalAddress,
      // Location coordinates (optional - if provided, will override geocoding)
      longitude,
      latitude,
      title,
      contactPerson,
      mobileNumber,
      whatsappNumber,
      email,
      workingDays,
      businessHoursOpen,
      businessHoursClose,
      aadharNumber
    } = req.body;

    // Determine business type based on GST
    const hasGst = gstNumber && gstNumber.trim();
    const businessType = hasGst ? 'vendor' : 'individual';

    // Validation - Basic required fields
    if (!businessName || !title || !contactPerson || 
        !mobileNumber || !email || !workingDays || !businessHoursOpen || !businessHoursClose || 
        !aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Address validation based on GST
    if (hasGst) {
      // Vendor: Business address is required
      const businessAddressFields = businessPincode || businessState || businessCity || 
                                    businessPlotNo || businessBuildingName || businessStreet ||
                                    businessArea || businessAddress;
      const legacyAddressFields = pincode || state || city || plotNo || buildingName || street || area;
      
      if (!businessAddressFields && !legacyAddressFields) {
        return res.status(400).json({
          success: false,
          message: 'Business address is required when GST number is provided'
        });
      }
    } else {
      // Individual: Personal address is required
      const personalAddressFields = personalPincode || personalState || personalCity ||
                                    personalPlotNo || personalBuildingName || personalStreet ||
                                    personalArea || personalAddress;
      const legacyAddressFields = pincode || state || city || plotNo || buildingName || street || area;
      
      if (!personalAddressFields && !legacyAddressFields) {
        return res.status(400).json({
          success: false,
          message: 'Personal address is required when GST number is not provided'
        });
      }
    }

    // Validation - Latitude and Longitude are mandatory (must come from frontend)
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and Latitude are required fields. Please provide valid coordinates from frontend.'
      });
    }

    // Check if same business name already exists for this user
    let existingBusiness = null;
    if (businessName) {
      existingBusiness = await Kyc.findOne({ 
        userId, 
        businessName: businessName.trim() 
      });
      
      if (existingBusiness && existingBusiness.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'KYC for this business name is already submitted and pending review'
        });
      }

      if (existingBusiness && existingBusiness.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'KYC for this business name is already approved'
        });
      }
      // If status is 'rejected', allow resubmission (will update the existing one)
    }

    // Get user
    const user = await User.findById(userId);

    // Files should already be validated by middleware
    if (!req.files || !req.files.aadharImage || req.files.aadharImage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aadhar image is required'
      });
    }

    if (!req.files || !req.files.videoKyc || req.files.videoKyc.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Video KYC is required'
      });
    }

    // Validate file sizes
    const aadharFile = req.files.aadharImage[0];
    const videoFile = req.files.videoKyc[0];
    const fs = require('fs');

    if (aadharFile.size > 5 * 1024 * 1024) {
      // Clean up files
      fs.unlinkSync(aadharFile.path);
      fs.unlinkSync(videoFile.path);
      return res.status(400).json({
        success: false,
        message: 'Aadhar image size must be less than 5MB'
      });
    }

    if (videoFile.size > 50 * 1024 * 1024) {
      // Clean up files
      fs.unlinkSync(aadharFile.path);
      fs.unlinkSync(videoFile.path);
      return res.status(400).json({
        success: false,
        message: 'Video KYC size must be less than 50MB'
      });
    }

    // Parse workingDays if it comes as a string (from form-data)
    let parsedWorkingDays = workingDays;
    if (typeof workingDays === 'string') {
      try {
        parsedWorkingDays = JSON.parse(workingDays);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid workingDays format. Send as JSON array string: ["Monday","Tuesday",...]'
        });
      }
    }

    if (!Array.isArray(parsedWorkingDays) || parsedWorkingDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one working day must be selected'
      });
    }

    // Validate working days
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const invalidDays = parsedWorkingDays.filter(day => !validDays.includes(day));
    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid working days provided'
      });
    }

    // Get file paths (relative to uploads directory)
    const aadharImagePath = `/uploads/aadhar/${req.files.aadharImage[0].filename}`;
    const videoKycPath = `/uploads/video/${req.files.videoKyc[0].filename}`;

    // Determine which address to use for geocoding (business address for search/radius)
    let addressForGeocoding;
    if (hasGst) {
      // Vendor: Use business address
      if (businessPincode || businessState || businessCity) {
        addressForGeocoding = {
          plotNo: businessPlotNo || plotNo || '',
          buildingName: businessBuildingName || buildingName || '',
          street: businessStreet || street || '',
          area: businessArea || area || '',
          city: businessCity || city || '',
          state: businessState || state || '',
          pincode: businessPincode || pincode || ''
        };
      } else {
        // Fallback to legacy fields
        addressForGeocoding = {
          plotNo: plotNo || '',
          buildingName: buildingName || '',
          street: street || '',
          area: area || '',
          city: city || '',
          state: state || '',
          pincode: pincode || ''
        };
      }
    } else {
      // Individual: Use personal address for geocoding (or business if provided)
      if (personalPincode || personalState || personalCity) {
        addressForGeocoding = {
          plotNo: personalPlotNo || '',
          buildingName: personalBuildingName || '',
          street: personalStreet || '',
          area: personalArea || '',
          city: personalCity || '',
          state: personalState || '',
          pincode: personalPincode || ''
        };
      } else if (businessPincode || businessState || businessCity) {
        // If business address provided, use that
        addressForGeocoding = {
          plotNo: businessPlotNo || '',
          buildingName: businessBuildingName || '',
          street: businessStreet || '',
          area: businessArea || '',
          city: businessCity || '',
          state: businessState || '',
          pincode: businessPincode || ''
        };
      } else {
        // Fallback to legacy fields
        addressForGeocoding = {
          plotNo: plotNo || '',
          buildingName: buildingName || '',
          street: street || '',
          area: area || '',
          city: city || '',
          state: state || '',
          pincode: pincode || ''
        };
      }
    }

    // Get coordinates - longitude and latitude are mandatory from frontend
    let locationData;
    
    // Longitude and latitude are mandatory, use them directly from frontend
    const fullAddress = [
      addressForGeocoding.plotNo,
      addressForGeocoding.buildingName,
      addressForGeocoding.street,
      addressForGeocoding.area,
      addressForGeocoding.city,
      addressForGeocoding.state,
      addressForGeocoding.pincode,
      'India'
    ].filter(Boolean).join(', ');
    
    locationData = {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      address: fullAddress
    };
    console.log('Using provided coordinates from frontend:', locationData);

    // Create or update KYC
    const kycData = {
      userId,
      businessName,
      gstNumber: gstNumber ? gstNumber.trim() : '',
      businessType,
      // Business Address (for vendor or individual with GST)
      businessPlotNo: businessPlotNo || plotNo || '',
      businessBuildingName: businessBuildingName || buildingName || '',
      businessStreet: businessStreet || street || '',
      businessLandmark: businessLandmark || landmark || '',
      businessArea: businessArea || area || '',
      businessPincode: businessPincode || pincode || '',
      businessState: businessState || state || '',
      businessCity: businessCity || city || '',
      businessAddress: businessAddress || locationData.address,
      // Personal Address (for individual without GST)
      personalPlotNo: personalPlotNo || '',
      personalBuildingName: personalBuildingName || '',
      personalStreet: personalStreet || '',
      personalLandmark: personalLandmark || '',
      personalArea: personalArea || '',
      personalPincode: personalPincode || '',
      personalState: personalState || '',
      personalCity: personalCity || '',
      personalAddress: personalAddress || '',
      // Legacy fields (for backward compatibility)
      plotNo: plotNo || '',
      buildingName: buildingName || '',
      street: street || '',
      landmark: landmark || '',
      area: area || '',
      pincode: pincode || businessPincode || personalPincode || '',
      state: state || businessState || personalState || '',
      city: city || businessCity || personalCity || '',
      location: {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude]
      },
      title,
      contactPerson,
      mobileNumber,
      whatsappNumber: whatsappNumber || mobileNumber,
      email,
      workingDays: parsedWorkingDays,
      businessHoursOpen,
      businessHoursClose,
      aadharNumber,
      aadharImage: aadharImagePath,
      videoKyc: videoKycPath,
      status: 'pending'
    };

    let kyc;
    if (existingBusiness && existingBusiness.status === 'rejected') {
      // Update existing rejected KYC for same business name
      kyc = await Kyc.findOneAndUpdate(
        { _id: existingBusiness._id },
        { ...kycData, rejectedBy: null, rejectionReason: null, rejectedAt: null },
        { new: true }
      );
    } else {
      // Create new KYC (new business or rejected KYC with different business name)
      kyc = await Kyc.create(kycData);
    }

    // Send confirmation email
    try {
      const html = kycSubmissionTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName
      });
      
      await sendMail({
        to: email,
        subject: 'KYC Submission Received - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('KYC submission email failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'KYC submitted successfully. You will receive an email confirmation shortly.',
      data: {
        kycId: kyc._id,
        status: kyc.status,
        businessName: kyc.businessName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'KYC submission failed',
      error: error.message
    });
  }
};

// Get All KYCs (for user - multiple businesses)
exports.getMyKyc = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const kycs = await Kyc.find(filter)
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kycs.length,
      data: kycs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYCs',
      error: error.message
    });
  }
};

// Update/Edit KYC (for rejected or pending KYC)
exports.updateKyc = async (req, res) => {
  try {
    const userId = req.user._id;
    const fs = require('fs');

    // Find existing KYC
    const existingKyc = await Kyc.findOne({ userId });
    
    if (!existingKyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found. Please submit a new KYC first.'
      });
    }

    // Only allow editing if KYC is rejected or pending
    if (existingKyc.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit approved KYC. You are already a vendor.'
      });
    }

    // Check if user is already a vendor
    const user = await User.findById(userId);
    // Allow vendor/individual to submit multiple businesses
    // No restriction on role for multiple business submissions

    // Validate required fields
    const {
      businessName,
      gstNumber,
      // Legacy address fields
      plotNo,
      buildingName,
      street,
      landmark,
      area,
      pincode,
      state,
      city,
      // New business address fields
      businessPlotNo,
      businessBuildingName,
      businessStreet,
      businessLandmark,
      businessArea,
      businessPincode,
      businessState,
      businessCity,
      businessAddress,
      // Personal address fields
      personalPlotNo,
      personalBuildingName,
      personalStreet,
      personalLandmark,
      personalArea,
      personalPincode,
      personalState,
      personalCity,
      personalAddress,
      // Location coordinates (mandatory)
      longitude,
      latitude,
      title,
      contactPerson,
      mobileNumber,
      whatsappNumber,
      email,
      workingDays,
      businessHoursOpen,
      businessHoursClose,
      aadharNumber
    } = req.body;

    // Determine business type based on GST
    const hasGst = gstNumber && gstNumber.trim();
    const businessType = hasGst ? 'vendor' : 'individual';

    // Validation - Basic required fields
    if (!businessName || !title || !contactPerson || 
        !mobileNumber || !email || !workingDays || !businessHoursOpen || !businessHoursClose || 
        !aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Address validation based on GST
    if (hasGst) {
      // Vendor: Business address is required
      const businessAddressFields = businessPincode || businessState || businessCity || 
                                    businessPlotNo || businessBuildingName || businessStreet ||
                                    businessArea || businessAddress;
      const legacyAddressFields = pincode || state || city || plotNo || buildingName || street || area;
      
      if (!businessAddressFields && !legacyAddressFields) {
        return res.status(400).json({
          success: false,
          message: 'Business address is required when GST number is provided'
        });
      }
    } else {
      // Individual: Personal address is required
      const personalAddressFields = personalPincode || personalState || personalCity ||
                                    personalPlotNo || personalBuildingName || personalStreet ||
                                    personalArea || personalAddress;
      const legacyAddressFields = pincode || state || city || plotNo || buildingName || street || area;
      
      if (!personalAddressFields && !legacyAddressFields) {
        return res.status(400).json({
          success: false,
          message: 'Personal address is required when GST number is not provided'
        });
      }
    }

    // Validation - Latitude and Longitude are mandatory (must come from frontend)
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and Latitude are required fields. Please provide valid coordinates from frontend.'
      });
    }

    // Parse workingDays if it comes as a string (from form-data)
    let parsedWorkingDays = workingDays;
    if (typeof workingDays === 'string') {
      try {
        parsedWorkingDays = JSON.parse(workingDays);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid workingDays format. Send as JSON array string: ["Monday","Tuesday",...]'
        });
      }
    }

    if (!Array.isArray(parsedWorkingDays) || parsedWorkingDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one working day must be selected'
      });
    }

    // Validate working days
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const invalidDays = parsedWorkingDays.filter(day => !validDays.includes(day));
    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid working days provided'
      });
    }

    // Handle file uploads (optional - if provided, update; otherwise keep existing)
    let aadharImagePath = existingKyc.aadharImage;
    let videoKycPath = existingKyc.videoKyc;

    if (req.files && req.files.aadharImage && req.files.aadharImage.length > 0) {
      const aadharFile = req.files.aadharImage[0];
      
      // Validate file size
      if (aadharFile.size > 5 * 1024 * 1024) {
        // Clean up uploaded file
        if (fs.existsSync(aadharFile.path)) {
          fs.unlinkSync(aadharFile.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Aadhar image size must be less than 5MB'
        });
      }

      // Delete old aadhar image if exists
      if (existingKyc.aadharImage) {
        const oldFilePath = path.join(__dirname, '..', existingKyc.aadharImage);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      aadharImagePath = `/uploads/aadhar/${aadharFile.filename}`;
    }

    if (req.files && req.files.videoKyc && req.files.videoKyc.length > 0) {
      const videoFile = req.files.videoKyc[0];
      
      // Validate file size
      if (videoFile.size > 50 * 1024 * 1024) {
        // Clean up uploaded file
        if (fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        // Clean up aadhar if it was just uploaded
        if (req.files.aadharImage && req.files.aadharImage.length > 0 && fs.existsSync(req.files.aadharImage[0].path)) {
          fs.unlinkSync(req.files.aadharImage[0].path);
        }
        return res.status(400).json({
          success: false,
          message: 'Video KYC size must be less than 50MB'
        });
      }

      // Delete old video if exists
      if (existingKyc.videoKyc) {
        const oldFilePath = path.join(__dirname, '..', existingKyc.videoKyc);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      videoKycPath = `/uploads/video/${videoFile.filename}`;
    }

    // Determine which address to use for geocoding
    let addressForGeocoding;
    if (hasGst) {
      // Vendor: Use business address
      if (businessPincode || businessState || businessCity) {
        addressForGeocoding = {
          plotNo: businessPlotNo || plotNo || '',
          buildingName: businessBuildingName || buildingName || '',
          street: businessStreet || street || '',
          area: businessArea || area || '',
          city: businessCity || city || '',
          state: businessState || state || '',
          pincode: businessPincode || pincode || ''
        };
      } else {
        addressForGeocoding = {
          plotNo: plotNo || '',
          buildingName: buildingName || '',
          street: street || '',
          area: area || '',
          city: city || '',
          state: state || '',
          pincode: pincode || ''
        };
      }
    } else {
      // Individual: Use personal address
      if (personalPincode || personalState || personalCity) {
        addressForGeocoding = {
          plotNo: personalPlotNo || '',
          buildingName: personalBuildingName || '',
          street: personalStreet || '',
          area: personalArea || '',
          city: personalCity || '',
          state: personalState || '',
          pincode: personalPincode || ''
        };
      } else if (businessPincode || businessState || businessCity) {
        addressForGeocoding = {
          plotNo: businessPlotNo || '',
          buildingName: businessBuildingName || '',
          street: businessStreet || '',
          area: businessArea || '',
          city: businessCity || '',
          state: businessState || '',
          pincode: businessPincode || ''
        };
      } else {
        addressForGeocoding = {
          plotNo: plotNo || '',
          buildingName: buildingName || '',
          street: street || '',
          area: area || '',
          city: city || '',
          state: state || '',
          pincode: pincode || ''
        };
      }
    }

    // Get coordinates - longitude and latitude are mandatory from frontend
    const fullAddress = [
      addressForGeocoding.plotNo,
      addressForGeocoding.buildingName,
      addressForGeocoding.street,
      addressForGeocoding.area,
      addressForGeocoding.city,
      addressForGeocoding.state,
      addressForGeocoding.pincode,
      'India'
    ].filter(Boolean).join(', ');
    
    const locationData = {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      address: fullAddress
    };
    console.log('Using provided coordinates from frontend (updateKyc):', locationData);

    // Update KYC data
    const updateData = {
      businessName,
      gstNumber: gstNumber ? gstNumber.trim() : '',
      businessType,
      // Business Address
      businessPlotNo: businessPlotNo || plotNo || existingKyc.businessPlotNo || '',
      businessBuildingName: businessBuildingName || buildingName || existingKyc.businessBuildingName || '',
      businessStreet: businessStreet || street || existingKyc.businessStreet || '',
      businessLandmark: businessLandmark || landmark || existingKyc.businessLandmark || '',
      businessArea: businessArea || area || existingKyc.businessArea || '',
      businessPincode: businessPincode || pincode || existingKyc.businessPincode || '',
      businessState: businessState || state || existingKyc.businessState || '',
      businessCity: businessCity || city || existingKyc.businessCity || '',
      businessAddress: businessAddress || locationData.address || existingKyc.businessAddress || '',
      // Personal Address
      personalPlotNo: personalPlotNo || existingKyc.personalPlotNo || '',
      personalBuildingName: personalBuildingName || existingKyc.personalBuildingName || '',
      personalStreet: personalStreet || existingKyc.personalStreet || '',
      personalLandmark: personalLandmark || existingKyc.personalLandmark || '',
      personalArea: personalArea || existingKyc.personalArea || '',
      personalPincode: personalPincode || existingKyc.personalPincode || '',
      personalState: personalState || existingKyc.personalState || '',
      personalCity: personalCity || existingKyc.personalCity || '',
      personalAddress: personalAddress || existingKyc.personalAddress || '',
      // Legacy fields
      plotNo: plotNo || businessPlotNo || personalPlotNo || existingKyc.plotNo || '',
      buildingName: buildingName || businessBuildingName || personalBuildingName || existingKyc.buildingName || '',
      street: street || businessStreet || personalStreet || existingKyc.street || '',
      landmark: landmark || businessLandmark || personalLandmark || existingKyc.landmark || '',
      area: area || businessArea || personalArea || existingKyc.area || '',
      pincode: pincode || businessPincode || personalPincode || existingKyc.pincode || '',
      state: state || businessState || personalState || existingKyc.state || '',
      city: city || businessCity || personalCity || existingKyc.city || '',
      location: {
        type: 'Point',
        coordinates: [locationData.longitude, locationData.latitude]
      },
      title,
      contactPerson,
      mobileNumber,
      whatsappNumber: whatsappNumber || mobileNumber,
      email,
      workingDays: parsedWorkingDays,
      businessHoursOpen,
      businessHoursClose,
      aadharNumber,
      aadharImage: aadharImagePath,
      videoKyc: videoKycPath,
      status: 'pending', // Reset to pending after update
      rejectedBy: null,
      rejectionReason: null,
      rejectedAt: null
    };

    const updatedKyc = await Kyc.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );

    // Send confirmation email
    try {
      const html = kycSubmissionTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName
      });
      
      await sendMail({
        to: email,
        subject: 'KYC Updated - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('KYC update email failed:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'KYC updated successfully. Status reset to pending. You will receive an email confirmation shortly.',
      data: {
        kycId: updatedKyc._id,
        status: updatedKyc.status,
        businessName: updatedKyc.businessName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'KYC update failed',
      error: error.message
    });
  }
};

// Get all KYC (for admin)
exports.getAllKyc = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const kycs = await Kyc.find(filter)
      .populate('userId', 'name email phone')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kycs.length,
      data: kycs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYCs',
      error: error.message
    });
  }
};

// Get single KYC by ID (for admin)
exports.getKycById = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await Kyc.findById(id)
      .populate('userId', 'name email phone role')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found'
      });
    }

    res.status(200).json({
      success: true,
      data: kyc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC',
      error: error.message
    });
  }
};

// Approve KYC (by admin/superadmin/salesperson)
exports.approveKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const kyc = await Kyc.findById(id).populate('userId');
    
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found'
      });
    }

    if (kyc.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already approved'
      });
    }

    // Update KYC status
    kyc.status = 'approved';
    kyc.approvedBy = adminId;
    kyc.approvedAt = new Date();
    kyc.rejectedBy = null;
    kyc.rejectionReason = null;
    kyc.rejectedAt = null;
    await kyc.save();

    // Determine role based on GST
    const hasGst = kyc.gstNumber && kyc.gstNumber.trim();
    const newRole = hasGst ? 'vendor' : 'individual';

    // Update user role based on GST (if not already vendor or individual)
    const user = await User.findById(kyc.userId._id);
    if (user.role !== 'vendor' && user.role !== 'individual') {
      await User.findByIdAndUpdate(
        user._id,
        { role: newRole },
        { new: true }
      );
      user.role = newRole;
    } else if (user.role === 'vendor' && !hasGst) {
      // If user was vendor but now no GST, update to individual
      await User.findByIdAndUpdate(
        user._id,
        { role: 'individual' },
        { new: true }
      );
      user.role = 'individual';
    } else if (user.role === 'individual' && hasGst) {
      // If user was individual but now has GST, update to vendor
      await User.findByIdAndUpdate(
        user._id,
        { role: 'vendor' },
        { new: true }
      );
      user.role = 'vendor';
    }

    const customId = user._id.toString().substring(0, 8).toUpperCase();
    const roleLabel = hasGst ? 'Vendor' : 'Individual';

    // Send approval email
    try {
      const html = kycApprovalTemplate({
        name: kyc.contactPerson,
        email: kyc.email,
        businessName: kyc.businessName,
        customId
      });
      
      await sendMail({
        to: kyc.email,
        subject: `KYC Approved - Welcome ${roleLabel} - Gnet E-commerce`,
        html
      });
    } catch (emailError) {
      console.error('KYC approval email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: `KYC approved successfully. User role updated to ${newRole}.`,
      data: {
        kycId: kyc._id,
        status: kyc.status,
        businessType: kyc.businessType || newRole,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve KYC',
      error: error.message
    });
  }
};

// Reject KYC (by admin/superadmin/salesperson)
exports.rejectKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user._id;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const kyc = await Kyc.findById(id).populate('userId');
    
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found'
      });
    }

    if (kyc.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved KYC'
      });
    }

    // Update KYC status
    kyc.status = 'rejected';
    kyc.rejectedBy = adminId;
    kyc.rejectionReason = rejectionReason.trim();
    kyc.rejectedAt = new Date();
    kyc.approvedBy = null;
    kyc.approvedAt = null;
    await kyc.save();

    // Send rejection email
    try {
      const html = kycRejectionTemplate({
        name: kyc.contactPerson,
        email: kyc.email,
        businessName: kyc.businessName,
        rejectionReason: kyc.rejectionReason
      });
      
      await sendMail({
        to: kyc.email,
        subject: 'KYC Review Required - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('KYC rejection email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'KYC rejected successfully. Rejection email sent to user.',
      data: {
        kycId: kyc._id,
        status: kyc.status,
        rejectionReason: kyc.rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject KYC',
      error: error.message
    });
  }
};

// Update Business Timings (Vendor/Individual) - For Approved KYC
exports.updateBusinessTimings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessId } = req.params; // KYC ID
    const { workingDays, businessHoursOpen, businessHoursClose } = req.body;

    // Check if user is vendor or individual
    const { isVendorOrIndividual } = require('../utils/roleHelper');
    const user = await User.findById(userId);
    if (!user || !isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update business timings'
      });
    }

    // Find KYC
    const kyc = await Kyc.findById(businessId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (kyc.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own business timings'
      });
    }

    // Validate required fields
    if (!workingDays || !businessHoursOpen || !businessHoursClose) {
      return res.status(400).json({
        success: false,
        message: 'Working days, business hours open, and business hours close are required'
      });
    }

    // Parse workingDays if it comes as a string
    let parsedWorkingDays = workingDays;
    if (typeof workingDays === 'string') {
      try {
        parsedWorkingDays = JSON.parse(workingDays);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid workingDays format. Send as JSON array string: ["Monday","Tuesday",...]'
        });
      }
    }

    if (!Array.isArray(parsedWorkingDays) || parsedWorkingDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one working day must be selected'
      });
    }

    // Validate working days
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const invalidDays = parsedWorkingDays.filter(day => !validDays.includes(day));
    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid working days provided'
      });
    }

    // Update timings
    kyc.workingDays = parsedWorkingDays;
    kyc.businessHoursOpen = businessHoursOpen;
    kyc.businessHoursClose = businessHoursClose;
    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'Business timings updated successfully',
      data: {
        businessId: kyc._id,
        businessName: kyc.businessName,
        workingDays: kyc.workingDays,
        businessHoursOpen: kyc.businessHoursOpen,
        businessHoursClose: kyc.businessHoursClose,
        updatedAt: kyc.updatedAt
      }
    });

  } catch (error) {
    console.error('Update business timings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business timings',
      error: error.message
    });
  }
};

// Update Business Name (Vendor/Individual) - For Approved KYC
exports.updateBusinessName = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessId } = req.params; // KYC ID
    const { businessName } = req.body;

    // Check if user is vendor or individual
    const { isVendorOrIndividual } = require('../utils/roleHelper');
    const user = await User.findById(userId);
    if (!user || !isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update business name'
      });
    }

    // Find KYC
    const kyc = await Kyc.findById(businessId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (kyc.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own business name'
      });
    }

    // Validate required field
    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    // Update business name
    kyc.businessName = businessName.trim();
    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'Business name updated successfully',
      data: {
        businessId: kyc._id,
        businessName: kyc.businessName,
        updatedAt: kyc.updatedAt
      }
    });

  } catch (error) {
    console.error('Update business name error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business name',
      error: error.message
    });
  }
};

// Update Contact Details (Vendor/Individual) - For Approved KYC
exports.updateContactDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessId } = req.params; // KYC ID
    const { title, contactPerson, mobileNumber, whatsappNumber, email } = req.body;

    // Check if user is vendor or individual
    const { isVendorOrIndividual } = require('../utils/roleHelper');
    const user = await User.findById(userId);
    if (!user || !isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update contact details'
      });
    }

    // Find KYC
    const kyc = await Kyc.findById(businessId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (kyc.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own contact details'
      });
    }

    // Validate required fields
    if (!title || !contactPerson || !mobileNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Title, contact person, mobile number, and email are required'
      });
    }

    // Validate title
    if (!['Mr', 'Mrs', 'Miss', 'Dr', 'Prof'].includes(title)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid title. Must be one of: Mr, Mrs, Miss, Dr, Prof'
      });
    }

    // Validate mobile number
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be exactly 10 digits'
      });
    }

    // Validate whatsapp number if provided
    if (whatsappNumber && !/^\d{10}$/.test(whatsappNumber)) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number must be exactly 10 digits'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Update contact details
    if (title) kyc.title = title;
    if (contactPerson) kyc.contactPerson = contactPerson.trim();
    if (mobileNumber) kyc.mobileNumber = mobileNumber;
    if (whatsappNumber) kyc.whatsappNumber = whatsappNumber;
    if (email) kyc.email = email.toLowerCase().trim();
    
    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'Contact details updated successfully',
      data: {
        businessId: kyc._id,
        businessName: kyc.businessName,
        title: kyc.title,
        contactPerson: kyc.contactPerson,
        mobileNumber: kyc.mobileNumber,
        whatsappNumber: kyc.whatsappNumber || kyc.mobileNumber,
        email: kyc.email,
        updatedAt: kyc.updatedAt
      }
    });

  } catch (error) {
    console.error('Update contact details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact details',
      error: error.message
    });
  }
};

// Update Business Address (Vendor/Individual) - For Approved KYC
exports.updateBusinessAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessId } = req.params; // KYC ID
    const {
      businessPlotNo,
      businessBuildingName,
      businessStreet,
      businessLandmark,
      businessArea,
      businessPincode,
      businessState,
      businessCity,
      businessAddress,
      longitude,
      latitude
    } = req.body;

    // Check if user is vendor or individual
    const { isVendorOrIndividual } = require('../utils/roleHelper');
    const user = await User.findById(userId);
    if (!user || !isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update business address'
      });
    }

    // Find KYC
    const kyc = await Kyc.findById(businessId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (kyc.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own business address'
      });
    }

    // Validate at least some address fields are provided
    const hasAddressFields = businessPincode || businessState || businessCity ||
                            businessPlotNo || businessBuildingName || businessStreet ||
                            businessArea || businessAddress;

    if (!hasAddressFields) {
      return res.status(400).json({
        success: false,
        message: 'At least one business address field is required'
      });
    }

    // Validate pincode if provided
    if (businessPincode && !/^\d{6}$/.test(businessPincode)) {
      return res.status(400).json({
        success: false,
        message: 'Business pincode must be exactly 6 digits'
      });
    }

    // Update business address fields
    if (businessPlotNo !== undefined) kyc.businessPlotNo = businessPlotNo?.trim() || '';
    if (businessBuildingName !== undefined) kyc.businessBuildingName = businessBuildingName?.trim() || '';
    if (businessStreet !== undefined) kyc.businessStreet = businessStreet?.trim() || '';
    if (businessLandmark !== undefined) kyc.businessLandmark = businessLandmark?.trim() || '';
    if (businessArea !== undefined) kyc.businessArea = businessArea?.trim() || '';
    if (businessPincode !== undefined) kyc.businessPincode = businessPincode || '';
    if (businessState !== undefined) kyc.businessState = businessState?.trim() || '';
    if (businessCity !== undefined) kyc.businessCity = businessCity?.trim() || '';
    if (businessAddress !== undefined) kyc.businessAddress = businessAddress?.trim() || '';

    // Update location coordinates if provided or geocode from address
    if (longitude && latitude) {
      // Use provided coordinates
      kyc.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    } else {
      // Geocode from business address
      const addressComponents = {
        plotNo: kyc.businessPlotNo || '',
        buildingName: kyc.businessBuildingName || '',
        street: kyc.businessStreet || '',
        area: kyc.businessArea || '',
        city: kyc.businessCity || '',
        state: kyc.businessState || '',
        pincode: kyc.businessPincode || ''
      };

      const geoResult = await getCoordinatesFromAddress(addressComponents);
      kyc.location = {
        type: 'Point',
        coordinates: [geoResult.longitude, geoResult.latitude]
      };
    }

    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'Business address updated successfully',
      data: {
        businessId: kyc._id,
        businessName: kyc.businessName,
        businessAddress: {
          plotNo: kyc.businessPlotNo,
          buildingName: kyc.businessBuildingName,
          street: kyc.businessStreet,
          landmark: kyc.businessLandmark,
          area: kyc.businessArea,
          pincode: kyc.businessPincode,
          state: kyc.businessState,
          city: kyc.businessCity,
          fullAddress: kyc.businessAddress
        },
        location: kyc.location,
        updatedAt: kyc.updatedAt
      }
    });

  } catch (error) {
    console.error('Update business address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business address',
      error: error.message
    });
  }
};

// Update Personal Address (Individual) - For Approved KYC
exports.updatePersonalAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessId } = req.params; // KYC ID
    const {
      personalPlotNo,
      personalBuildingName,
      personalStreet,
      personalLandmark,
      personalArea,
      personalPincode,
      personalState,
      personalCity,
      personalAddress,
      longitude,
      latitude
    } = req.body;

    // Check if user is vendor or individual
    const { isVendorOrIndividual } = require('../utils/roleHelper');
    const user = await User.findById(userId);
    if (!user || !isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update personal address'
      });
    }

    // Find KYC
    const kyc = await Kyc.findById(businessId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (kyc.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own personal address'
      });
    }

    // Validate at least some address fields are provided
    const hasAddressFields = personalPincode || personalState || personalCity ||
                            personalPlotNo || personalBuildingName || personalStreet ||
                            personalArea || personalAddress;

    if (!hasAddressFields) {
      return res.status(400).json({
        success: false,
        message: 'At least one personal address field is required'
      });
    }

    // Validate pincode if provided
    if (personalPincode && !/^\d{6}$/.test(personalPincode)) {
      return res.status(400).json({
        success: false,
        message: 'Personal pincode must be exactly 6 digits'
      });
    }

    // Update personal address fields
    if (personalPlotNo !== undefined) kyc.personalPlotNo = personalPlotNo?.trim() || '';
    if (personalBuildingName !== undefined) kyc.personalBuildingName = personalBuildingName?.trim() || '';
    if (personalStreet !== undefined) kyc.personalStreet = personalStreet?.trim() || '';
    if (personalLandmark !== undefined) kyc.personalLandmark = personalLandmark?.trim() || '';
    if (personalArea !== undefined) kyc.personalArea = personalArea?.trim() || '';
    if (personalPincode !== undefined) kyc.personalPincode = personalPincode || '';
    if (personalState !== undefined) kyc.personalState = personalState?.trim() || '';
    if (personalCity !== undefined) kyc.personalCity = personalCity?.trim() || '';
    if (personalAddress !== undefined) kyc.personalAddress = personalAddress?.trim() || '';

    // Update location coordinates if provided or geocode from address
    // For individual, use personal address for geocoding if business address not available
    if (longitude && latitude) {
      // Use provided coordinates
      kyc.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    } else {
      // Geocode from personal address (for individual) or business address
      const addressComponents = kyc.businessCity || kyc.businessState ? {
        plotNo: kyc.businessPlotNo || '',
        buildingName: kyc.businessBuildingName || '',
        street: kyc.businessStreet || '',
        area: kyc.businessArea || '',
        city: kyc.businessCity || '',
        state: kyc.businessState || '',
        pincode: kyc.businessPincode || ''
      } : {
        plotNo: kyc.personalPlotNo || '',
        buildingName: kyc.personalBuildingName || '',
        street: kyc.personalStreet || '',
        area: kyc.personalArea || '',
        city: kyc.personalCity || '',
        state: kyc.personalState || '',
        pincode: kyc.personalPincode || ''
      };

      const geoResult = await getCoordinatesFromAddress(addressComponents);
      kyc.location = {
        type: 'Point',
        coordinates: [geoResult.longitude, geoResult.latitude]
      };
    }

    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'Personal address updated successfully',
      data: {
        businessId: kyc._id,
        businessName: kyc.businessName,
        personalAddress: {
          plotNo: kyc.personalPlotNo,
          buildingName: kyc.personalBuildingName,
          street: kyc.personalStreet,
          landmark: kyc.personalLandmark,
          area: kyc.personalArea,
          pincode: kyc.personalPincode,
          state: kyc.personalState,
          city: kyc.personalCity,
          fullAddress: kyc.personalAddress
        },
        location: kyc.location,
        updatedAt: kyc.updatedAt
      }
    });

  } catch (error) {
    console.error('Update personal address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal address',
      error: error.message
    });
  }
};

