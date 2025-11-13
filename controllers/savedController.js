const Saved = require("../models/Saved");
const User = require("../models/User");
const ServiceCatalog = require("../models/ServiceCatalog");
const { isVendorOrIndividual } = require("../utils/roleHelper");

// Add to saved
exports.addToSaved = async (req, res) => {
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
      if (!vendor || !isVendorOrIndividual(vendor)) {
        return res.status(404).json({
          success: false,
          message: "Vendor or individual not found",
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

    // Check if already saved
    const existingSaved = await Saved.findOne({
      userId,
      itemType,
      itemId,
    });

    if (existingSaved) {
      return res.status(400).json({
        success: false,
        message: "Item is already saved",
      });
    }

    // Create saved item
    const saved = new Saved({
      userId,
      itemType,
      itemId,
      itemTypeModel: itemType === "vendor" ? "User" : "ServiceCatalog",
    });

    await saved.save();

    // Populate item data
    await saved.populate(
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
      message: "Item saved successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Add to saved error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Item is already saved",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save item",
      error: error.message,
    });
  }
};

// Remove from saved
exports.removeFromSaved = async (req, res) => {
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

    // Find and delete saved item
    const saved = await Saved.findOneAndDelete({
      userId,
      itemType,
      itemId,
    });

    if (!saved) {
      return res.status(404).json({
        success: false,
        message: "Item not found in saved items",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item removed from saved items successfully",
    });
  } catch (error) {
    console.error("Remove from saved error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove from saved items",
      error: error.message,
    });
  }
};

// Get all saved items
exports.getMySaved = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { userId };
    if (itemType && ["vendor", "service"].includes(itemType)) {
      query.itemType = itemType;
    }

    // Get saved items with pagination
    let savedItems = await Saved.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Populate items based on type
    const savedItemsArray = savedItems.map((saved) => saved.toObject());
    const populatedSavedItems = await Promise.all(
      savedItemsArray.map(async (saved) => {
        if (saved.itemType === "vendor") {
          const vendor = await User.findById(saved.itemId).select(
            "name email phone role"
          );
          if (vendor && isVendorOrIndividual(vendor)) {
            saved.itemId = vendor;
            return saved;
          }
          return null;
        } else if (saved.itemType === "service") {
          const service = await ServiceCatalog.findById(saved.itemId)
            .select(
              "serviceName serviceImage priceType actualPrice discountPrice minPrice maxPrice unit description vendorId attachments"
            )
            .populate("vendorId", "name email phone");
          if (service) {
            saved.itemId = service;
            return saved;
          }
          return null;
        }
        return null;
      })
    );

    // Filter out null items
    const validSavedItems = populatedSavedItems.filter((saved) => saved !== null);

    // Separate by type
    const vendors = validSavedItems.filter((saved) => saved.itemType === "vendor");
    const services = validSavedItems.filter((saved) => saved.itemType === "service");

    // Get total count
    const total = await Saved.countDocuments(query);

    // Format response
    const formattedSavedItems = validSavedItems.map((saved) => ({
      _id: saved._id,
      itemType: saved.itemType,
      item: saved.itemId,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        savedItems: formattedSavedItems,
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
    console.error("Get saved items error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get saved items",
      error: error.message,
    });
  }
};

// Check if item is saved
exports.checkSaved = async (req, res) => {
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

    // Check if saved
    const saved = await Saved.findOne({
      userId,
      itemType,
      itemId,
    });

    return res.status(200).json({
      success: true,
      data: {
        isSaved: !!saved,
        savedId: saved ? saved._id : null,
      },
    });
  } catch (error) {
    console.error("Check saved error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check saved item",
      error: error.message,
    });
  }
};

