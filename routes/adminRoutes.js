const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserDetails,
  getAllVendors,
  getVendorDetails,
  getPlatformStatistics
} = require('../controllers/adminReportController');
const { authenticate } = require('../middelware/auth');

// All routes are protected - Admin only

// Platform Statistics
router.get('/statistics', authenticate, getPlatformStatistics);

// Users Management
router.get('/users', authenticate, getAllUsers);
router.get('/users/:userId', authenticate, getUserDetails);

// Vendors Management
router.get('/vendors', authenticate, getAllVendors);
router.get('/vendors/:vendorId', authenticate, getVendorDetails);

module.exports = router;

