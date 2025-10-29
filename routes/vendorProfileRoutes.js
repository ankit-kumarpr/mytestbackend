const express = require('express');
const router = express.Router();
const {
  getVendorProfile,
  updateVendorProfile,
  deleteBusinessPhoto,
  deleteBusinessVideo,
} = require('../controllers/vendorProfileController');
const { authenticate } = require('../middelware/auth');
const { uploadVendorProfileFiles } = require('../middelware/upload');

// Public route - anyone can view vendor profile
router.get('/getvendorprofile/:vendorId', getVendorProfile);

// Update route - Vendor can update own (by sending own vendorId), Admin/Superadmin can update any
router.put('/updatevendorprofile/:vendorId', authenticate, uploadVendorProfileFiles, updateVendorProfile);

// Delete routes - Only vendor can delete own photos/video
router.delete('/deletebusinessphoto', authenticate, deleteBusinessPhoto);
router.delete('/deletebusinessvideo', authenticate, deleteBusinessVideo);

module.exports = router;

