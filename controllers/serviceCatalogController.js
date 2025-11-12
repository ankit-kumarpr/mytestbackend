const ServiceCatalog = require('../models/ServiceCatalog');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Add new service to catalog - Only vendor can add
exports.addService = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Check if user is vendor
    if (currentUser.role !== 'vendor') {
      // Clean up uploaded files
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'Only vendors can add services'
      });
    }

    // Vendor can only add service to their own catalog
    if (vendorId !== currentUserId.toString()) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'You can only add services to your own catalog'
      });
    }

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const {
      serviceName,
      priceType,
      actualPrice,
      discountPrice,
      unit,
      minPrice,
      maxPrice,
      quantityPricing,
      description
    } = req.body;

    // Validate required fields
    if (!serviceName || !priceType) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Service name and price type are required'
      });
    }

    // Validate price type
    if (!['single', 'range', 'quantity'].includes(priceType)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Invalid price type. Must be single, range, or quantity'
      });
    }

    // Build service data
    const serviceData = {
      vendorId,
      serviceName,
      priceType,
      description
    };

    // Handle service image
    if (req.files && req.files.serviceImage) {
      serviceData.serviceImage = req.files.serviceImage[0].path;
    }

    // Handle attachments
    if (req.files && req.files.attachments) {
      serviceData.attachments = req.files.attachments.map(file => file.path);
    }

    // Validate and add price fields based on price type
    if (priceType === 'single') {
      if (!actualPrice || !unit) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Actual price and unit are required for single price type'
        });
      }
      serviceData.actualPrice = parseFloat(actualPrice);
      serviceData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
      serviceData.unit = unit;
    } else if (priceType === 'range') {
      if (!minPrice || !maxPrice || !unit) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Min price, max price, and unit are required for range price type'
        });
      }
      serviceData.minPrice = parseFloat(minPrice);
      serviceData.maxPrice = parseFloat(maxPrice);
      serviceData.unit = unit;
    } else if (priceType === 'quantity') {
      if (!quantityPricing) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Quantity pricing data is required for quantity price type'
        });
      }
      // Parse quantity pricing if it's a string
      let parsedQuantityPricing;
      try {
        parsedQuantityPricing = typeof quantityPricing === 'string' 
          ? JSON.parse(quantityPricing) 
          : quantityPricing;
      } catch (error) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity pricing format'
        });
      }

      if (!Array.isArray(parsedQuantityPricing) || parsedQuantityPricing.length === 0) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Quantity pricing must be a non-empty array'
        });
      }

      serviceData.quantityPricing = parsedQuantityPricing;
    }

    // Create service
    const service = await ServiceCatalog.create(serviceData);

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      data: service
    });

  } catch (error) {
    console.error('Add service error:', error);
    cleanupUploadedFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Failed to add service',
      error: error.message
    });
  }
};

// Get all services for a vendor - Public route
exports.getVendorServices = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const services = await ServiceCatalog.find({ vendorId })
      .populate('vendorId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });

  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
};

// Get single service by ID - Public route
exports.getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await ServiceCatalog.findById(serviceId)
      .populate('vendorId', 'name email phone');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
};

// Update service - Only vendor can update their own service
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Find service
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user is vendor and owns this service
    if (currentUser.role !== 'vendor' || service.vendorId.toString() !== currentUserId.toString()) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services'
      });
    }

    const {
      serviceName,
      priceType,
      actualPrice,
      discountPrice,
      unit,
      minPrice,
      maxPrice,
      quantityPricing,
      description
    } = req.body;

    const updateData = {};

    if (serviceName !== undefined) updateData.serviceName = serviceName;
    if (description !== undefined) updateData.description = description;
    if (priceType !== undefined) {
      if (!['single', 'range', 'quantity'].includes(priceType)) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: 'Invalid price type'
        });
      }
      updateData.priceType = priceType;
    }

    // Handle service image update
    if (req.files && req.files.serviceImage) {
      // Delete old image if exists
      if (service.serviceImage && fs.existsSync(service.serviceImage)) {
        fs.unlinkSync(service.serviceImage);
      }
      updateData.serviceImage = req.files.serviceImage[0].path;
    }

    // Handle attachments update - append new attachments to existing ones
    if (req.files && req.files.attachments) {
      const newAttachments = req.files.attachments.map(file => file.path);
      // If service already has attachments, append new ones
      if (service.attachments && service.attachments.length > 0) {
        updateData.attachments = [...service.attachments, ...newAttachments];
      } else {
        updateData.attachments = newAttachments;
      }
    }

    // Update price fields based on type
    const finalPriceType = priceType || service.priceType;

    if (finalPriceType === 'single') {
      if (actualPrice !== undefined) updateData.actualPrice = parseFloat(actualPrice);
      if (discountPrice !== undefined) updateData.discountPrice = parseFloat(discountPrice);
      if (unit !== undefined) updateData.unit = unit;
      // Clear other price type fields
      updateData.minPrice = null;
      updateData.maxPrice = null;
      updateData.quantityPricing = [];
    } else if (finalPriceType === 'range') {
      if (minPrice !== undefined) updateData.minPrice = parseFloat(minPrice);
      if (maxPrice !== undefined) updateData.maxPrice = parseFloat(maxPrice);
      if (unit !== undefined) updateData.unit = unit;
      // Clear other price type fields
      updateData.actualPrice = null;
      updateData.discountPrice = null;
      updateData.quantityPricing = [];
    } else if (finalPriceType === 'quantity') {
      if (quantityPricing !== undefined) {
        let parsedQuantityPricing;
        try {
          parsedQuantityPricing = typeof quantityPricing === 'string' 
            ? JSON.parse(quantityPricing) 
            : quantityPricing;
        } catch (error) {
          cleanupUploadedFiles(req.files);
          return res.status(400).json({
            success: false,
            message: 'Invalid quantity pricing format'
          });
        }
        updateData.quantityPricing = parsedQuantityPricing;
      }
      // Clear other price type fields
      updateData.actualPrice = null;
      updateData.discountPrice = null;
      updateData.minPrice = null;
      updateData.maxPrice = null;
      updateData.unit = null;
    }

    // Update service
    const updatedService = await ServiceCatalog.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendorId', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });

  } catch (error) {
    console.error('Update service error:', error);
    cleanupUploadedFiles(req.files);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
};

// Delete service - Only vendor can delete their own service
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Find service
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user is vendor and owns this service
    if (currentUser.role !== 'vendor' || service.vendorId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own services'
      });
    }

    // Delete service image
    if (service.serviceImage && fs.existsSync(service.serviceImage)) {
      fs.unlinkSync(service.serviceImage);
    }

    // Delete attachments
    if (service.attachments && service.attachments.length > 0) {
      service.attachments.forEach(attachment => {
        if (fs.existsSync(attachment)) {
          fs.unlinkSync(attachment);
        }
      });
    }

    // Delete service
    await ServiceCatalog.findByIdAndDelete(serviceId);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message
    });
  }
};

// Delete attachment(s) from service - supports single or multiple attachments
exports.deleteAttachment = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { attachmentPaths } = req.body; // Can be a single path string or array of paths
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Convert single path to array for uniform handling
    let pathsToDelete = [];
    if (attachmentPaths) {
      pathsToDelete = Array.isArray(attachmentPaths) ? attachmentPaths : [attachmentPaths];
    }

    // Also support the old 'attachmentPath' field for backward compatibility
    if (!pathsToDelete.length && req.body.attachmentPath) {
      pathsToDelete = Array.isArray(req.body.attachmentPath) 
        ? req.body.attachmentPath 
        : [req.body.attachmentPath];
    }

    if (!pathsToDelete || pathsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attachment path(s) are required. Send attachmentPaths as array or single string.'
      });
    }

    // Find service
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user is vendor and owns this service
    if (currentUser.role !== 'vendor' || service.vendorId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete attachments from your own services'
      });
    }

    // Validate that all paths exist in service attachments
    const missingPaths = pathsToDelete.filter(path => !service.attachments.includes(path));
    if (missingPaths.length > 0) {
      return res.status(404).json({
        success: false,
        message: `Some attachments not found in this service: ${missingPaths.join(', ')}`,
        missingPaths
      });
    }

    // Delete files from filesystem and track results
    const deletedPaths = [];
    const failedPaths = [];

    pathsToDelete.forEach(attachmentPath => {
      try {
        // Delete file from filesystem
        if (fs.existsSync(attachmentPath)) {
          fs.unlinkSync(attachmentPath);
          deletedPaths.push(attachmentPath);
        } else {
          // File doesn't exist on filesystem, but remove from database anyway
          deletedPaths.push(attachmentPath);
        }
      } catch (error) {
        console.error(`Error deleting file ${attachmentPath}:`, error);
        failedPaths.push(attachmentPath);
      }
    });

    // Remove deleted attachments from array
    service.attachments = service.attachments.filter(att => !deletedPaths.includes(att));
    await service.save();

    // Prepare response message
    const message = deletedPaths.length === 1
      ? 'Attachment deleted successfully'
      : `${deletedPaths.length} attachments deleted successfully`;

    const response = {
      success: true,
      message,
      deletedCount: deletedPaths.length,
      deletedPaths,
      data: service
    };

    // Include failed paths if any
    if (failedPaths.length > 0) {
      response.failedPaths = failedPaths;
      response.warning = `Some files could not be deleted from filesystem: ${failedPaths.join(', ')}`;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment(s)',
      error: error.message
    });
  }
};

// Helper function to clean up uploaded files
function cleanupUploadedFiles(files) {
  if (!files) return;
  
  if (files.serviceImage) {
    files.serviceImage.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
  
  if (files.attachments) {
    files.attachments.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
}

