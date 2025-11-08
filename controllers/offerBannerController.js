const OfferBanner = require('../models/OfferBanner');
const OfferBannerPlace = require('../models/OfferBannerPlace');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/offer-banners');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'offer-banner-' + uniqueSuffix + path.extname(file.originalname));
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

// ==================== ADMIN APIs ====================

// 1. Set Place Prices (Admin/SuperAdmin only)
exports.setPlacePrices = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { place, price7Days, price14Days, price21Days, price30Days } = req.body;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can set place prices'
      });
    }

    if (!place || !['top', 'middle', 'bottom'].includes(place)) {
      return res.status(400).json({
        success: false,
        message: 'Place must be top, middle, or bottom'
      });
    }

    if (!price7Days || price7Days <= 0) {
      return res.status(400).json({
        success: false,
        message: '7 days price is required and must be greater than 0'
      });
    }

    // Prices in paise (for Razorpay)
    const prices = {
      price7Days: Math.round(price7Days * 100), // Convert to paise
      price14Days: price14Days ? Math.round(price14Days * 100) : Math.round(price7Days * 2 * 100),
      price21Days: price21Days ? Math.round(price21Days * 100) : Math.round(price7Days * 3 * 100),
      price30Days: price30Days ? Math.round(price30Days * 100) : Math.round(price7Days * 4 * 100)
    };

    // Update or create place prices
    const placePrices = await OfferBannerPlace.findOneAndUpdate(
      { place },
      {
        place,
        ...prices,
        updatedBy: adminId
      },
      { upsert: true, new: true }
    );

    await placePrices.populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Place prices set successfully',
      data: {
        placePrices: {
          place: placePrices.place,
          price7Days: placePrices.price7Days / 100,
          price14Days: placePrices.price14Days / 100,
          price21Days: placePrices.price21Days / 100,
          price30Days: placePrices.price30Days / 100,
          updatedBy: placePrices.updatedBy,
          updatedAt: placePrices.updatedAt
        },
        dummyData: {
          example: {
            place: 'top',
            price7Days: 500,
            price14Days: 900,
            price21Days: 1200,
            price30Days: 1500
          }
        }
      }
    });

  } catch (error) {
    console.error('Set place prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set place prices',
      error: error.message
    });
  }
};

// 2. Get All Place Prices (Admin only)
exports.getAllPlacePrices = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view place prices'
      });
    }

    const placePrices = await OfferBannerPlace.find()
      .populate('updatedBy', 'name email')
      .sort({ place: 1 });

    // Convert paise to rupees for response
    const prices = placePrices.map(pp => ({
      place: pp.place,
      price7Days: pp.price7Days / 100,
      price14Days: pp.price14Days / 100,
      price21Days: pp.price21Days / 100,
      price30Days: pp.price30Days / 100,
      updatedBy: pp.updatedBy,
      updatedAt: pp.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        placePrices: prices,
        dummyData: {
          example: [
            {
              place: 'top',
              price7Days: 500,
              price14Days: 900,
              price21Days: 1200,
              price30Days: 1500,
              updatedBy: { name: 'Admin User', email: 'admin@example.com' },
              updatedAt: new Date()
            },
            {
              place: 'middle',
              price7Days: 300,
              price14Days: 550,
              price21Days: 750,
              price30Days: 1000,
              updatedBy: { name: 'Admin User', email: 'admin@example.com' },
              updatedAt: new Date()
            },
            {
              place: 'bottom',
              price7Days: 200,
              price14Days: 350,
              price21Days: 500,
              price30Days: 700,
              updatedBy: { name: 'Admin User', email: 'admin@example.com' },
              updatedAt: new Date()
            }
          ]
        }
      }
    });

  } catch (error) {
    console.error('Get place prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get place prices',
      error: error.message
    });
  }
};

// 3. Get All Offer Banners (Admin only)
exports.getAllOfferBanners = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { place } = req.query;

    // Check if admin or super admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all banners'
      });
    }

    const query = {};
    if (place && ['top', 'middle', 'bottom'].includes(place)) {
      query.place = place;
    }

    const banners = await OfferBanner.find(query)
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        banners: banners,
        dummyData: {
          example: [
            {
              _id: '507f1f77bcf86cd799439011',
              place: 'top',
              title: 'Summer Sale Banner',
              image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
              link: 'https://example.com/summer-sale',
              startDate: new Date('2024-06-01'),
              endDate: new Date('2024-06-30'),
              duration: 30,
              price: 150000,
              isPaid: true,
              paymentStatus: 'completed',
              isActive: true,
              isBannerUploaded: true,
              displayOrder: 1,
              uploadedBy: { name: 'Vendor Name', email: 'vendor@example.com', role: 'vendor' },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      }
    });

  } catch (error) {
    console.error('Get all offer banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get banners',
      error: error.message
    });
  }
};

// 4. Update Offer Banner (Admin only)
exports.updateOfferBanner = async (req, res) => {
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

    const banner = await OfferBanner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Update fields
    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;
    if (isActive !== undefined) banner.isActive = isActive;
    if (displayOrder !== undefined) banner.displayOrder = displayOrder;

    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      banner.startDate = start;
    }

    if (endDate !== undefined) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      banner.endDate = end;
    }

    if (banner.startDate > banner.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Handle image update
    if (req.file) {
      const oldImagePath = path.join(__dirname, '..', banner.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      banner.image = `/uploads/offer-banners/${req.file.filename}`;
    }

    await banner.save();
    await banner.populate('uploadedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: {
        banner: banner,
        dummyData: {
          example: {
            _id: '507f1f77bcf86cd799439011',
            place: 'top',
            title: 'Updated Banner Title',
            image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
            link: 'https://example.com/updated-link',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-30'),
            isActive: true,
            displayOrder: 1,
            uploadedBy: { name: 'Vendor Name', email: 'vendor@example.com', role: 'vendor' }
          }
        }
      }
    });

  } catch (error) {
    console.error('Update offer banner error:', error);
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/offer-banners', req.file.filename);
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

// 5. Delete Offer Banner (Admin only)
exports.deleteOfferBanner = async (req, res) => {
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

    const banner = await OfferBanner.findById(bannerId);
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

    await OfferBanner.findByIdAndDelete(bannerId);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: {
        dummyData: {
          example: {
            deletedBannerId: '507f1f77bcf86cd799439011',
            message: 'Banner and associated image file deleted successfully'
          }
        }
      }
    });

  } catch (error) {
    console.error('Delete offer banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};

// ==================== VENDOR/USER APIs ====================

// 6. Get Place Prices (Public - for vendors to see prices)
exports.getPlacePrices = async (req, res) => {
  try {
    const placePrices = await OfferBannerPlace.find().sort({ place: 1 });

    const prices = placePrices.map(pp => ({
      place: pp.place,
      price7Days: pp.price7Days / 100, // Convert paise to rupees
      price14Days: pp.price14Days / 100,
      price21Days: pp.price21Days / 100,
      price30Days: pp.price30Days / 100
    }));

    res.status(200).json({
      success: true,
      data: {
        placePrices: prices,
        dummyData: {
          example: [
            {
              place: 'top',
              price7Days: 500,
              price14Days: 900,
              price21Days: 1200,
              price30Days: 1500
            },
            {
              place: 'middle',
              price7Days: 300,
              price14Days: 550,
              price21Days: 750,
              price30Days: 1000
            },
            {
              place: 'bottom',
              price7Days: 200,
              price14Days: 350,
              price21Days: 500,
              price30Days: 700
            }
          ]
        }
      }
    });

  } catch (error) {
    console.error('Get place prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get place prices',
      error: error.message
    });
  }
};

// 7. Calculate Price Based on Duration
exports.calculatePrice = async (req, res) => {
  try {
    const { place, duration } = req.body;

    if (!place || !['top', 'middle', 'bottom'].includes(place)) {
      return res.status(400).json({
        success: false,
        message: 'Place must be top, middle, or bottom'
      });
    }

    if (!duration || ![7, 14, 21, 30].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be 7, 14, 21, or 30 days'
      });
    }

    const placePrice = await OfferBannerPlace.findOne({ place });
    if (!placePrice) {
      return res.status(404).json({
        success: false,
        message: 'Place prices not set for this place'
      });
    }

    let priceInPaise = 0;
    switch (duration) {
      case 7:
        priceInPaise = placePrice.price7Days;
        break;
      case 14:
        priceInPaise = placePrice.price14Days;
        break;
      case 21:
        priceInPaise = placePrice.price21Days;
        break;
      case 30:
        priceInPaise = placePrice.price30Days;
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        place,
        duration,
        priceInPaise,
        priceInRupees: priceInPaise / 100
      },
      dummyData: {
        example: {
          place: 'top',
          duration: 7,
          priceInPaise: 50000,
          priceInRupees: 500,
          currency: 'INR'
        }
      }
    });

  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate price',
      error: error.message
    });
  }
};

// 8. Purchase Banner Place Slot (Vendor/User - Payment First)
exports.purchaseBannerPlace = async (req, res) => {
  try {
    const userId = req.user._id;
    const { place, startDate, duration } = req.body;

    // Validate required fields
    if (!place || !['top', 'middle', 'bottom'].includes(place)) {
      return res.status(400).json({
        success: false,
        message: 'Place must be top, middle, or bottom'
      });
    }

    if (!duration || ![7, 14, 21, 30].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be 7, 14, 21, or 30 days'
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required'
      });
    }

    // Check if user is admin/superadmin (free for them)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    // Get place prices
    const placePrice = await OfferBannerPlace.findOne({ place });
    if (!placePrice && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Place prices not set for this place'
      });
    }

    // Calculate price
    let priceInPaise = 0;
    if (!isAdmin) {
      switch (duration) {
        case 7:
          priceInPaise = placePrice.price7Days;
          break;
        case 14:
          priceInPaise = placePrice.price14Days;
          break;
        case 21:
          priceInPaise = placePrice.price21Days;
          break;
        case 30:
          priceInPaise = placePrice.price30Days;
          break;
      }
    }

    // Validate dates
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    // Minimum 7 days check
    const now = new Date();
    const daysUntilStart = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    if (daysUntilStart < 0) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    // If admin/superadmin, create slot directly (free)
    if (isAdmin) {
      const banner = new OfferBanner({
        place,
        startDate: start,
        endDate: end,
        duration,
        price: 0,
        isPaid: true,
        paymentStatus: 'completed',
        uploadedBy: userId,
        uploadedByRole: user.role,
        isActive: true,
        isBannerUploaded: false, // Banner not uploaded yet
        purchaseDate: new Date()
      });

      await banner.save();

      return res.status(201).json({
        success: true,
        message: 'Banner place purchased successfully (Admin - Free). Now upload banner.',
        data: {
          bannerId: banner._id,
          place,
          duration,
          startDate: start,
          endDate: end,
          isBannerUploaded: false
        },
        dummyData: {
          example: {
            bannerId: '507f1f77bcf86cd799439011',
            place: 'top',
            duration: 30,
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-30'),
            isBannerUploaded: false,
            price: 0,
            isPaid: true,
            paymentStatus: 'completed'
          }
        }
      });
    }

    // For vendors/users, create payment order
    const receipt = `ob_${place}_${Date.now().toString().slice(-8)}_${userId
      .toString()
      .slice(-6)}`;

    const options = {
      amount: priceInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: userId.toString(),
        place,
        duration,
        startDate: startDate,
        purpose: 'offer_banner_purchase'
      }
    };

    const order = await razorpay.orders.create(options);

    // Create purchase slot (banner not uploaded yet)
    const banner = new OfferBanner({
      place,
      startDate: start,
      endDate: end,
      duration,
      price: priceInPaise,
      isPaid: false,
      paymentOrderId: order.id,
      paymentStatus: 'pending',
      uploadedBy: userId,
      uploadedByRole: user.role,
      isActive: false,
      isBannerUploaded: false
    });

    await banner.save();

    res.status(201).json({
      success: true,
      message: 'Payment order created. Complete payment to purchase banner place.',
      data: {
        bannerId: banner._id,
        orderId: order.id,
        amount: priceInPaise,
        amountRs: (priceInPaise / 100).toFixed(2),
        currency: 'INR',
        place,
        duration,
        startDate: start,
        endDate: end,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      },
      dummyData: {
        example: {
          bannerId: '507f1f77bcf86cd799439011',
          orderId: 'order_MN1234567890',
          amount: 150000,
          amountRs: '1500.00',
          currency: 'INR',
          place: 'top',
          duration: 30,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
          razorpayKeyId: 'rzp_test_1234567890'
        }
      }
    });

  } catch (error) {
    console.error('Purchase banner place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
};

// 8b. Upload Banner to Purchased Place (After Payment)
exports.uploadBannerToPurchasedPlace = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bannerId } = req.params;
    const { title, link } = req.body;

    // Validate required fields
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }

    // Find purchased banner slot
    const banner = await OfferBanner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner slot not found'
      });
    }

    // Check ownership
    if (banner.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload banner to your own purchased slot'
      });
    }

    // Check if payment is completed
    if (!banner.isPaid || banner.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Please complete payment first before uploading banner'
      });
    }

    // Check if banner already uploaded
    if (banner.isBannerUploaded && banner.image) {
      // Delete old image
      const oldImagePath = path.join(__dirname, '..', banner.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update banner with image
    banner.image = `/uploads/offer-banners/${req.file.filename}`;
    banner.isBannerUploaded = true;
    banner.isActive = true;

    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;

    await banner.save();
    await banner.populate('uploadedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Banner uploaded successfully',
      data: {
        banner: banner
      },
      dummyData: {
        example: {
          _id: '507f1f77bcf86cd799439011',
          place: 'top',
          title: 'Summer Sale Banner',
          image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
          link: 'https://example.com/summer-sale',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
          isBannerUploaded: true,
          isActive: true,
          uploadedBy: { name: 'Vendor Name', email: 'vendor@example.com', role: 'vendor' }
        }
      }
    });

  } catch (error) {
    console.error('Upload banner error:', error);
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/offer-banners', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload banner',
      error: error.message
    });
  }
};

// 9. Verify Payment and Activate Banner (Vendor/User)
exports.verifyPaymentAndActivateBanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bannerId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment details are required'
      });
    }

    const banner = await OfferBanner.findOne({
      _id: bannerId,
      paymentOrderId: razorpayOrderId,
      uploadedBy: userId
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      banner.paymentStatus = 'failed';
      await banner.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Payment verified - Activate purchase slot
    banner.isPaid = true;
    banner.paymentId = razorpayPaymentId;
    banner.paymentStatus = 'completed';
    banner.purchaseDate = new Date(); // Set purchase date for ordering (earlier purchase = first)
    banner.isActive = false; // Will be active after banner upload
    await banner.save();

    await banner.populate('uploadedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Now upload your banner image.',
      data: {
        bannerId: banner._id,
        place: banner.place,
        duration: banner.duration,
        startDate: banner.startDate,
        endDate: banner.endDate,
        isBannerUploaded: banner.isBannerUploaded,
        message: 'Use upload-banner API to upload banner image'
      },
      dummyData: {
        example: {
          bannerId: '507f1f77bcf86cd799439011',
          place: 'top',
          duration: 30,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
          isBannerUploaded: false,
          paymentStatus: 'completed',
          paymentId: 'pay_MN1234567890',
          isPaid: true
        }
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// 10. Get My Banners (Vendor/User)
exports.getMyBanners = async (req, res) => {
  try {
    const userId = req.user._id;

    const banners = await OfferBanner.find({ uploadedBy: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        banners: banners
      },
      dummyData: {
        example: [
          {
            _id: '507f1f77bcf86cd799439011',
            place: 'top',
            title: 'My Banner 1',
            image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
            link: 'https://example.com/banner1',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-30'),
            duration: 30,
            price: 150000,
            isPaid: true,
            paymentStatus: 'completed',
            isActive: true,
            isBannerUploaded: true,
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            _id: '507f1f77bcf86cd799439012',
            place: 'middle',
            title: 'My Banner 2',
            image: '/uploads/offer-banners/offer-banner-1234567891.jpg',
            link: 'https://example.com/banner2',
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-07-14'),
            duration: 14,
            price: 55000,
            isPaid: true,
            paymentStatus: 'completed',
            isActive: true,
            isBannerUploaded: true,
            displayOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    });

  } catch (error) {
    console.error('Get my banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get banners',
      error: error.message
    });
  }
};

// 11. Update My Offer Banner (Vendor/User - Only their own banners)
exports.updateMyOfferBanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bannerId } = req.params;
    const { title, link, startDate, endDate, isActive, displayOrder } = req.body;

    // Get banner and check ownership
    const banner = await OfferBanner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Check if user owns this banner
    if (banner.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own banners'
      });
    }

    // Update fields
    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;
    if (isActive !== undefined) banner.isActive = isActive;
    if (displayOrder !== undefined) banner.displayOrder = displayOrder;

    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      banner.startDate = start;
    }

    if (endDate !== undefined) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      banner.endDate = end;
    }

    if (banner.startDate > banner.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Handle image update
    if (req.file) {
      const oldImagePath = path.join(__dirname, '..', banner.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      banner.image = `/uploads/offer-banners/${req.file.filename}`;
    }

    await banner.save();
    await banner.populate('uploadedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: {
        banner: banner
      },
      dummyData: {
        example: {
          _id: '507f1f77bcf86cd799439011',
          place: 'top',
          title: 'Updated My Banner',
          image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
          link: 'https://example.com/updated-link',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
          isActive: true,
          displayOrder: 1,
          uploadedBy: { name: 'My Name', email: 'myemail@example.com', role: 'vendor' }
        }
      }
    });

  } catch (error) {
    console.error('Update my offer banner error:', error);
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/offer-banners', req.file.filename);
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

// 12. Delete My Offer Banner (Vendor/User - Only their own banners)
exports.deleteMyOfferBanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bannerId } = req.params;

    // Get banner and check ownership
    const banner = await OfferBanner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Check if user owns this banner
    if (banner.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own banners'
      });
    }

    // Delete image file
    const imagePath = path.join(__dirname, '..', banner.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete banner
    await OfferBanner.findByIdAndDelete(bannerId);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: {
        dummyData: {
          example: {
            deletedBannerId: '507f1f77bcf86cd799439011',
            message: 'Your banner and associated image file deleted successfully'
          }
        }
      }
    });

  } catch (error) {
    console.error('Delete my offer banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};

// 13. Get Active Banners by Place (Public - for frontend)
exports.getActiveBannersByPlace = async (req, res) => {
  try {
    const { place } = req.params;
    const now = new Date();

    if (!place || !['top', 'middle', 'bottom'].includes(place)) {
      return res.status(400).json({
        success: false,
        message: 'Place must be top, middle, or bottom'
      });
    }

    const banners = await OfferBanner.find({
      place,
      isActive: true,
      isPaid: true,
      paymentStatus: 'completed',
      isBannerUploaded: true, // Only show banners with uploaded image
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .select('title image link displayOrder startDate endDate')
      .sort({ purchaseDate: 1, displayOrder: 1 }); // Sort by purchase date first (earlier purchase = first), then by displayOrder

    res.status(200).json({
      success: true,
      data: {
        place,
        banners: banners,
        count: banners.length
      },
      dummyData: {
        example: {
          place: 'top',
          banners: [
            {
              _id: '507f1f77bcf86cd799439011',
              title: 'Active Banner 1',
              image: '/uploads/offer-banners/offer-banner-1234567890.jpg',
              link: 'https://example.com/banner1',
              displayOrder: 1,
              startDate: new Date('2024-06-01'),
              endDate: new Date('2024-06-30')
            },
            {
              _id: '507f1f77bcf86cd799439012',
              title: 'Active Banner 2',
              image: '/uploads/offer-banners/offer-banner-1234567891.jpg',
              link: 'https://example.com/banner2',
              displayOrder: 2,
              startDate: new Date('2024-06-15'),
              endDate: new Date('2024-07-15')
            }
          ],
          count: 2
        }
      }
    });

  } catch (error) {
    console.error('Get active banners by place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active banners',
      error: error.message
    });
  }
};

