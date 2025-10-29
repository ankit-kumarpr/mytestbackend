const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// Create Category (only superadmin and admin)
exports.createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const createdBy = req.user._id;

    // Validation
    if (!categoryName || categoryName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      categoryName: categoryName.trim() 
    });

    if (existingCategory) {
      // Delete uploaded file if category exists
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      // Delete uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Category image size must be less than 5MB'
      });
    }

    // Create category
    const categoryImagePath = `/uploads/category/${req.file.filename}`;

    const category = await Category.create({
      categoryName: categoryName.trim(),
      categoryImage: categoryImagePath,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Get All Categories (public - all authenticated users can view)
exports.getAllCategories = async (req, res) => {
  try {
    const { isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const categories = await Category.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get Single Category by ID (public)
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

// Update Category (only superadmin and admin)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      // If new image was uploaded but category not found, delete it
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updateData = {};

    // Update category name if provided
    if (categoryName !== undefined && categoryName.trim() !== '') {
      // Check if new name already exists (excluding current category)
      const existingCategory = await Category.findOne({
        categoryName: categoryName.trim(),
        _id: { $ne: id }
      });

      if (existingCategory) {
        // Delete uploaded file if new image was provided
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      updateData.categoryName = categoryName.trim();
    }

    // Update isActive if provided
    if (isActive !== undefined) {
      updateData.isActive = isActive === 'true' || isActive === true;
    }

    // Update category image if new file is provided
    if (req.file) {
      // Validate file size
      if (req.file.size > 5 * 1024 * 1024) {
        // Delete uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Category image size must be less than 5MB'
        });
      }

      // Delete old image
      if (category.categoryImage) {
        const oldFilePath = path.join(__dirname, '..', category.categoryImage);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      updateData.categoryImage = `/uploads/category/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete Category (only superadmin and admin)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Delete category image file
    if (category.categoryImage) {
      const imagePath = path.join(__dirname, '..', category.categoryImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete category
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

