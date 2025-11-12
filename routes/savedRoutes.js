const express = require("express");
const router = express.Router();
const {
  addToSaved,
  removeFromSaved,
  getMySaved,
  checkSaved,
} = require("../controllers/savedController");
const { authenticate } = require("../middelware/auth");

// User routes (authenticated)
router.post("/add", authenticate, addToSaved); // Add item to saved
router.delete("/remove", authenticate, removeFromSaved); // Remove item from saved
router.get("/my-saved", authenticate, getMySaved); // Get all saved items
router.get("/check", authenticate, checkSaved); // Check if item is saved

module.exports = router;

