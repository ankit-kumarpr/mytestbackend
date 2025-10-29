const express = require("express");
const cors = require("cors");
const path = require("path");

const connectToDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const vendorProfileRoutes = require("./routes/vendorProfileRoutes");

const app = express();

// Connect to MongoDB
connectToDb();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/vendor/profile", vendorProfileRoutes);

module.exports = app;
