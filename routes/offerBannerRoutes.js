const express = require('express');
const router = express.Router();
const {
  // Admin APIs
  setPlacePrices,
  getAllPlacePrices,
  getAllOfferBanners,
  updateOfferBanner,
  deleteOfferBanner,
  // Public/Vendor APIs
  getPlacePrices,
  calculatePrice,
  purchaseBannerPlace,
  verifyPaymentAndActivateBanner,
  uploadBannerToPurchasedPlace,
  getMyBanners,
  updateMyOfferBanner,
  deleteMyOfferBanner,
  getActiveBannersByPlace,
  upload
} = require('../controllers/offerBannerController');
const { authenticate } = require('../middelware/auth');

// ==================== PUBLIC APIs ====================
// Get place prices (for vendors to see)
router.get('/place-prices', getPlacePrices);

// Get active banners by place (for frontend)
router.get('/active/:place', getActiveBannersByPlace);

// ==================== ADMIN APIs ====================
// Set place prices
router.post('/admin/set-place-prices', authenticate, setPlacePrices);

// Get all place prices (admin)
router.get('/admin/place-prices', authenticate, getAllPlacePrices);

// Get all offer banners (admin)
router.get('/admin/getallbanners', authenticate, getAllOfferBanners);

// Update offer banner (admin)
router.put('/admin/editbanner/:bannerId', authenticate, upload.single('image'), updateOfferBanner);

// Delete offer banner (admin)
router.delete('/admin/deletebanner/:bannerId', authenticate, deleteOfferBanner);

// ==================== VENDOR/USER APIs ====================
// Calculate price
router.post('/calculate-price', authenticate, calculatePrice);

// Purchase banner place (payment first - no image required)
router.post('/purchase-place', authenticate, purchaseBannerPlace);

// Upload banner to purchased place (after payment)
router.post('/upload-banner/:bannerId', authenticate, upload.single('image'), uploadBannerToPurchasedPlace);

// Verify payment and activate banner
router.post('/verify-payment/:bannerId', authenticate, verifyPaymentAndActivateBanner);

// Get my banners
router.get('/my-banners', authenticate, getMyBanners);

// Update my banner (vendor/user - only their own)
router.put('/editbanner/:bannerId', authenticate, upload.single('image'), updateMyOfferBanner);

// Delete my banner (vendor/user - only their own)
router.delete('/deletebanner/:bannerId', authenticate, deleteMyOfferBanner);

module.exports = router;

