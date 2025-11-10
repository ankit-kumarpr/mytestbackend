const PrivacyPolicy = require("../models/PrivacyPolicy");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/privacy-policy");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "privacy-policy-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

exports.upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
}).array("images", 10);

const isAdminUser = (user) =>
  user && (user.role === "admin" || user.role === "superadmin");

const getPrivacyImagePath = (filename) =>
  `/uploads/privacy-policy/${filename}`;

const parseRemoveImages = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (err) {
      // Ignore JSON parse error and fallback to comma separated
    }
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const deleteFilesystemImages = (images = []) => {
  images.forEach((imagePath) => {
    const absolutePath = path.join(__dirname, "..", imagePath);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error("Failed to delete privacy policy image:", err);
      }
    }
  });
};

const cleanupUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error("Failed to cleanup uploaded file:", err);
      }
    }
  });
};

const fetchSinglePolicy = async () => {
  return PrivacyPolicy.findOne().sort({ createdAt: -1 });
};

const populatePolicy = async (policy) => {
  if (!policy) {
    return policy;
  }

  await policy.populate([
    { path: "createdBy", select: "name email role" },
    { path: "updatedBy", select: "name email role" },
  ]);

  return policy;
};

// Create Privacy Policy (only if none exists)
exports.createPrivacyPolicy = async (req, res) => {
  const adminId = req.user._id;

  try {
    const { heading, content } = req.body;

    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can create privacy policy",
      });
    }

    const existingPolicy = await fetchSinglePolicy();
    if (existingPolicy) {
      cleanupUploadedFiles(req.files);
      return res.status(409).json({
        success: false,
        message: "Privacy policy already exists. Use update instead.",
      });
    }

    if (!heading || !heading.trim()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Heading is required",
      });
    }

    if (!content || !content.trim()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    const imagePaths = (req.files || []).map((file) =>
      getPrivacyImagePath(file.filename)
    );

    const privacyPolicy = new PrivacyPolicy({
      heading: heading.trim(),
      content: content.trim(),
      images: imagePaths,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await privacyPolicy.save();
    await populatePolicy(privacyPolicy);

    return res.status(201).json({
      success: true,
      message: "Privacy policy created successfully",
      data: privacyPolicy,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);

    return res.status(500).json({
      success: false,
      message: "Failed to create privacy policy",
      error: error.message,
    });
  }
};

// Get Privacy Policy (public)
exports.getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await fetchSinglePolicy();
    await populatePolicy(policy);

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch privacy policy",
      error: error.message,
    });
  }
};

// Update Privacy Policy
exports.updatePrivacyPolicy = async (req, res) => {
  const adminId = req.user._id;

  try {
    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can update privacy policy",
      });
    }

    const { heading, content } = req.body;

    const policy = await fetchSinglePolicy();

    if (!policy) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: "Privacy policy not found",
      });
    }

    if (heading && heading.trim()) {
      policy.heading = heading.trim();
    }

    if (content && content.trim()) {
      policy.content = content.trim();
    }

    const imagesToRemove = parseRemoveImages(req.body.removeImages);
    if (imagesToRemove.length > 0) {
      policy.images = policy.images.filter((imagePath) => {
        const shouldRemove = imagesToRemove.includes(imagePath);
        if (shouldRemove) {
          deleteFilesystemImages([imagePath]);
        }
        return !shouldRemove;
      });
    }

    const newImages = (req.files || []).map((file) =>
      getPrivacyImagePath(file.filename)
    );
    if (newImages.length > 0) {
      policy.images = policy.images.concat(newImages);
    }

    policy.updatedBy = adminId;
    await policy.save();
    await populatePolicy(policy);

    return res.status(200).json({
      success: true,
      message: "Privacy policy updated successfully",
      data: policy,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);

    return res.status(500).json({
      success: false,
      message: "Failed to update privacy policy",
      error: error.message,
    });
  }
};

// Delete Privacy Policy
exports.deletePrivacyPolicy = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!isAdminUser(admin)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can delete privacy policy",
      });
    }

    const policy = await fetchSinglePolicy();
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Privacy policy not found",
      });
    }

    deleteFilesystemImages(policy.images);

    await PrivacyPolicy.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "Privacy policy deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete privacy policy",
      error: error.message,
    });
  }
};


