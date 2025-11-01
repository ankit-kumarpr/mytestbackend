const express = require('express');
const router = express.Router();
const {
  getHomeData
} = require('../controllers/homeController');

// Public route - No authentication required
router.get('/home', getHomeData);

module.exports = router;

