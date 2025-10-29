const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOtp,
  login,
  registerSuperAdmin,
  registerAdmin,
  registerSalesPerson,
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middelware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp); 
router.post('/login', login); 
router.post('/register/superadmin', registerSuperAdmin); 

// Protected routes
router.post('/register/admin', authenticate, authorize('superadmin'), registerAdmin); // Admin registration (only super admin)
router.post('/register/salesperson', authenticate, authorize('superadmin', 'admin'), registerSalesPerson); // Sales person registration (admin or super admin)

module.exports = router;

