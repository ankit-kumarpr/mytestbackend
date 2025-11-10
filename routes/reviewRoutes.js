const express = require("express");
const router = express.Router();
const {
  createVendorReview,
  updateReview,
  deleteReview,
  getVendorReviews,
  getAllReviews,
} = require("../controllers/reviewController");
const { authenticate } = require("../middelware/auth");

// Public - get vendor reviews
router.get("/vendor/:vendorId", getVendorReviews);

// Admin - get all reviews
router.get("/allreviews", authenticate, getAllReviews);

// User - create review for vendor
router.post("/vendor/:vendorId", authenticate, createVendorReview);

// Update review (user can update own, admin/superadmin can update any)
router.put("/updatereview/:reviewId", authenticate, updateReview);

// Delete review (user can delete own, admin/superadmin can delete any)
router.delete("/deletereview/:reviewId", authenticate, deleteReview);

module.exports = router;


