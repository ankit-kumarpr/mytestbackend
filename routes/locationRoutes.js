const express = require('express');
const router = express.Router();
const {
  updateBusinessLocation,
  getBusinessLocation,
  getAllBusinessesLocation,
  updateBusinessLocationByAdmin
} = require('../controllers/locationController');
const { authenticate } = require('../middelware/auth');

// Vendor Routes
router.put('/business/:businessId', authenticate, updateBusinessLocation); // Update business location
router.get('/business/:businessId', authenticate, getBusinessLocation); // Get single business location
router.get('/my-businesses', authenticate, getAllBusinessesLocation); // Get all businesses with location status

// Admin Routes
router.put('/admin/business/:businessId', authenticate, updateBusinessLocationByAdmin); // Admin update location

module.exports = router;

