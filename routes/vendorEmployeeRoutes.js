const express = require('express');
const router = express.Router();
const {
  addIndividual,
  removeIndividual,
  getMyEmployees,
  getIndividualProfile
} = require('../controllers/vendorEmployeeController');
const { authenticate } = require('../middelware/auth');

// All routes require authentication
router.post('/add', authenticate, addIndividual);
router.delete('/remove/:individualId', authenticate, removeIndividual);
router.get('/my-employees', authenticate, getMyEmployees);
router.get('/profile/:individualId', authenticate, getIndividualProfile);

module.exports = router;

