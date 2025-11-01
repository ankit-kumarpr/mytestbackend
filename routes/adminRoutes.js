const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getAllVendors,
  getVendorDetails,
  updateVendor,
  deleteVendor,
  getPlatformStatistics
} = require('../controllers/adminReportController');
const { authenticate } = require('../middelware/auth');

// All routes are protected - Admin only

// Platform Statistics
router.get('/statistics', authenticate, getPlatformStatistics);

// Users Management
router.get('/users', authenticate, getAllUsers);
router.get('/users/:userId', authenticate, getUserDetails);
router.put('/updateuser/:userId', authenticate, updateUser);
router.delete('/deluser/:userId', authenticate, deleteUser);

// Vendors Management
router.get('/vendors', authenticate, getAllVendors);
router.get('/vendors/:vendorId', authenticate, getVendorDetails);
router.put('/updatevendor/:vendorId', authenticate, updateVendor);
router.delete('/delvendor/:vendorId', authenticate, deleteVendor);

module.exports = router;

