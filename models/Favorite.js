const mongoose = require("mongoose");

const FavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["vendor", "service"],
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemTypeModel",
    },
    itemTypeModel: {
      type: String,
      enum: ["User", "ServiceCatalog"],
      required: true,
    },
  },
  { timestamps: true }
);

// Unique index: one favorite per user per item
FavoriteSchema.index(
  { userId: 1, itemType: 1, itemId: 1 },
  {
    unique: true,
  }
);

// Index for user favorites
FavoriteSchema.index({ userId: 1, createdAt: -1 });

// Index for item favorites count
FavoriteSchema.index({ itemType: 1, itemId: 1 });

const Favorite = mongoose.model("Favorite", FavoriteSchema);

module.exports = Favorite;

