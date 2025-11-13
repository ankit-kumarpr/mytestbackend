const express = require('express');
const router = express.Router();
const {
  submitKyc,
  getMyKyc,
  getAllKyc,
  getKycById,
  approveKyc,
  rejectKyc,
  updateKyc,
  updateBusinessTimings,
  updateBusinessName,
  updateContactDetails,
  updateBusinessAddress,
  updatePersonalAddress,
} = require('../controllers/kycController');
const { authenticate, authorize } = require('../middelware/auth');
const { uploadKycFiles, uploadKycFilesOptional } = require('../middelware/upload');

// User routes (authenticated users)
router.post('/submit', authenticate, uploadKycFiles, submitKyc);
router.get('/my-kyc', authenticate, getMyKyc);
router.put('/update', authenticate, uploadKycFilesOptional, updateKyc); // Update KYC (files optional)

// Business Update Routes (Vendor/Individual) - For Approved KYC
router.put('/businesstimings/:businessId', authenticate, updateBusinessTimings); // Update business timings
router.put('/businessname/:businessId', authenticate, updateBusinessName); // Update business name
router.put('/business/:businessId/contact', authenticate, updateContactDetails); // Update contact details
router.put('/businessaddress/:businessId', authenticate, updateBusinessAddress); // Update business address (vendor)
router.put('/personaladdress/:businessId', authenticate, updatePersonalAddress); // Update personal address (individual)

// Admin routes (superadmin, admin, salesperson)
router.get('/allkyc', authenticate, authorize('superadmin', 'admin', 'salesperson'), getAllKyc);
router.get('/singlekyc/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), getKycById);
router.put('/approve/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), approveKyc);
router.put('/reject/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), rejectKyc);

module.exports = router;

