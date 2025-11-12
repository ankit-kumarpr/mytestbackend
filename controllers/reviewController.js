const Review = require("../models/Review");
const User = require("../models/User");
const Lead = require("../models/Lead");
const LeadResponse = require("../models/LeadResponse");

const isAdminUser = (user) =>
  user && (user.role === "admin" || user.role === "superadmin");

const formatReviewResponse = (review) => ({
  id: review._id,
  vendor: review.vendorId
    ? {
        _id: review.vendorId._id,
        name: review.vendorId.name,
        email: review.vendorId.email,
        phone: review.vendorId.phone,
        role: review.vendorId.role,
      }
    : null,
  user: review.userId
    ? {
        _id: review.userId._id,
        name: review.userId.name,
        email: review.userId.email,
        phone: review.userId.phone,
        role: review.userId.role,
      }
    : null,
  rating: review.rating,
  comment: review.comment,
  status: review.status,
  approvedBy: review.approvedBy
    ? typeof review.approvedBy === "object"
      ? {
          _id: review.approvedBy._id,
          name: review.approvedBy.name,
          email: review.approvedBy.email,
          role: review.approvedBy.role,
        }
      : review.approvedBy
    : null,
  approvedAt: review.approvedAt,
  rejectedBy: review.rejectedBy
    ? typeof review.rejectedBy === "object"
      ? {
          _id: review.rejectedBy._id,
          name: review.rejectedBy.name,
          email: review.rejectedBy.email,
          role: review.rejectedBy.role,
        }
      : review.rejectedBy
    : null,
  rejectedAt: review.rejectedAt,
  rejectionReason: review.rejectionReason,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  editedAt: review.editedAt,
});

exports.createVendorReview = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Only users can submit reviews",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    const parsedRating = Number(rating);
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }

    // Check if vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Check if user has enquired about this vendor or received service from them
    // User can review if they have created a lead that matches this vendor
    // (This covers both enquiry and received service scenarios)
    const userLeads = await Lead.find({ userId, status: { $in: ["pending", "in-progress", "completed"] } });
    const leadIds = userLeads.map(lead => lead._id);

    // Check if there's a LeadResponse from this vendor for any of the user's leads
    // This means the user has enquired about this vendor's services
    // If status is "accepted", it means they received the service
    const vendorLeadResponse = await LeadResponse.findOne({
      leadId: { $in: leadIds },
      vendorId: vendor._id,
    });

    // User can review if they have enquired (created a lead that matches this vendor)
    // OR received the service (vendor accepted their lead response)
    if (!vendorLeadResponse) {
      return res.status(403).json({
        success: false,
        message: "You can only review vendors that you have enquired about or received service from. Please enquire about this vendor first.",
      });
    }

    // Check if review already exists for this vendor
    const existingReview = await Review.findOne({
      userId,
      vendorId,
      isDeleted: false,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Review already submitted for this vendor. Use update API instead.",
      });
    }

    // Create review with pending status (admin needs to approve)
    const review = new Review({
      vendorId: vendor._id,
      userId,
      rating: parsedRating,
      comment: comment ? comment.trim() : "",
      status: "pending", // Default status, admin will approve
    });

    await review.save();
    
    // Populate all related data
    await review.populate("userId", "name email phone role");
    await review.populate("vendorId", "name email phone role");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully and is pending admin approval",
      data: formatReviewResponse(review),
    });
  } catch (error) {
    console.error("Create review error:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this vendor",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only the user who created the review can update it
    const isOwner = review.userId.toString() === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews",
      });
    }

    // If review is approved, updating it will set status back to pending for admin approval
    if (review.status === "approved") {
      review.status = "pending";
      review.approvedBy = undefined;
      review.approvedAt = undefined;
    }

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a number between 1 and 5",
        });
      }
      review.rating = parsedRating;
    }

    if (comment !== undefined) {
      review.comment = comment ? comment.trim() : "";
    }

    review.editedBy = req.user._id;
    review.editedAt = new Date();

    await review.save();
    
    // Populate all related data
    await review.populate("userId", "name email phone role");
    await review.populate("vendorId", "name email phone role");

    return res.status(200).json({
      success: true,
      message: "Review updated successfully. It will be reviewed by admin again.",
      data: formatReviewResponse(review),
    });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only the user who created the review can delete it
    const isOwner = review.userId.toString() === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    review.isDeleted = true;
    review.deletedBy = req.user._id;
    review.deletedAt = new Date();
    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

exports.getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Only show approved reviews that are not deleted
    const reviews = await Review.find({
      vendorId,
      status: "approved",
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone role");

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews
            ).toFixed(2)
          )
        : 0;

    const ratingBreakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.forEach((review) => {
      ratingBreakdown[review.rating] =
        (ratingBreakdown[review.rating] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
        },
        summary: {
          totalReviews,
          averageRating,
          ratingBreakdown,
        },
        reviews: reviews.map(formatReviewResponse),
      },
    });
  } catch (error) {
    console.error("Get vendor reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor reviews",
      error: error.message,
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can view all reviews",
      });
    }

    const { status } = req.query; // Optional filter by status

    const query = { isDeleted: false };
    if (status) {
      query.status = status;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email phone role")
      .populate("vendorId", "name email phone role")
      .populate("approvedBy", "name email role")
      .populate("rejectedBy", "name email role");

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews.map(formatReviewResponse),
    });
  } catch (error) {
    console.error("Get all reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// Admin approve review
exports.approveReview = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can approve reviews",
      });
    }

    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Review is already approved",
      });
    }

    review.status = "approved";
    review.approvedBy = req.user._id;
    review.approvedAt = new Date();
    // Clear rejection data if any
    review.rejectedBy = undefined;
    review.rejectedAt = undefined;
    review.rejectionReason = undefined;

    await review.save();
    
    // Populate all related data
    await review.populate("userId", "name email phone role");
    await review.populate("vendorId", "name email phone role");
    await review.populate("approvedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Review approved successfully",
      data: formatReviewResponse(review),
    });
  } catch (error) {
    console.error("Approve review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve review",
      error: error.message,
    });
  }
};

// Admin reject review
exports.rejectReview = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or super admin can reject reviews",
      });
    }

    const { reviewId } = req.params;
    const { rejectionReason } = req.body;

    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Review is already rejected",
      });
    }

    review.status = "rejected";
    review.rejectedBy = req.user._id;
    review.rejectedAt = new Date();
    review.rejectionReason = rejectionReason ? rejectionReason.trim() : "";
    // Clear approval data if any
    review.approvedBy = undefined;
    review.approvedAt = undefined;

    await review.save();
    
    // Populate all related data
    await review.populate("userId", "name email phone role");
    await review.populate("vendorId", "name email phone role");
    await review.populate("rejectedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Review rejected successfully",
      data: formatReviewResponse(review),
    });
  } catch (error) {
    console.error("Reject review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject review",
      error: error.message,
    });
  }
};

// Get user's own reviews
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query; // Optional filter by status

    const query = { userId, isDeleted: false };
    if (status) {
      query.status = status;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .populate("vendorId", "name email phone role")
      .populate("approvedBy", "name email role")
      .populate("rejectedBy", "name email role");

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews.map(formatReviewResponse),
    });
  } catch (error) {
    console.error("Get my reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reviews",
      error: error.message,
    });
  }
};


