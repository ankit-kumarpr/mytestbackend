const express = require('express');
const router = express.Router();
const {
  getVendorProfile,
  updateVendorProfile,
  deleteBusinessPhoto,
  deleteBusinessVideo,
  createWebsiteLink,
  getWebsiteLink,
  updateWebsiteLink,
  deleteWebsiteLink,
  createSocialMediaLinks,
  getSocialMediaLinks,
  updateSocialMediaLinks,
  deleteSocialMediaLinks,
  getBusinessDetails,
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

// Website link CRUD
router.post('/addwebsite/:vendorId', authenticate, createWebsiteLink);
router.get('/viewwebsite/:vendorId', authenticate, getWebsiteLink);
router.put('/updatewebsite/:vendorId', authenticate, updateWebsiteLink);
router.delete('/deletewebsite/:vendorId', authenticate, deleteWebsiteLink);

// Social media links CRUD
router.post('/addsocial-links/:vendorId', authenticate, createSocialMediaLinks);
router.get('/getsocial-links/:vendorId', authenticate, getSocialMediaLinks);
router.put('/updatesocial-links/:vendorId', authenticate, updateSocialMediaLinks);
router.delete('/deletesocial-links/:vendorId', authenticate, deleteSocialMediaLinks);

// Business details
router.get('/business/:businessId', authenticate, getBusinessDetails);

module.exports = router;

