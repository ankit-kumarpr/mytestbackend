const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const aadharDir = path.join(uploadsDir, 'aadhar');
const videoDir = path.join(uploadsDir, 'video');

if (!fs.existsSync(aadharDir)) {
  fs.mkdirSync(aadharDir, { recursive: true });
}

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// Storage configuration for Aadhar images
const aadharStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, aadharDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'aadhar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for Video KYC
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-kyc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for Aadhar'), false);
  }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed for video KYC'), false);
  }
};

// Multer instances
const uploadAadhar = multer({
  storage: aadharStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for images
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max for videos
  }
});

// Middleware for KYC file uploads - handles both files together
const uploadKycFiles = (req, res, next) => {
  const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === 'aadharImage') {
        cb(null, aadharDir);
      } else if (file.fieldname === 'videoKyc') {
        cb(null, videoDir);
      } else {
        cb(new Error('Invalid field name'), null);
      }
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const prefix = file.fieldname === 'aadharImage' ? 'aadhar-' : 'video-kyc-';
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'aadharImage') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for Aadhar'), false);
      }
      cb(null, true);
    } else if (file.fieldname === 'videoKyc') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed for video KYC'), false);
      }
      cb(null, true);
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (will validate separately)
  }
}).fields([
  { name: 'aadharImage', maxCount: 1 },
  { name: 'videoKyc', maxCount: 1 }
]);

  upload(req, res, (err) => {
    if (err) {
      // Clean up any uploaded files on error
      if (req.files) {
        if (req.files.aadharImage) {
          req.files.aadharImage.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.videoKyc) {
          req.files.videoKyc.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading files'
      });
    }
    
    // Validate both files are present (for submit, not for update)
    if (!req.files || !req.files.aadharImage || req.files.aadharImage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aadhar image is required'
      });
    }
    
    if (!req.files || !req.files.videoKyc || req.files.videoKyc.length === 0) {
      // Clean up aadhar image
      if (req.files.aadharImage[0] && fs.existsSync(req.files.aadharImage[0].path)) {
        fs.unlinkSync(req.files.aadharImage[0].path);
      }
      return res.status(400).json({
        success: false,
        message: 'Video KYC is required'
      });
    }
    
    next();
  });
};

// Optional file uploads for KYC update (files are optional)
const uploadKycFilesOptional = (req, res, next) => {
  const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === 'aadharImage') {
        cb(null, aadharDir);
      } else if (file.fieldname === 'videoKyc') {
        cb(null, videoDir);
      } else {
        cb(new Error('Invalid field name'), null);
      }
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const prefix = file.fieldname === 'aadharImage' ? 'aadhar-' : 'video-kyc-';
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'aadharImage') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for Aadhar'), false);
      }
      cb(null, true);
    } else if (file.fieldname === 'videoKyc') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed for video KYC'), false);
      }
      cb(null, true);
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (will validate separately)
  }
}).fields([
  { name: 'aadharImage', maxCount: 1 },
  { name: 'videoKyc', maxCount: 1 }
]);

  upload(req, res, (err) => {
    if (err) {
      // Clean up any uploaded files on error
      if (req.files) {
        if (req.files.aadharImage) {
          req.files.aadharImage.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.videoKyc) {
          req.files.videoKyc.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading files'
      });
    }
    
    // Files are optional for update, so no validation needed here
    // Controller will handle whether to use new files or keep existing ones
    next();
  });
};

// Storage configuration for Category images
const categoryDir = path.join(uploadsDir, 'category');
if (!fs.existsSync(categoryDir)) {
  fs.mkdirSync(categoryDir, { recursive: true });
}

const categoryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, categoryDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for category images
const categoryImageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for category'), false);
  }
};

// Multer instance for category image
const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: categoryImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for category images
  }
});

// Middleware for category image upload (required)
const uploadCategoryFile = (req, res, next) => {
  const upload = uploadCategoryImage.single('categoryImage');
  
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading category image'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }
    
    next();
  });
};

// Middleware for category image upload (optional - for update)
const uploadCategoryFileOptional = (req, res, next) => {
  const upload = uploadCategoryImage.single('categoryImage');
  
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading category image'
      });
    }
    
    // File is optional for update, so no validation needed
    next();
  });
};

// Storage configuration for Vendor Business Photos
const vendorPhotosDir = path.join(uploadsDir, 'vendor/photos');
if (!fs.existsSync(vendorPhotosDir)) {
  fs.mkdirSync(vendorPhotosDir, { recursive: true });
}

// Storage configuration for Vendor Business Video
const vendorVideoDir = path.join(uploadsDir, 'vendor/video');
if (!fs.existsSync(vendorVideoDir)) {
  fs.mkdirSync(vendorVideoDir, { recursive: true });
}

const vendorPhotosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vendorPhotosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'business-photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const vendorVideoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vendorVideoDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'business-video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for photos
const vendorPhotoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for business photos'), false);
  }
};

// File filter for video
const vendorVideoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed for business video'), false);
  }
};

// Multer instances for vendor files
const uploadVendorPhotos = multer({
  storage: vendorPhotosStorage,
  fileFilter: vendorPhotoFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max for photos
  }
});

const uploadVendorVideo = multer({
  storage: vendorVideoStorage,
  fileFilter: vendorVideoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max for video
  }
});

// Middleware for vendor profile files (photos and video - all optional)
const uploadVendorProfileFiles = (req, res, next) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        if (file.fieldname === 'businessPhotos') {
          cb(null, vendorPhotosDir);
        } else if (file.fieldname === 'businessVideo') {
          cb(null, vendorVideoDir);
        } else {
          cb(new Error('Invalid field name'), null);
        }
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        if (file.fieldname === 'businessPhotos') {
          cb(null, 'business-photo-' + uniqueSuffix + path.extname(file.originalname));
        } else if (file.fieldname === 'businessVideo') {
          cb(null, 'business-video-' + uniqueSuffix + path.extname(file.originalname));
        } else {
          cb(new Error('Invalid field name'), null);
        }
      }
    }),
    fileFilter: function (req, file, cb) {
      if (file.fieldname === 'businessPhotos') {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed for business photos'), false);
        }
        cb(null, true);
      } else if (file.fieldname === 'businessVideo') {
        if (!file.mimetype.startsWith('video/')) {
          return cb(new Error('Only video files are allowed for business video'), false);
        }
        cb(null, true);
      } else {
        cb(new Error('Invalid field name'), false);
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB max
    }
  }).fields([
    { name: 'businessPhotos', maxCount: 10 }, // Max 10 photos
    { name: 'businessVideo', maxCount: 1 }
  ]);

  upload(req, res, (err) => {
    if (err) {
      // Clean up any uploaded files on error
      if (req.files) {
        if (req.files.businessPhotos) {
          req.files.businessPhotos.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.businessVideo) {
          req.files.businessVideo.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading files'
      });
    }
    
    // All files are optional, so no validation needed
    next();
  });
};

// Storage configuration for Service Catalog
const serviceCatalogDir = path.join(uploadsDir, 'services');
const serviceImagesDir = path.join(serviceCatalogDir, 'images');
const serviceAttachmentsDir = path.join(serviceCatalogDir, 'attachments');

if (!fs.existsSync(serviceImagesDir)) {
  fs.mkdirSync(serviceImagesDir, { recursive: true });
}

if (!fs.existsSync(serviceAttachmentsDir)) {
  fs.mkdirSync(serviceAttachmentsDir, { recursive: true });
}

// Middleware for service catalog files (service image and attachments)
const uploadServiceFiles = (req, res, next) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        if (file.fieldname === 'serviceImage') {
          cb(null, serviceImagesDir);
        } else if (file.fieldname === 'attachments') {
          cb(null, serviceAttachmentsDir);
        } else {
          cb(new Error('Invalid field name'), null);
        }
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        if (file.fieldname === 'serviceImage') {
          cb(null, 'service-image-' + uniqueSuffix + path.extname(file.originalname));
        } else if (file.fieldname === 'attachments') {
          cb(null, 'service-attachment-' + uniqueSuffix + path.extname(file.originalname));
        } else {
          cb(new Error('Invalid field name'), null);
        }
      }
    }),
    fileFilter: function (req, file, cb) {
      if (file.fieldname === 'serviceImage') {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed for service image'), false);
        }
        cb(null, true);
      } else if (file.fieldname === 'attachments') {
        // Allow images, PDFs, and common document types
        const allowedMimetypes = [
          'image/',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const isAllowed = allowedMimetypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);
        
        if (!isAllowed) {
          return cb(new Error('Only images, PDFs, and documents are allowed for attachments'), false);
        }
        cb(null, true);
      } else {
        cb(new Error('Invalid field name'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB max
    }
  }).fields([
    { name: 'serviceImage', maxCount: 1 },
    { name: 'attachments', maxCount: 10 } // Max 10 attachments
  ]);

  upload(req, res, (err) => {
    if (err) {
      // Clean up any uploaded files on error
      if (req.files) {
        if (req.files.serviceImage) {
          req.files.serviceImage.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.attachments) {
          req.files.attachments.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading files'
      });
    }
    
    // Files are optional, so no validation needed
    next();
  });
};

// Storage configuration for Ticket Images
const ticketImagesDir = path.join(uploadsDir, 'tickets');
if (!fs.existsSync(ticketImagesDir)) {
  fs.mkdirSync(ticketImagesDir, { recursive: true });
}

const ticketImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, ticketImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ticket-image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for ticket images
const ticketImageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for ticket images'), false);
  }
};

// Multer instance for ticket image (optional)
const uploadTicketImage = multer({
  storage: ticketImageStorage,
  fileFilter: ticketImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for ticket images
  }
});

// Middleware for ticket image upload (optional)
const uploadTicketImageFile = (req, res, next) => {
  const upload = uploadTicketImage.single('image');
  
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading ticket image'
      });
    }
    
    // Image is optional, so no validation needed
    next();
  });
};

module.exports = {
  uploadKycFiles,
  uploadKycFilesOptional,
  uploadAadhar,
  uploadVideo,
  uploadCategoryFile,
  uploadCategoryFileOptional,
  uploadCategoryImage,
  uploadVendorProfileFiles,
  uploadVendorPhotos,
  uploadVendorVideo,
  uploadServiceFiles,
  uploadTicketImageFile,
  uploadTicketImage
};

