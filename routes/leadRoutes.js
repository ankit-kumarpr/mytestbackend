const express = require('express');
const router = express.Router();
const {
  searchKeywordSuggestions,
  searchVendorsByKeyword,
  submitLead,
  getUserLeads,
  getVendorLeads,
  respondToLead,
  getVendorLeadStats
} = require('../controllers/leadController');
const { authenticate } = require('../middelware/auth');

// Public Routes (No Radius)
router.get('/search-suggestions', searchKeywordSuggestions); // Get keyword suggestions only
router.get('/search-vendors', searchVendorsByKeyword); // Search vendors by keyword with full details

// User Routes (Protected)
router.post('/submit', authenticate, submitLead); // Submit lead/inquiry (Real-time with Socket.IO)
router.get('/my-leads', authenticate, getUserLeads); // Get user's submitted leads

// Vendor Routes (Protected)
router.get('/vendor/leads', authenticate, getVendorLeads); // Get all leads for vendor
router.post('/vendor/respond/:leadResponseId', authenticate, respondToLead); // Accept/Reject lead
router.get('/vendor/stats', authenticate, getVendorLeadStats); // Get vendor lead statistics

module.exports = router;

