const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const Kyc = require('../models/Kyc');
const BusinessKeyword = require('../models/BusinessKeyword');
const Review = require('../models/Review');
const { isVendorOrIndividual } = require('../utils/roleHelper');
const fs = require('fs');
const path = require('path');

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const allowedManagerRoles = ['vendor', 'individual', 'admin', 'superadmin'];

const defaultSocialMediaLinks = () => ({
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  youtube: ''
});

const ensureVendorProfileExists = async (userId) => {
  let profile = await VendorProfile.findOne({ userId });
  if (profile) {
    return profile;
  }

  profile = await VendorProfile.create({
    userId,
    website: '',
    socialMediaLinks: defaultSocialMediaLinks(),
    businessPhotos: [],
    businessVideo: ''
  });
  return profile;
};

const ensureVendorAccess = async (req, vendorId) => {
  const currentUserId = req.user._id.toString();
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    throw new ApiError(404, 'Current user not found');
  }

  const targetUserId = vendorId || currentUserId;
  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    throw new ApiError(404, 'Vendor not found');
  }

  if (!isVendorOrIndividual(targetUser)) {
    throw new ApiError(403, 'This user is not a vendor or individual');
  }

  if (isVendorOrIndividual(currentUser) && targetUserId !== currentUserId) {
    throw new ApiError(403, 'You can only manage your own profile');
  }

  if (!allowedManagerRoles.includes(currentUser.role)) {
    throw new ApiError(403, 'You do not have permission to manage vendor profiles');
  }

  const profile = await ensureVendorProfileExists(targetUserId);

  return { targetUserId, targetUser, profile };
};

const pickSocialMediaUpdates = (body = {}) => {
  const updates = {};
  let hasAnyValue = false;
  Object.keys(defaultSocialMediaLinks()).forEach((key) => {
    if (body[key] !== undefined) {
      const value = (body[key] || '').trim();
      updates[key] = value;
      if (value) {
        hasAnyValue = true;
      }
    }
  });
  return { updates, hasAnyValue };
};

const hasExistingWebsite = (profile) =>
  Boolean(profile.website && profile.website.trim());

const hasExistingSocialLinks = (profile) =>
  profile.socialMediaLinks &&
  Object.values(profile.socialMediaLinks).some((value) => value && value.trim());

const sendControllerError = (res, error, defaultMessage) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error(defaultMessage, error);
  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

// Get Vendor Profile by Business ID (public - anyone can view)
exports.getVendorProfile = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Get business (KYC) by businessId
    const business = await Kyc.findById(businessId)
      .populate('userId', 'name email phone role')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check if business is approved
    if (business.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Business profile is not approved yet'
      });
    }

    const userId = business.userId._id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is vendor or individual
    if (!isVendorOrIndividual(user)) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a vendor or individual'
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

    // Get reviews for this specific business (only approved reviews)
    const reviews = await Review.find({
      vendorId: userId,
      status: 'approved',
      isDeleted: false
    })
      .populate('userId', 'name email phone role')
      .sort({ createdAt: -1 })
      .limit(10); // Latest 10 reviews

    // Calculate average rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews).toFixed(2))
      : 0;

    // Get services for this vendor
    const ServiceCatalog = require('../models/ServiceCatalog');
    const services = await ServiceCatalog.find({ vendorId: userId })
      .sort({ createdAt: -1 });

    // Add full URLs for photos and video
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
    const businessPhotos = profile.businessPhotos.map(photo => ({
      path: photo,
      url: baseUrl ? `${baseUrl}${photo}` : photo
    }));

    const businessVideo = profile.businessVideo ? {
      path: profile.businessVideo,
      url: baseUrl ? `${baseUrl}${profile.businessVideo}` : profile.businessVideo
    } : null;

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
      business: business, // Specific business details
      vendorProfile: {
        website: profile.website,
        socialMediaLinks: profile.socialMediaLinks,
        businessPhotos: businessPhotos,
        businessVideo: businessVideo
      },
      reviews: {
        total: totalReviews,
        averageRating: averageRating,
        latestReviews: reviews
      },
      services: services || [],
      totalServices: services.length,
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

// -------------------------
// Website Link CRUD
// -------------------------

exports.createWebsiteLink = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { website } = req.body;

    if (!website || !website.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website link is required'
      });
    }

    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    if (hasExistingWebsite(profile)) {
      return res.status(400).json({
        success: false,
        message: 'Website link already exists. Use update API instead.'
      });
    }

    profile.website = website.trim();
    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Website link created successfully',
      data: {
        vendorId: targetUser._id,
        website: profile.website
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to create website link');
  }
};

exports.getWebsiteLink = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    return res.status(200).json({
      success: true,
      data: {
        vendorId: targetUser._id,
        website: profile.website || ''
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to fetch website link');
  }
};

exports.updateWebsiteLink = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { website } = req.body;

    if (!website || !website.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website link is required'
      });
    }

    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    profile.website = website.trim();
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Website link updated successfully',
      data: {
        vendorId: targetUser._id,
        website: profile.website
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to update website link');
  }
};

exports.deleteWebsiteLink = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    if (!hasExistingWebsite(profile)) {
      return res.status(404).json({
        success: false,
        message: 'Website link not found'
      });
    }

    profile.website = '';
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Website link deleted successfully',
      data: {
        vendorId: targetUser._id,
        website: profile.website
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to delete website link');
  }
};

// -------------------------
// Social Media Links CRUD
// -------------------------

exports.createSocialMediaLinks = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);
    const { updates, hasAnyValue } = pickSocialMediaUpdates(req.body);

    if (!hasAnyValue) {
      return res.status(400).json({
        success: false,
        message: 'At least one social media link is required'
      });
    }

    const currentLinks = {
      ...defaultSocialMediaLinks(),
      ...(profile.socialMediaLinks || {})
    };

    let addedAny = false;
    Object.entries(updates).forEach(([platform, value]) => {
      if (!value) {
        return;
      }
      const existing = currentLinks[platform];
      if (!existing || !existing.trim()) {
        currentLinks[platform] = value;
        addedAny = true;
      }
    });

    if (!addedAny) {
      return res.status(400).json({
        success: false,
        message: 'Provided social media links already exist. Use update API to modify them.'
      });
    }

    profile.socialMediaLinks = currentLinks;
    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Social media links created successfully',
      data: {
        vendorId: targetUser._id,
        socialMediaLinks: profile.socialMediaLinks
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to create social media links');
  }
};

exports.getSocialMediaLinks = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    return res.status(200).json({
      success: true,
      data: {
        vendorId: targetUser._id,
        socialMediaLinks: profile.socialMediaLinks || defaultSocialMediaLinks()
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to fetch social media links');
  }
};

exports.updateSocialMediaLinks = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);
    const { updates, hasAnyValue } = pickSocialMediaUpdates(req.body);

    if (!hasAnyValue) {
      return res.status(400).json({
        success: false,
        message: 'At least one social media link is required'
      });
    }

    profile.socialMediaLinks = {
      ...defaultSocialMediaLinks(),
      ...profile.socialMediaLinks,
      ...updates
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Social media links updated successfully',
      data: {
        vendorId: targetUser._id,
        socialMediaLinks: profile.socialMediaLinks
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to update social media links');
  }
};

exports.deleteSocialMediaLinks = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const platform = req.query.platform;

    const { targetUser, profile } = await ensureVendorAccess(req, vendorId);

    if (platform) {
      if (!Object.prototype.hasOwnProperty.call(defaultSocialMediaLinks(), platform)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid social media platform'
        });
      }

      const existingValue =
        profile.socialMediaLinks && profile.socialMediaLinks[platform];

      if (!existingValue || !existingValue.trim()) {
        return res.status(404).json({
          success: false,
          message: `No ${platform} link found to delete`
        });
      }

      profile.socialMediaLinks = {
        ...defaultSocialMediaLinks(),
        ...profile.socialMediaLinks,
        [platform]: ''
      };
    } else {
      if (!hasExistingSocialLinks(profile)) {
        return res.status(404).json({
          success: false,
          message: 'Social media links not found'
        });
      }

      profile.socialMediaLinks = defaultSocialMediaLinks();
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: platform
        ? `Social media link (${platform}) deleted successfully`
        : 'All social media links deleted successfully',
      data: {
        vendorId: targetUser._id,
        socialMediaLinks: profile.socialMediaLinks
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to delete social media links');
  }
};

// -------------------------
// Business Details
// -------------------------

exports.getBusinessDetails = async (req, res) => {
  try {
    const { businessId } = req.params;
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Current user not found'
      });
    }

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const business = await Kyc.findById(businessId)
      .populate('userId', 'name email phone role isVerified')
      .populate('approvedBy', 'name email role')
      .populate('rejectedBy', 'name email role');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    const isOwner =
      isVendorOrIndividual(currentUser) &&
      business.userId &&
      business.userId._id.toString() === currentUser._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this business'
      });
    }

    const keywords = await BusinessKeyword.find({ businessId: business._id })
      .sort({ createdAt: -1 });

    const responseData = {
      business: {
        id: business._id,
        userId: business.userId?._id,
        businessName: business.businessName,
        gstNumber: business.gstNumber,
        contactPerson: business.contactPerson,
        title: business.title,
        email: business.email,
        mobileNumber: business.mobileNumber,
        whatsappNumber: business.whatsappNumber,
        workingDays: business.workingDays,
        businessHoursOpen: business.businessHoursOpen,
        businessHoursClose: business.businessHoursClose,
        address: {
          plotNo: business.plotNo,
          buildingName: business.buildingName,
          street: business.street,
          landmark: business.landmark,
          area: business.area,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          fullAddress: business.businessAddress || [
            business.plotNo,
            business.buildingName,
            business.street,
            business.area,
            business.city,
            business.state,
            business.pincode
          ]
            .filter(Boolean)
            .join(', ')
        },
        location: {
          type: business.location?.type || 'Point',
          coordinates: business.location?.coordinates || [
            business.longitude ? Number(business.longitude) : 0,
            business.latitude ? Number(business.latitude) : 0
          ]
        },
        documents: {
          aadharNumber: business.aadharNumber,
          aadharImage: business.aadharImage,
          videoKyc: business.videoKyc
        },
        status: business.status,
        rejection: {
          rejectedBy: business.rejectedBy || null,
          rejectionReason: business.rejectionReason || '',
          rejectedAt: business.rejectedAt
        },
        approval: {
          approvedBy: business.approvedBy || null,
          approvedAt: business.approvedAt
        },
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      },
      owner: business.userId || null,
      keywords: keywords.map((item) => ({
        id: item._id,
        keyword: item.keyword,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to fetch business details');
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
    if (isVendorOrIndividual(currentUser)) {
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

    if (!isVendorOrIndividual(targetUser)) {
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
        message: 'This user is not a vendor or individual'
      });
    }

    // Check if current user has permission (vendor/individual can only update own, admin/superadmin can update any)
    if (!isVendorOrIndividual(currentUser) && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
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

    // Check if user is vendor or individual
    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can delete photos'
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

    // Check if user is vendor or individual
    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can delete video'
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

// ============================================
// NEW SEPARATE APIs FOR PHOTOS AND VIDEO
// ============================================

// Upload Business Photos (Add new photos - appends to existing)
exports.uploadBusinessPhotos = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user is vendor or individual
    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      // Clean up uploaded files
      const uploadedFiles = req.files || [];
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can upload photos'
      });
    }

    // Handle both 'photos' and 'businessPhotos' field names for compatibility
    const uploadedFiles = req.files || [];
    
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos provided'
      });
    }

    // Check file count (max 10 total)
    const profile = await ensureVendorProfileExists(userId);
    const currentPhotoCount = profile.businessPhotos.length;
    const newPhotoCount = uploadedFiles.length;
    
    if (currentPhotoCount + newPhotoCount > 10) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({
        success: false,
        message: `Maximum 10 photos allowed. You have ${currentPhotoCount} photos and trying to add ${newPhotoCount}. Please delete some photos first.`
      });
    }

    // Validate file sizes (max 10MB each)
    const invalidFiles = uploadedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      // Clean up all files
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Each photo must be less than 10MB'
      });
    }

    // Add new photos to existing ones
    const newPhotoPaths = uploadedFiles.map(file => `/uploads/vendor/photos/${file.filename}`);
    profile.businessPhotos = [...profile.businessPhotos, ...newPhotoPaths];
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business photos uploaded successfully',
      data: {
        totalPhotos: profile.businessPhotos.length,
        newPhotos: newPhotoPaths,
        allPhotos: profile.businessPhotos
      }
    });
  } catch (error) {
    // Clean up uploaded files on error
    const uploadedFiles = req.files || [];
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    return sendControllerError(res, error, 'Failed to upload business photos');
  }
};

// Get All Business Photos
exports.getBusinessPhotos = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = vendorId || req.user?._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!isVendorOrIndividual(user)) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a vendor or individual'
      });
    }

    const profile = await VendorProfile.findOne({ userId });
    const photos = profile ? profile.businessPhotos : [];

    res.status(200).json({
      success: true,
      data: {
        totalPhotos: photos.length,
        photos: photos
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to get business photos');
  }
};

// Delete Single Business Photo
exports.deleteSingleBusinessPhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoPath } = req.body;

    if (!photoPath) {
      return res.status(400).json({
        success: false,
        message: 'Photo path is required'
      });
    }

    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can delete photos'
      });
    }

    const profile = await VendorProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

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
      data: {
        totalPhotos: profile.businessPhotos.length,
        remainingPhotos: profile.businessPhotos
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to delete business photo');
  }
};

// Update/Replace All Business Photos (Replaces all existing photos with new ones)
exports.updateBusinessPhotos = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user is vendor or individual
    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      // Clean up uploaded files
      const uploadedFiles = req.files || [];
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can update photos'
      });
    }

    // Handle both 'photos' and 'businessPhotos' field names for compatibility
    const uploadedFiles = req.files || [];
    
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos provided'
      });
    }

    // Validate file count (max 10)
    if (uploadedFiles.length > 10) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 photos allowed'
      });
    }

    // Validate file sizes (max 10MB each)
    const invalidFiles = uploadedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      // Clean up all files
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Each photo must be less than 10MB'
      });
    }

    const profile = await ensureVendorProfileExists(userId);

    // Delete all old photos from filesystem
    profile.businessPhotos.forEach(photoPath => {
      const filePath = path.join(__dirname, '..', photoPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Replace with new photos
    const newPhotoPaths = uploadedFiles.map(file => `/uploads/vendor/photos/${file.filename}`);
    profile.businessPhotos = newPhotoPaths;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business photos updated successfully (all photos replaced)',
      data: {
        totalPhotos: profile.businessPhotos.length,
        photos: profile.businessPhotos
      }
    });
  } catch (error) {
    // Clean up uploaded files on error
    const uploadedFiles = req.files || [];
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    return sendControllerError(res, error, 'Failed to update business photos');
  }
};

// Delete All Business Photos
exports.deleteAllBusinessPhotos = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can delete photos'
      });
    }

    const profile = await VendorProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    // Delete all files from filesystem
    profile.businessPhotos.forEach(photoPath => {
      const filePath = path.join(__dirname, '..', photoPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    const deletedCount = profile.businessPhotos.length;
    profile.businessPhotos = [];
    await profile.save();

    res.status(200).json({
      success: true,
      message: `All business photos (${deletedCount}) deleted successfully`,
      data: {
        deletedCount: deletedCount,
        totalPhotos: 0
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to delete all business photos');
  }
};

// Upload Business Video (Replaces existing video)
exports.uploadBusinessVideo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user is vendor or individual
    const user = await User.findById(userId);
    if (!isVendorOrIndividual(user)) {
      // Clean up uploaded file
      const videoFile = req.file;
      if (videoFile && fs.existsSync(videoFile.path)) {
        fs.unlinkSync(videoFile.path);
      }
      return res.status(403).json({
        success: false,
        message: 'Only vendors or individuals can upload video'
      });
    }

    // Handle both 'video' and 'businessVideo' field names for compatibility
    const videoFile = req.file;
    
    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    // Validate file size (max 100MB)
    if (videoFile.size > 100 * 1024 * 1024) {
      // Clean up uploaded file
      if (fs.existsSync(videoFile.path)) {
        fs.unlinkSync(videoFile.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Video must be less than 100MB'
      });
    }

    const profile = await ensureVendorProfileExists(userId);

    // Delete old video if exists
    if (profile.businessVideo) {
      const oldVideoPath = path.join(__dirname, '..', profile.businessVideo);
      if (fs.existsSync(oldVideoPath)) {
        fs.unlinkSync(oldVideoPath);
      }
    }

    // Update with new video
    profile.businessVideo = `/uploads/vendor/video/${videoFile.filename}`;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business video uploaded successfully',
      data: {
        video: profile.businessVideo,
        videoUrl: `${req.protocol}://${req.get('host')}${profile.businessVideo}`
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    const videoFile = req.file;
    if (videoFile && fs.existsSync(videoFile.path)) {
      fs.unlinkSync(videoFile.path);
    }
    return sendControllerError(res, error, 'Failed to upload business video');
  }
};

// Get Business Video
exports.getBusinessVideo = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const userId = vendorId || req.user?._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!isVendorOrIndividual(user)) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a vendor or individual'
      });
    }

    const profile = await VendorProfile.findOne({ userId });
    const video = profile && profile.businessVideo ? profile.businessVideo : null;

    res.status(200).json({
      success: true,
      data: {
        hasVideo: !!video,
        video: video,
        videoUrl: video ? `${req.protocol}://${req.get('host')}${video}` : null
      }
    });
  } catch (error) {
    return sendControllerError(res, error, 'Failed to get business video');
  }
};

