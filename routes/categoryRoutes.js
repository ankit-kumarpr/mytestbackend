const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middelware/auth');
const { uploadCategoryFile, uploadCategoryFileOptional } = require('../middelware/upload');

// Public routes (authenticated users can view)
router.get('/all',  getAllCategories);
router.get('/:id', authenticate, getCategoryById);

// Admin routes (only superadmin and admin)
router.post('/createcatgeory', authenticate, authorize('superadmin', 'admin'), uploadCategoryFile, createCategory);
router.put('/updatecategory/:id', authenticate, authorize('superadmin', 'admin'), uploadCategoryFileOptional, updateCategory);
router.delete('/deletecategory/:id', authenticate, authorize('superadmin', 'admin'), deleteCategory);

module.exports = router;

