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
  // New separate APIs for photos and video
  uploadBusinessPhotos,
  updateBusinessPhotos,
  getBusinessPhotos,
  deleteSingleBusinessPhoto,
  deleteAllBusinessPhotos,
  uploadBusinessVideo,
  getBusinessVideo,
} = require('../controllers/vendorProfileController');
const { authenticate } = require('../middelware/auth');
const { uploadVendorProfileFiles, uploadVendorPhotos, uploadVendorVideo } = require('../middelware/upload');

// Public route - anyone can view vendor profile
router.get('/getvendorprofile/:vendorId', getVendorProfile);

// Update route - Vendor can update own (by sending own vendorId), Admin/Superadmin can update any
// (Existing - keeps both photos and video upload functionality)
router.put('/updatevendorprofile/:vendorId', authenticate, uploadVendorProfileFiles, updateVendorProfile);

// ============================================
// NEW SEPARATE APIs FOR PHOTOS (CRUD)
// ============================================
// Upload Business Photos (Add new photos - appends to existing, max 10 total)
router.post('/photos/upload', authenticate, uploadVendorPhotos.array('photos', 10), uploadBusinessPhotos);

// Update/Replace All Business Photos (Replaces all existing photos with new ones)
router.put('/photos/update', authenticate, uploadVendorPhotos.array('photos', 10), updateBusinessPhotos);

// Get All Business Photos (with vendorId)
router.get('/photos/:vendorId', getBusinessPhotos);

// Get All Business Photos (without vendorId - uses logged-in user)
router.get('/photos', authenticate, getBusinessPhotos);

// Delete Single Business Photo
router.delete('/photos/delete', authenticate, deleteSingleBusinessPhoto);

// Delete All Business Photos
router.delete('/photos/delete-all', authenticate, deleteAllBusinessPhotos);

// ============================================
// NEW SEPARATE APIs FOR VIDEO (CRUD)
// ============================================
// Upload Business Video (Replaces existing video)
router.post('/video/upload', authenticate, uploadVendorVideo.single('video'), uploadBusinessVideo);

// Get Business Video (with vendorId)
router.get('/video/:vendorId', getBusinessVideo);

// Get Business Video (without vendorId - uses logged-in user)
router.get('/video', authenticate, getBusinessVideo);

// Delete Business Video (existing route - kept for backward compatibility)
router.delete('/deletebusinessvideo', authenticate, deleteBusinessVideo);

// ============================================
// OLD DELETE ROUTES (Kept for backward compatibility)
// ============================================
router.delete('/deletebusinessphoto', authenticate, deleteBusinessPhoto);

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

