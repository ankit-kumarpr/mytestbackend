const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOtp,
  login,
  registerSuperAdmin,
  registerAdmin,
  registerSalesPerson,
  refreshToken,
} = require('../controllers/authController');
const {
  addOrUpdateLocation,
  getUserLocation,
  deleteUserLocation,
  getUserProfile
} = require('../controllers/userLocationController');
const { authenticate, authorize } = require('../middelware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp); 
router.post('/login', login); 
router.post('/refresh-token', refreshToken); // Refresh access token
router.post('/register/superadmin', registerSuperAdmin); 

// Protected routes - Admin/Superadmin registration
router.post('/register/admin', authenticate, authorize('superadmin'), registerAdmin); // Admin registration (only super admin)
router.post('/register/salesperson', authenticate, authorize('superadmin', 'admin'), registerSalesPerson); // Sales person registration (admin or super admin)

// Protected routes - User Location Management
router.post('/add-location', authenticate, addOrUpdateLocation); // Add or update location
router.put('/update-location', authenticate, addOrUpdateLocation); // Update location (same as add)
router.get('/my-location', authenticate, getUserLocation); // Get own location
router.delete('/delete-location', authenticate, deleteUserLocation); // Delete location

// Public route - User Profile
router.get('/profile/:userId', getUserProfile); // Get user profile by ID

module.exports = router;

