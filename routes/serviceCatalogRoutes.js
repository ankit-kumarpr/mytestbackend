const express = require('express');
const router = express.Router();
const {
  addService,
  getVendorServices,
  getServiceById,
  updateService,
  deleteService,
  deleteAttachment
} = require('../controllers/serviceCatalogController');
const { authenticate } = require('../middelware/auth');
const { uploadServiceFiles } = require('../middelware/upload');

// Public routes
router.get('/allservice/:vendorId', getVendorServices); // Get all services of a vendor
router.get('/singleservice/:serviceId', getServiceById); // Get single service by ID

// Protected routes (vendor only)
router.post('/serviceadd/:vendorId', authenticate, uploadServiceFiles, addService); // Add new service
router.put('/update-service/:serviceId', authenticate, uploadServiceFiles, updateService); // Update service
router.delete('/delete-service/:serviceId', authenticate, deleteService); // Delete service
router.delete('/attachmentdelte/:serviceId', authenticate, deleteAttachment); // Delete specific attachment

module.exports = router;

