const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const Kyc = require('../models/Kyc');
const fs = require('fs');
const path = require('path');

// Get Vendor Profile (public - anyone can view)
exports.getVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = vendorId || req.user?._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is vendor
    if (user.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'This user is not a vendor'
      });
    }

    // Get vendor profile
    let profile = await VendorProfile.findOne({ userId }).populate('userId', 'name email phone role');

    // If profile doesn't exist, create empty one
    if (!profile) {
      profile = await VendorProfile.create({
        userId,
        website: '',
        socialMediaLinks: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          youtube: ''
        },
        businessPhotos: [],
        businessVideo: ''
      });
      await profile.populate('userId', 'name email phone role');
    }

    // Get all KYC data (multiple businesses)
    const kycs = await Kyc.find({ userId })
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    // Combine all data
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      },
      businesses: kycs || [], // All businesses/KYCs
      vendorProfile: {
        website: profile.website,
        socialMediaLinks: profile.socialMediaLinks,
        businessPhotos: profile.businessPhotos,
        businessVideo: profile.businessVideo
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile',
      error: error.message
    });
  }
};

// Update Vendor Profile (all fields optional) - Vendor, Admin, Superadmin can edit
exports.updateVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.params; // vendorId from URL
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Determine which vendor's profile to update
    let targetUserId;
    if (vendorId) {
      targetUserId = vendorId;
    } else {
      // If no vendorId in URL, use current user's ID (though route requires it now)
      targetUserId = currentUserId.toString();
    }

    // If vendor is trying to update profile, vendorId must match their own ID
    if (currentUser.role === 'vendor') {
      if (targetUserId !== currentUserId.toString()) {
        // Clean up uploaded files
        if (req.files) {
          if (req.files.businessPhotos) {
            req.files.businessPhotos.forEach(file => {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
          if (req.files.businessVideo) {
            req.files.businessVideo.forEach(file => {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        }
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile'
        });
      }
    }

    // Check if target user is vendor
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      // Clean up uploaded files
      if (req.files) {
        if (req.files.businessPhotos) {
          req.files.businessPhotos.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.businessVideo) {
          req.files.businessVideo.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (targetUser.role !== 'vendor') {
      // Clean up uploaded files
      if (req.files) {
        if (req.files.businessPhotos) {
          req.files.businessPhotos.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.businessVideo) {
          req.files.businessVideo.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(403).json({
        success: false,
        message: 'This user is not a vendor'
      });
    }

    // Check if current user has permission (vendor can only update own, admin/superadmin can update any)
    if (currentUser.role !== 'vendor' && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      // Clean up uploaded files
      if (req.files) {
        if (req.files.businessPhotos) {
          req.files.businessPhotos.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.businessVideo) {
          req.files.businessVideo.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this profile'
      });
    }

    const {
      website,
      facebook,
      instagram,
      twitter,
      linkedin,
      youtube
    } = req.body;

    // Use targetUserId instead of currentUserId

    // Find or create profile
    let profile = await VendorProfile.findOne({ userId: targetUserId });

    if (!profile) {
      profile = await VendorProfile.create({
        userId: targetUserId,
        website: '',
        socialMediaLinks: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          youtube: ''
        },
        businessPhotos: [],
        businessVideo: ''
      });
    }

    const updateData = {};

    // Update website if provided
    if (website !== undefined) {
      updateData.website = website.trim();
    }

    // Update social media links if provided
    if (facebook !== undefined || instagram !== undefined || twitter !== undefined || 
        linkedin !== undefined || youtube !== undefined) {
      updateData.socialMediaLinks = { ...profile.socialMediaLinks };
      
      if (facebook !== undefined) updateData.socialMediaLinks.facebook = facebook.trim();
      if (instagram !== undefined) updateData.socialMediaLinks.instagram = instagram.trim();
      if (twitter !== undefined) updateData.socialMediaLinks.twitter = twitter.trim();
      if (linkedin !== undefined) updateData.socialMediaLinks.linkedin = linkedin.trim();
      if (youtube !== undefined) updateData.socialMediaLinks.youtube = youtube.trim();
    }

    // Handle business photos upload (add new photos to existing ones)
    if (req.files && req.files.businessPhotos && req.files.businessPhotos.length > 0) {
      // Validate file sizes
      const invalidFiles = req.files.businessPhotos.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        // Clean up all uploaded files
        req.files.businessPhotos.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        if (req.files.businessVideo) {
          req.files.businessVideo.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Business photos size must be less than 10MB each'
        });
      }

      const newPhotoPaths = req.files.businessPhotos.map(file => `/uploads/vendor/photos/${file.filename}`);
      updateData.businessPhotos = [...profile.businessPhotos, ...newPhotoPaths];
    }

    // Handle business video upload
    if (req.files && req.files.businessVideo && req.files.businessVideo.length > 0) {
      const videoFile = req.files.businessVideo[0];

      // Validate file size
      if (videoFile.size > 100 * 1024 * 1024) {
        // Clean up uploaded files
        if (fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        if (req.files.businessPhotos) {
          req.files.businessPhotos.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Business video size must be less than 100MB'
        });
      }

      // Delete old video if exists
      if (profile.businessVideo) {
        const oldVideoPath = path.join(__dirname, '..', profile.businessVideo);
        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }

      updateData.businessVideo = `/uploads/vendor/video/${videoFile.filename}`;
    }

    // Update profile
    const updatedProfile = await VendorProfile.findOneAndUpdate(
      { userId: targetUserId },
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone role');

    // Get all KYC data for complete response (multiple businesses)
    const kycs = await Kyc.find({ userId: targetUserId })
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    // Combine all data
    const responseData = {
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        isVerified: targetUser.isVerified
      },
      businesses: kycs || [], // All businesses/KYCs
      vendorProfile: {
        website: updatedProfile.website,
        socialMediaLinks: updatedProfile.socialMediaLinks,
        businessPhotos: updatedProfile.businessPhotos,
        businessVideo: updatedProfile.businessVideo
      },
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: responseData
    });
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      if (req.files.businessPhotos) {
        req.files.businessPhotos.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      if (req.files.businessVideo) {
        req.files.businessVideo.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update vendor profile',
      error: error.message
    });
  }
};

// Delete Business Photo
exports.deleteBusinessPhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoPath } = req.body;

    if (!photoPath) {
      return res.status(400).json({
        success: false,
        message: 'Photo path is required'
      });
    }

    // Check if user is vendor
    const user = await User.findById(userId);
    if (user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can delete photos'
      });
    }

    const profile = await VendorProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    // Check if photo exists in profile
    const photoIndex = profile.businessPhotos.indexOf(photoPath);
    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found in profile'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', photoPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove photo from array
    profile.businessPhotos.splice(photoIndex, 1);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business photo deleted successfully',
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete business photo',
      error: error.message
    });
  }
};

// Delete Business Video
exports.deleteBusinessVideo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user is vendor
    const user = await User.findById(userId);
    if (user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can delete video'
      });
    }

    const profile = await VendorProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    if (!profile.businessVideo) {
      return res.status(404).json({
        success: false,
        message: 'No business video found'
      });
    }

    // Delete file from filesystem
    const videoPath = path.join(__dirname, '..', profile.businessVideo);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Remove video
    profile.businessVideo = '';
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business video deleted successfully',
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete business video',
      error: error.message
    });
  }
};

