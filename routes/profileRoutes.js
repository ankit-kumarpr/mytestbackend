const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateProfile
} = require('../controllers/profileController');
const { authenticate } = require('../middelware/auth');

// All routes are protected - requires authentication

// Get complete profile (works for User/Vendor/Admin)
router.get('/me', authenticate, getMyProfile);

// Update basic profile info (name, phone)
router.put('/update', authenticate, updateProfile);

module.exports = router;

