const TermsCondition = require("../models/TermsCondition");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/terms-condition");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "terms-condition-" + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
}).array("images", 10);

const isAdminUser = (user) =>
  user && (user.role === "admin" || user.role === "superadmin");

const getImagePath = (filename) => `/uploads/terms-condition/${filename}`;

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
      // ignore parse error, fallback to comma-separated
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
        console.error("Failed to delete terms condition image:", err);
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

const fetchTerms = async () => TermsCondition.findOne().sort({ createdAt: -1 });

const populateTerms = async (doc) => {
  if (!doc) {
    return doc;
  }

  await doc.populate([
    { path: "createdBy", select: "name email role" },
    { path: "updatedBy", select: "name email role" },
  ]);

  return doc;
};

exports.createTermsCondition = async (req, res) => {
  const adminId = req.user._id;

  try {
    const { heading, content } = req.body;

    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can create terms & conditions",
      });
    }

    const existing = await fetchTerms();
    if (existing) {
      cleanupUploadedFiles(req.files);
      return res.status(409).json({
        success: false,
        message: "Terms & conditions already exist. Use update instead.",
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
      getImagePath(file.filename)
    );

    const terms = new TermsCondition({
      heading: heading.trim(),
      content: content.trim(),
      images: imagePaths,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await terms.save();
    await populateTerms(terms);

    return res.status(201).json({
      success: true,
      message: "Terms & conditions created successfully",
      data: terms,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);

    return res.status(500).json({
      success: false,
      message: "Failed to create terms & conditions",
      error: error.message,
    });
  }
};

exports.getTermsCondition = async (req, res) => {
  try {
    const terms = await fetchTerms();
    await populateTerms(terms);

    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch terms & conditions",
      error: error.message,
    });
  }
};

exports.updateTermsCondition = async (req, res) => {
  const adminId = req.user._id;

  try {
    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can update terms & conditions",
      });
    }

    const { heading, content } = req.body;

    const terms = await fetchTerms();

    if (!terms) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: "Terms & conditions not found",
      });
    }

    if (heading && heading.trim()) {
      terms.heading = heading.trim();
    }

    if (content && content.trim()) {
      terms.content = content.trim();
    }

    const imagesToRemove = parseRemoveImages(req.body.removeImages);
    if (imagesToRemove.length > 0) {
      terms.images = terms.images.filter((imagePath) => {
        const shouldRemove = imagesToRemove.includes(imagePath);
        if (shouldRemove) {
          deleteFilesystemImages([imagePath]);
        }
        return !shouldRemove;
      });
    }

    const newImages = (req.files || []).map((file) =>
      getImagePath(file.filename)
    );
    if (newImages.length > 0) {
      terms.images = terms.images.concat(newImages);
    }

    terms.updatedBy = adminId;
    await terms.save();
    await populateTerms(terms);

    return res.status(200).json({
      success: true,
      message: "Terms & conditions updated successfully",
      data: terms,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);

    return res.status(500).json({
      success: false,
      message: "Failed to update terms & conditions",
      error: error.message,
    });
  }
};

exports.deleteTermsCondition = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!isAdminUser(admin)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can delete terms & conditions",
      });
    }

    const terms = await fetchTerms();
    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Terms & conditions not found",
      });
    }

    deleteFilesystemImages(terms.images);

    await TermsCondition.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "Terms & conditions deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete terms & conditions",
      error: error.message,
    });
  }
};


