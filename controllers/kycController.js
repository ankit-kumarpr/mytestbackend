const Kyc = require('../models/Kyc');
const User = require('../models/User');
const { sendMail, kycSubmissionTemplate, kycApprovalTemplate, kycRejectionTemplate } = require('../utils/email');
const path = require('path');

// Submit KYC/Business Registration (Multiple businesses allowed)
exports.submitKyc = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate required fields first
    const {
      businessName,
      gstNumber,
      plotNo,
      buildingName,
      street,
      landmark,
      area,
      pincode,
      state,
      city,
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

    // Validation
    if (!businessName || !pincode || !state || !city || !title || !contactPerson || 
        !mobileNumber || !email || !workingDays || !businessHoursOpen || !businessHoursClose || 
        !aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
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

    // Create or update KYC
    const kycData = {
      userId,
      businessName,
      gstNumber: gstNumber || '',
      plotNo: plotNo || '',
      buildingName: buildingName || '',
      street: street || '',
      landmark: landmark || '',
      area: area || '',
      pincode,
      state,
      city,
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
    if (user.role === 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a vendor'
      });
    }

    // Validate required fields
    const {
      businessName,
      gstNumber,
      plotNo,
      buildingName,
      street,
      landmark,
      area,
      pincode,
      state,
      city,
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

    // Validation
    if (!businessName || !pincode || !state || !city || !title || !contactPerson || 
        !mobileNumber || !email || !workingDays || !businessHoursOpen || !businessHoursClose || 
        !aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
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

    // Update KYC data
    const updateData = {
      businessName,
      gstNumber: gstNumber || '',
      plotNo: plotNo || '',
      buildingName: buildingName || '',
      street: street || '',
      landmark: landmark || '',
      area: area || '',
      pincode,
      state,
      city,
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

    // Update user role to vendor (if not already vendor)
    const user = await User.findById(kyc.userId._id);
    if (user.role !== 'vendor') {
      await User.findByIdAndUpdate(
        user._id,
        { role: 'vendor' },
        { new: true }
      );
      user.role = 'vendor';
    }

    const customId = user._id.toString().substring(0, 8).toUpperCase();

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
        subject: 'KYC Approved - Welcome Vendor - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('KYC approval email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'KYC approved successfully. User role updated to vendor.',
      data: {
        kycId: kyc._id,
        status: kyc.status,
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

