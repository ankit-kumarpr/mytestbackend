const Notification = require("../models/Notification");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/notifications");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "notification-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed!"), false);
  }
};

exports.upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
}).array("attachments", 5);

const isAdminUser = (user) =>
  user && (user.role === "admin" || user.role === "superadmin");

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

const getAttachmentPath = (filename) =>
  `/uploads/notifications/${filename}`;

const parseRecipientIds = (value) => {
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
      // ignore parse error and fallback to comma separated
    }
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
};

const checkNotificationAccess = (notification, user) => {
  const role = user.role;
  const userId = user._id.toString();

  if (isAdminUser(user)) {
    return true;
  }

  if (role === "vendor") {
    if (notification.recipientType === "all_vendors") {
      return true;
    }
    if (
      notification.recipientType === "single_vendor" &&
      notification.specificRecipients.some(
        (recipientId) => recipientId.toString() === userId
      )
    ) {
      return true;
    }
  }

  if (role === "user") {
    if (notification.recipientType === "all_users") {
      return true;
    }
    if (
      notification.recipientType === "single_user" &&
      notification.specificRecipients.some(
        (recipientId) => recipientId.toString() === userId
      )
    ) {
      return true;
    }
  }

  return false;
};

exports.createNotification = async (req, res) => {
  const adminId = req.user._id;

  try {
    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can send notifications",
      });
    }

    const { subject, content, type, recipientType } = req.body;

    if (!subject || !subject.trim()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!content || !content.trim()) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    if (!type || !["service", "report", "normal"].includes(type)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: "Type must be service, report, or normal",
      });
    }

    if (
      !recipientType ||
      !["single_vendor", "all_vendors", "single_user", "all_users"].includes(
        recipientType
      )
    ) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message:
          "Recipient type must be one of single_vendor, all_vendors, single_user, all_users",
      });
    }

    let specificRecipients = [];
    const recipientIds = parseRecipientIds(req.body.recipientIds || req.body.recipientId);

    if (recipientType === "single_vendor" || recipientType === "single_user") {
      if (recipientIds.length !== 1) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: "Exactly one recipient ID is required for single recipient notifications",
        });
      }

      const targetUser = await User.findById(recipientIds[0]);
      if (!targetUser) {
        cleanupUploadedFiles(req.files);
        return res.status(404).json({
          success: false,
          message: "Recipient user not found",
        });
      }

      const expectedRole = recipientType === "single_vendor" ? "vendor" : "user";
      if (targetUser.role !== expectedRole) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: `Recipient must be a ${expectedRole}`,
        });
      }

      specificRecipients = [targetUser._id];
    } else {
      specificRecipients = [];
    }

    const attachments = (req.files || []).map((file) =>
      getAttachmentPath(file.filename)
    );

    const notification = new Notification({
      subject: subject.trim(),
      content: content.trim(),
      type,
      recipientType,
      specificRecipients,
      attachments,
      sentBy: adminId,
    });

    await notification.save();
    await notification.populate([
      { path: "sentBy", select: "name email role" },
      { path: "specificRecipients", select: "name email role" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.message,
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const role = user.role;
    const userId = user._id;

    const { type } = req.query;
    const query = {};

    if (type && ["service", "report", "normal"].includes(type)) {
      query.type = type;
    }

    let notificationsQuery;

    if (isAdminUser(user)) {
      notificationsQuery = Notification.find({
        ...query,
        isDeleted: false,
      });
    } else if (role === "vendor") {
      notificationsQuery = Notification.find({
        ...query,
        isDeleted: false,
        $or: [
          { recipientType: "all_vendors" },
          {
            recipientType: "single_vendor",
            specificRecipients: userId,
          },
        ],
      });
    } else if (role === "user") {
      notificationsQuery = Notification.find({
        ...query,
        isDeleted: false,
        $or: [
          { recipientType: "all_users" },
          {
            recipientType: "single_user",
            specificRecipients: userId,
          },
        ],
      });
    } else {
      notificationsQuery = Notification.find({ _id: null });
    }

    const notifications = await notificationsQuery
      .populate("sentBy", "name email role")
      .populate("specificRecipients", "name email role")
      .populate("replies.repliedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const user = req.user;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    })
      .populate("sentBy", "name email role")
      .populate("specificRecipients", "name email role")
      .populate("replies.repliedBy", "name email role");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const hasAccess = checkNotificationAccess(notification, user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this notification",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification",
      error: error.message,
    });
  }
};

exports.replyToNotification = async (req, res) => {
  try {
    const user = req.user;
    const { notificationId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    if (!["vendor", "user"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only vendors or users can reply to notifications",
      });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    })
      .populate("sentBy", "name email role")
      .populate("specificRecipients", "name email role")
      .populate("replies.repliedBy", "name email role");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const hasAccess = checkNotificationAccess(notification, user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this notification",
      });
    }

    notification.replies.push({
      message: message.trim(),
      repliedBy: user._id,
      role: user.role,
    });

    await notification.save();
    await notification.populate("replies.repliedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add reply",
      error: error.message,
    });
  }
};

exports.updateNotification = async (req, res) => {
  const adminId = req.user._id;

  try {
    const admin = await User.findById(adminId);
    if (!isAdminUser(admin)) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can update notifications",
      });
    }

    const { notificationId } = req.params;
    const { subject, content, type, recipientType } = req.body;

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    });

    if (!notification) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (subject !== undefined) {
      if (!subject || !subject.trim()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: "Subject cannot be empty",
        });
      }
      notification.subject = subject.trim();
    }

    if (content !== undefined) {
      if (!content || !content.trim()) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: "Content cannot be empty",
        });
      }
      notification.content = content.trim();
    }

    if (type !== undefined) {
      if (!["service", "report", "normal"].includes(type)) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: "Type must be service, report, or normal",
        });
      }
      notification.type = type;
    }

    if (recipientType !== undefined) {
      if (
        !["single_vendor", "all_vendors", "single_user", "all_users"].includes(
          recipientType
        )
      ) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message:
            "Recipient type must be one of single_vendor, all_vendors, single_user, all_users",
        });
      }

      let specificRecipients = [];
      if (
        recipientType === "single_vendor" ||
        recipientType === "single_user"
      ) {
        const recipientIds = parseRecipientIds(
          req.body.recipientIds || req.body.recipientId
        );

        if (recipientIds.length !== 1) {
          cleanupUploadedFiles(req.files);
          return res.status(400).json({
            success: false,
            message:
              "Exactly one recipient ID is required for single recipient notifications",
          });
        }

        const targetUser = await User.findById(recipientIds[0]);
        if (!targetUser) {
          cleanupUploadedFiles(req.files);
          return res.status(404).json({
            success: false,
            message: "Recipient user not found",
          });
        }

        const expectedRole =
          recipientType === "single_vendor" ? "vendor" : "user";
        if (targetUser.role !== expectedRole) {
          cleanupUploadedFiles(req.files);
          return res.status(400).json({
            success: false,
            message: `Recipient must be a ${expectedRole}`,
          });
        }

        specificRecipients = [targetUser._id];
      }

      notification.recipientType = recipientType;
      notification.specificRecipients = specificRecipients;
    }

    if (req.body.removeAttachments) {
      const attachmentsToRemove = parseRecipientIds(req.body.removeAttachments);

      if (attachmentsToRemove.length > 0) {
        notification.attachments = notification.attachments.filter(
          (attachmentPath) => {
            const shouldRemove = attachmentsToRemove.includes(attachmentPath);
            if (shouldRemove) {
              const absolutePath = path.join(__dirname, "..", attachmentPath);
              if (fs.existsSync(absolutePath)) {
                try {
                  fs.unlinkSync(absolutePath);
                } catch (err) {
                  console.error("Failed to remove notification attachment:", err);
                }
              }
            }
            return !shouldRemove;
          }
        );
      }
    }

    const newAttachments = (req.files || []).map((file) =>
      getAttachmentPath(file.filename)
    );
    if (newAttachments.length > 0) {
      notification.attachments = notification.attachments.concat(
        newAttachments
      );
    }

    await notification.save();
    await notification.populate([
      { path: "sentBy", select: "name email role" },
      { path: "specificRecipients", select: "name email role" },
      { path: "replies.repliedBy", select: "name email role" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!isAdminUser(admin)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can delete notifications",
      });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isDeleted = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};


