const express = require("express");
const router = express.Router();
const {
  addToFavorites,
  removeFromFavorites,
  getMyFavorites,
  checkFavorite,
} = require("../controllers/favoriteController");
const { authenticate } = require("../middelware/auth");

// User routes (authenticated)
router.post("/add", authenticate, addToFavorites); // Add item to favorites
router.delete("/remove", authenticate, removeFromFavorites); // Remove item from favorites
router.get("/my-favorites", authenticate, getMyFavorites); // Get all favorites
router.get("/check", authenticate, checkFavorite); // Check if item is in favorites

module.exports = router;

