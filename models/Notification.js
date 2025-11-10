const mongoose = require("mongoose");

const NotificationReplySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["vendor", "user", "admin", "superadmin"],
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const NotificationSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["service", "report", "normal"],
      required: true,
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    recipientType: {
      type: String,
      enum: ["single_vendor", "all_vendors", "single_user", "all_users"],
      required: true,
    },
    specificRecipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    replies: [NotificationReplySchema],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipientType: 1, createdAt: -1 });
NotificationSchema.index({ specificRecipients: 1 });
NotificationSchema.index({ type: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;


