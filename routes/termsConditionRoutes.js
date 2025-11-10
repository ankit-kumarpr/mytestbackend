const express = require("express");
const router = express.Router();
const {
  createTermsCondition,
  getTermsCondition,
  updateTermsCondition,
  deleteTermsCondition,
  upload,
} = require("../controllers/termsConditionController");
const { authenticate } = require("../middelware/auth");

router.get("/viewtermscondition", getTermsCondition);
router.post("/createtermscondition", authenticate, upload, createTermsCondition);
router.put("/updatetermscondition", authenticate, upload, updateTermsCondition);
router.delete("/deletetermscondition", authenticate, deleteTermsCondition);

module.exports = router;


