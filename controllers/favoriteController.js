const Favorite = require("../models/Favorite");
const User = require("../models/User");
const ServiceCatalog = require("../models/ServiceCatalog");

// Add to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.body;

    // Validation
    if (!itemType || !["vendor", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Item type is required and must be 'vendor' or 'service'",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    // Check if item exists
    if (itemType === "vendor") {
      const vendor = await User.findById(itemId);
      if (!vendor || vendor.role !== "vendor") {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }
    } else if (itemType === "service") {
      const service = await ServiceCatalog.findById(itemId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      userId,
      itemType,
      itemId,
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: "Item is already in favorites",
      });
    }

    // Create favorite
    const favorite = new Favorite({
      userId,
      itemType,
      itemId,
      itemTypeModel: itemType === "vendor" ? "User" : "ServiceCatalog",
    });

    await favorite.save();

    // Populate item data
    await favorite.populate(
      itemType === "vendor"
        ? { path: "itemId", select: "name email phone role" }
        : {
            path: "itemId",
            select:
              "serviceName serviceImage priceType actualPrice discountPrice minPrice maxPrice unit description vendorId",
            populate: { path: "vendorId", select: "name email phone" },
          }
    );

    return res.status(201).json({
      success: true,
      message: "Item added to favorites successfully",
      data: favorite,
    });
  } catch (error) {
    console.error("Add to favorites error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Item is already in favorites",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add to favorites",
      error: error.message,
    });
  }
};

// Remove from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.body;

    // Validation
    if (!itemType || !["vendor", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Item type is required and must be 'vendor' or 'service'",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    // Find and delete favorite
    const favorite = await Favorite.findOneAndDelete({
      userId,
      itemType,
      itemId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: "Item not found in favorites",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item removed from favorites successfully",
    });
  } catch (error) {
    console.error("Remove from favorites error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove from favorites",
      error: error.message,
    });
  }
};

// Get all favorites
exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { userId };
    if (itemType && ["vendor", "service"].includes(itemType)) {
      query.itemType = itemType;
    }

    // Get favorites with pagination
    let favorites = await Favorite.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Populate items based on type
    const favoritesArray = favorites.map((fav) => fav.toObject());
    const populatedFavorites = await Promise.all(
      favoritesArray.map(async (favorite) => {
        if (favorite.itemType === "vendor") {
          const vendor = await User.findById(favorite.itemId).select(
            "name email phone role"
          );
          if (vendor && vendor.role === "vendor") {
            favorite.itemId = vendor;
            return favorite;
          }
          return null;
        } else if (favorite.itemType === "service") {
          const service = await ServiceCatalog.findById(favorite.itemId)
            .select(
              "serviceName serviceImage priceType actualPrice discountPrice minPrice maxPrice unit description vendorId attachments"
            )
            .populate("vendorId", "name email phone");
          if (service) {
            favorite.itemId = service;
            return favorite;
          }
          return null;
        }
        return null;
      })
    );

    // Filter out null items
    const validFavorites = populatedFavorites.filter((fav) => fav !== null);

    // Separate by type
    const vendors = validFavorites.filter(
      (fav) => fav.itemType === "vendor"
    );
    const services = validFavorites.filter(
      (fav) => fav.itemType === "service"
    );

    // Get total count
    const total = await Favorite.countDocuments(query);

    // Format response
    const formattedFavorites = validFavorites.map((favorite) => ({
      _id: favorite._id,
      itemType: favorite.itemType,
      item: favorite.itemId,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        favorites: formattedFavorites,
        summary: {
          total,
          vendors: vendors.length,
          services: services.length,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get favorites",
      error: error.message,
    });
  }
};

// Check if item is in favorites
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.query;

    // Validation
    if (!itemType || !["vendor", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Item type is required and must be 'vendor' or 'service'",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    // Check if in favorites
    const favorite = await Favorite.findOne({
      userId,
      itemType,
      itemId,
    });

    return res.status(200).json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favoriteId: favorite ? favorite._id : null,
      },
    });
  } catch (error) {
    console.error("Check favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check favorite",
      error: error.message,
    });
  }
};

