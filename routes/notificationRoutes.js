const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  getNotificationById,
  replyToNotification,
  updateNotification,
  deleteNotification,
  upload,
} = require("../controllers/notificationController");
const { authenticate } = require("../middelware/auth");

router.get("/getallnotification", authenticate, getNotifications);
router.get("/singlenotification/:notificationId", authenticate, getNotificationById);
router.post("/sendnotification", authenticate, upload, createNotification);
router.post("/ownreply/:notificationId/reply", authenticate, replyToNotification);
router.put("/updatenotification/:notificationId", authenticate, upload, updateNotification);
router.delete("/deletenotification/:notificationId", authenticate, deleteNotification);

module.exports = router;


