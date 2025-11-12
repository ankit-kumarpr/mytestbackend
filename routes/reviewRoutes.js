const express = require("express");
const router = express.Router();
const {
  createVendorReview,
  updateReview,
  deleteReview,
  getVendorReviews,
  getAllReviews,
  approveReview,
  rejectReview,
  getMyReviews,
} = require("../controllers/reviewController");
const { authenticate, authorize } = require("../middelware/auth");

// Public - get vendor reviews (only approved reviews)
router.get("/getvendorreviews/:vendorId", getVendorReviews);

// User - get my reviews
router.get("/my-reviews", authenticate, getMyReviews);

// User - create review for vendor (requires enquiry or received service)
router.post("/vendor/:vendorId", authenticate, createVendorReview);

// User - update own review
router.put("/updatereview/:reviewId", authenticate, updateReview);

// User - delete own review
router.delete("/deletereview/:reviewId", authenticate, deleteReview);

// Admin - get all reviews (with optional status filter)
router.get("/allreviews", authenticate, getAllReviews);

// Admin - approve review
router.put("/approve/:reviewId", authenticate, authorize("admin", "superadmin"), approveReview);

// Admin - reject review
router.put("/reject/:reviewId", authenticate, authorize("admin", "superadmin"), rejectReview);

module.exports = router;


