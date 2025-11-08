const Banner = require('../models/Banner');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/banners');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// 1. Get All Banners (Admin only)
exports.getAllBanners = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view banners'
      });
    }

    const banners = await Banner.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 }); // Latest first

    res.status(200).json({
      success: true,
      data: {
        banners: banners
      }
    });

  } catch (error) {
    console.error('Get all banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get banners',
      error: error.message
    });
  }
};

// 2. Add Banner (Admin only)
exports.createBanner = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { title, link, startDate, endDate, isActive, displayOrder } = req.body;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create banners'
      });
    }

    // Validate required fields
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Create banner
    const banner = new Banner({
      title: title || '',
      image: `/uploads/banners/${req.file.filename}`,
      link: link || '',
      startDate: start,
      endDate: end,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      createdBy: adminId,
      updatedBy: adminId
    });

    await banner.save();
    await banner.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: {
        banner: banner
      }
    });

  } catch (error) {
    console.error('Create banner error:', error);
    // Delete uploaded file if banner creation failed
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/banners', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: error.message
    });
  }
};

// 3. Edit/Update Banner (Admin only)
exports.updateBanner = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { bannerId } = req.params;
    const { title, link, startDate, endDate, isActive, displayOrder } = req.body;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update banners'
      });
    }

    // Get banner
    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const isProvided = (value) =>
      value !== undefined && value !== null && value !== '';

    // Update fields only if provided
    if (isProvided(title)) banner.title = title;
    if (isProvided(link)) banner.link = link;

    if (isProvided(isActive)) {
      if (typeof isActive === 'string') {
        banner.isActive = isActive.toLowerCase() === 'true';
      } else {
        banner.isActive = Boolean(isActive);
      }
    }

    if (isProvided(displayOrder)) {
      const parsedDisplayOrder =
        typeof displayOrder === 'string'
          ? Number(displayOrder)
          : displayOrder;

      if (!Number.isInteger(parsedDisplayOrder)) {
        return res.status(400).json({
          success: false,
          message: 'Display order must be an integer'
        });
      }

      banner.displayOrder = parsedDisplayOrder;
    }

    // Handle date updates
    if (isProvided(startDate)) {
      const start =
        typeof startDate === 'string' || startDate instanceof Date
          ? new Date(startDate)
          : null;

      if (!start || isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      banner.startDate = start;
    }

    if (isProvided(endDate)) {
      const end =
        typeof endDate === 'string' || endDate instanceof Date
          ? new Date(endDate)
          : null;

      if (!end || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      banner.endDate = end;
    }

    // Validate dates
    if (banner.startDate && banner.endDate && banner.startDate > banner.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Handle image update if new image is uploaded
    if (req.file) {
      // Delete old image file
      const oldImagePath = path.join(__dirname, '..', banner.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      // Set new image
      banner.image = `/uploads/banners/${req.file.filename}`;
    }

    banner.updatedBy = adminId;
    await banner.save();

    await banner.populate('updatedBy', 'name email');
    await banner.populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: {
        banner: banner
      }
    });

  } catch (error) {
    console.error('Update banner error:', error);
    // Delete uploaded file if update failed
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/banners', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: error.message
    });
  }
};

// 4. Delete Banner (Admin only)
exports.deleteBanner = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { bannerId } = req.params;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete banners'
      });
    }

    // Get banner
    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Delete image file
    const imagePath = path.join(__dirname, '..', banner.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete banner
    await Banner.findByIdAndDelete(bannerId);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });

  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};
