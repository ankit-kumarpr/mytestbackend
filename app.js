const express = require("express");
const cors = require("cors");
const path = require("path");

const connectToDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const vendorProfileRoutes = require("./routes/vendorProfileRoutes");
const serviceCatalogRoutes = require("./routes/serviceCatalogRoutes");
const businessKeywordRoutes = require("./routes/businessKeywordRoutes");
const leadRoutes = require("./routes/leadRoutes");
const locationRoutes = require("./routes/locationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const offerBannerRoutes = require("./routes/offerBannerRoutes");
const homeRoutes = require("./routes/homeRoutes");

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
app.use("/api/service", serviceCatalogRoutes);
app.use("/api/keyword", businessKeywordRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/offer-banner", offerBannerRoutes);
app.use("/api", homeRoutes);

module.exports = app;
