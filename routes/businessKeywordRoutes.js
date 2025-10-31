const express = require('express');
const router = express.Router();
const {
  addKeywords,
  removeKeywords,
  getBusinessKeywords,
  getVendorAllKeywords,
  searchBusinessesByKeyword
} = require('../controllers/businessKeywordController');
const { authenticate } = require('../middelware/auth');

// Public Routes
router.get('/search', searchBusinessesByKeyword); // Search businesses by keyword (SEO)
router.get('/business/:businessId', getBusinessKeywords); // Get all keywords of a business

// Protected Routes - Vendor Only
router.post('/add/:businessId', authenticate, addKeywords); // Add keywords (single/multiple)
router.post('/remove/:businessId', authenticate, removeKeywords); // Remove keywords (single/multiple)
router.get('/my-keywords', authenticate, getVendorAllKeywords); // Get all vendor's keywords

module.exports = router;

