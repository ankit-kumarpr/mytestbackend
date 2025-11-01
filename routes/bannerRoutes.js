const express = require('express');
const router = express.Router();
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  upload
} = require('../controllers/bannerController');
const { authenticate } = require('../middelware/auth');

// Simple 4 APIs - All protected (Admin only)
router.get('/getallbanners', authenticate, getAllBanners);
router.post('/addbanner', authenticate, upload.single('image'), createBanner);
router.put('/editbanner/:bannerId', authenticate, upload.single('image'), updateBanner);
router.delete('/deletebanner/:bannerId', authenticate, deleteBanner);

module.exports = router;

