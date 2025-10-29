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
} = require('../controllers/kycController');
const { authenticate, authorize } = require('../middelware/auth');
const { uploadKycFiles, uploadKycFilesOptional } = require('../middelware/upload');

// User routes (authenticated users)
router.post('/submit', authenticate, uploadKycFiles, submitKyc);
router.get('/my-kyc', authenticate, getMyKyc);
router.put('/update', authenticate, uploadKycFilesOptional, updateKyc); // Update KYC (files optional)

// Admin routes (superadmin, admin, salesperson)
router.get('/allkyc', authenticate, authorize('superadmin', 'admin', 'salesperson'), getAllKyc);
router.get('/singlekyc/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), getKycById);
router.put('/approve/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), approveKyc);
router.put('/reject/:id', authenticate, authorize('superadmin', 'admin', 'salesperson'), rejectKyc);

module.exports = router;

