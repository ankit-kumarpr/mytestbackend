const express = require("express");
const router = express.Router();
const {
  createPrivacyPolicy,
  getPrivacyPolicy,
  updatePrivacyPolicy,
  deletePrivacyPolicy,
  upload,
} = require("../controllers/privacyPolicyController");
const { authenticate } = require("../middelware/auth");

router.get("/viewprivacypolicy", getPrivacyPolicy);
router.post("/createprivacypolicy", authenticate, upload, createPrivacyPolicy);
router.put("/updateprivacypolicy", authenticate, upload, updatePrivacyPolicy);
router.delete("/deleteprivacypolicy", authenticate, deletePrivacyPolicy);

module.exports = router;

