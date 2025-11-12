const mongoose = require("mongoose");

const SavedSchema = new mongoose.Schema(
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

// Unique index: one saved item per user per item
SavedSchema.index(
  { userId: 1, itemType: 1, itemId: 1 },
  {
    unique: true,
  }
);

// Index for user saved items
SavedSchema.index({ userId: 1, createdAt: -1 });

// Index for item saved count
SavedSchema.index({ itemType: 1, itemId: 1 });

const Saved = mongoose.model("Saved", SavedSchema);

module.exports = Saved;

