const Review = require("../models/Review");
const User = require("../models/User");

const isAdminUser = (user) =>
  user && (user.role === "admin" || user.role === "superadmin");

const formatReviewResponse = (review) => ({
  id: review._id,
  vendorId: review.vendorId,
  user: review.userId
    ? {
        _id: review.userId._id,
        name: review.userId.name,
        email: review.userId.email,
        role: review.userId.role,
      }
    : null,
  rating: review.rating,
  comment: review.comment,
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

    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const existingReview = await Review.findOne({
      vendorId,
      userId,
      isDeleted: false,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Review already submitted. Use update API instead.",
      });
    }

    const review = new Review({
      vendorId,
      userId,
      rating: parsedRating,
      comment: comment ? comment.trim() : "",
    });

    await review.save();
    await review.populate("userId", "name email role");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: formatReviewResponse(review),
    });
  } catch (error) {
    console.error("Create review error:", error);
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

    const isOwner = review.userId.toString() === req.user._id.toString();
    const isAdmin = isAdminUser(req.user);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this review",
      });
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
    await review.populate("userId", "name email role");

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
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

    const isOwner = review.userId.toString() === req.user._id.toString();
    const isAdmin = isAdminUser(req.user);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this review",
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

    const reviews = await Review.find({
      vendorId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email role");

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

    const reviews = await Review.find({
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email role")
      .populate("vendorId", "name email role");

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews.map((review) => ({
        ...formatReviewResponse(review),
        vendor: review.vendorId
          ? {
              _id: review.vendorId._id,
              name: review.vendorId.name,
              email: review.vendorId.email,
              role: review.vendorId.role,
            }
          : null,
      })),
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


