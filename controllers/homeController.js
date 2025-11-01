const Lead = require('../models/Lead');
const ServiceCatalog = require('../models/ServiceCatalog');
const Kyc = require('../models/Kyc');
const BusinessKeyword = require('../models/BusinessKeyword');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const OfferBanner = require('../models/OfferBanner');

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Get Home/Dashboard Data (Public - No Auth Required)
exports.getHomeData = async (req, res) => {
  try {
    const { longitude, latitude, radius = 15000 } = req.query; // radius in meters, default 15km

    // Validation - location is optional
    const hasLocation = longitude && latitude;
    
    let userLocation = null;
    if (hasLocation) {
      userLocation = {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        radius: parseInt(radius)
      };
    }

    // ==================== 1. TRENDING SERVICES NEAR USER ====================
    let trendingServicesNearUser = [];

    if (hasLocation) {
      // Get recent search keywords from leads (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLeads = await Lead.find({
        createdAt: { $gte: thirtyDaysAgo }
      }).select('matchedKeywords');

      // Count search frequency for each keyword
      const keywordFrequency = new Map();
      recentLeads.forEach(lead => {
        if (lead.matchedKeywords && lead.matchedKeywords.length > 0) {
          lead.matchedKeywords.forEach(keyword => {
            keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
          });
        }
      });

      // Sort by frequency (most searched first) - Top 10 trending keywords
      const sortedKeywords = Array.from(keywordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(k => k[0]); // Get only keywords

      // Find businesses matching trending keywords within radius
      if (sortedKeywords.length > 0) {
        const trendingKeywordRegex = new RegExp(sortedKeywords.join('|'), 'i');

        // Find businesses within radius
        const nearbyBusinesses = await Kyc.find({
          status: 'approved',
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
              },
              $maxDistance: parseInt(radius)
            }
          }
        })
          .populate('userId', 'name email phone role isVerified')
          .limit(100); // More businesses to get better services

        // Get vendor IDs from nearby businesses
        const nearbyVendorIds = nearbyBusinesses.map(b => b.userId._id);

        // Find matching keywords for these businesses
        const trendingKeywords = await BusinessKeyword.find({
          keyword: trendingKeywordRegex,
          businessId: { $in: nearbyBusinesses.map(b => b._id) }
        })
          .populate('vendorId', 'name email phone role');

        // Get services from vendors who have trending keywords
        const trendingVendorIds = [...new Set(trendingKeywords.map(k => k.vendorId._id.toString()))];
        
        if (trendingVendorIds.length > 0) {
          // Get vendor profiles
          const vendorProfiles = await VendorProfile.find({
            userId: { $in: trendingVendorIds }
          }).lean();

          const vendorProfileMap = new Map();
          vendorProfiles.forEach(profile => {
            vendorProfileMap.set(profile.userId.toString(), profile);
          });

          // Get all businesses for these vendors
          const vendorBusinesses = await Kyc.find({
            userId: { $in: trendingVendorIds },
            status: 'approved'
          }).lean();

          const businessesByVendor = new Map();
          vendorBusinesses.forEach(business => {
            const vendorId = business.userId.toString();
            if (!businessesByVendor.has(vendorId)) {
              businessesByVendor.set(vendorId, []);
            }
            businessesByVendor.get(vendorId).push(business);
          });

          // Get services with complete data
          const trendingServices = await ServiceCatalog.find({
            vendorId: { $in: trendingVendorIds }
          })
            .populate('vendorId', 'name email phone role isVerified')
            .sort({ createdAt: -1 })
            .lean();

          // Add complete data for each service
          for (const service of trendingServices) {
            const vendorId = service.vendorId._id.toString();
            const vendorBusiness = nearbyBusinesses.find(
              b => b.userId._id.toString() === vendorId
            );

            if (vendorBusiness) {
              const distance = calculateDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                vendorBusiness.location.coordinates[1],
                vendorBusiness.location.coordinates[0]
              );

              const vendorProfile = vendorProfileMap.get(vendorId);
              const allBusinesses = businessesByVendor.get(vendorId) || [];

              trendingServicesNearUser.push({
                // Complete service data
                _id: service._id,
                serviceName: service.serviceName,
                serviceImage: service.serviceImage,
                priceType: service.priceType,
                actualPrice: service.actualPrice,
                discountPrice: service.discountPrice,
                minPrice: service.minPrice,
                maxPrice: service.maxPrice,
                unit: service.unit,
                quantityPricing: service.quantityPricing,
                description: service.description,
                attachments: service.attachments,
                createdAt: service.createdAt,
                updatedAt: service.updatedAt,
                // Complete vendor data
                vendor: {
                  _id: service.vendorId._id,
                  name: service.vendorId.name,
                  email: service.vendorId.email,
                  phone: service.vendorId.phone,
                  role: service.vendorId.role,
                  isVerified: service.vendorId.isVerified,
                  vendorProfile: vendorProfile ? {
                    website: vendorProfile.website,
                    socialMediaLinks: vendorProfile.socialMediaLinks,
                    businessPhotos: vendorProfile.businessPhotos,
                    businessVideo: vendorProfile.businessVideo
                  } : null
                },
                // Complete business data
                business: {
                  _id: vendorBusiness._id,
                  businessName: vendorBusiness.businessName,
                  gstNumber: vendorBusiness.gstNumber,
                  panNumber: vendorBusiness.panNumber,
                  email: vendorBusiness.email,
                  mobileNumber: vendorBusiness.mobileNumber,
                  alternateNumber: vendorBusiness.alternateNumber,
                  businessAddress: vendorBusiness.businessAddress,
                  city: vendorBusiness.city,
                  state: vendorBusiness.state,
                  pincode: vendorBusiness.pincode,
                  location: vendorBusiness.location,
                  category: vendorBusiness.category,
                  subCategory: vendorBusiness.subCategory,
                  businessDescription: vendorBusiness.businessDescription,
                  website: vendorBusiness.website,
                  socialMedia: vendorBusiness.socialMedia,
                  operatingHours: vendorBusiness.operatingHours
                },
                // All businesses for this vendor
                allBusinesses: allBusinesses.map(b => ({
                  _id: b._id,
                  businessName: b.businessName,
                  city: b.city,
                  state: b.state,
                  location: b.location
                })),
                // Distance info
                distance: Math.round(distance),
                distanceKm: (distance / 1000).toFixed(2)
              });
            }
          }

          // Sort by distance (nearest first)
          trendingServicesNearUser = trendingServicesNearUser
            .sort((a, b) => a.distance - b.distance);
        }
      }
    }

    // ==================== 2. MOST POPULAR SERVICES (Overall) ====================
    // Get all services and sort by most recent (can be enhanced with views/orders count)
    const mostPopularServices = await ServiceCatalog.find()
      .populate('vendorId', 'name email phone role isVerified')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get vendor IDs and fetch complete data
    const popularVendorIds = [...new Set(mostPopularServices.map(s => s.vendorId._id.toString()))];
    
    // Get vendor profiles
    const popularVendorProfiles = await VendorProfile.find({
      userId: { $in: popularVendorIds }
    }).lean();

    const popularVendorProfileMap = new Map();
    popularVendorProfiles.forEach(profile => {
      popularVendorProfileMap.set(profile.userId.toString(), profile);
    });

    // Get businesses for these vendors
    const popularVendorBusinesses = await Kyc.find({
      userId: { $in: popularVendorIds },
      status: 'approved'
    }).lean();

    const popularBusinessesByVendor = new Map();
    popularVendorBusinesses.forEach(business => {
      const vendorId = business.userId.toString();
      if (!popularBusinessesByVendor.has(vendorId)) {
        popularBusinessesByVendor.set(vendorId, []);
      }
      popularBusinessesByVendor.get(vendorId).push(business);
    });

    // Format services with complete data
    const formattedPopularServices = mostPopularServices.map(service => {
      const vendorId = service.vendorId._id.toString();
      const vendorProfile = popularVendorProfileMap.get(vendorId);
      const allBusinesses = popularBusinessesByVendor.get(vendorId) || [];

      return {
        // Complete service data
        _id: service._id,
        serviceName: service.serviceName,
        serviceImage: service.serviceImage,
        priceType: service.priceType,
        actualPrice: service.actualPrice,
        discountPrice: service.discountPrice,
        minPrice: service.minPrice,
        maxPrice: service.maxPrice,
        unit: service.unit,
        quantityPricing: service.quantityPricing,
        description: service.description,
        attachments: service.attachments,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        // Complete vendor data
        vendor: {
          _id: service.vendorId._id,
          name: service.vendorId.name,
          email: service.vendorId.email,
          phone: service.vendorId.phone,
          role: service.vendorId.role,
          isVerified: service.vendorId.isVerified,
          vendorProfile: vendorProfile ? {
            website: vendorProfile.website,
            socialMediaLinks: vendorProfile.socialMediaLinks,
            businessPhotos: vendorProfile.businessPhotos,
            businessVideo: vendorProfile.businessVideo
          } : null
        },
        // All businesses for this vendor
        allBusinesses: allBusinesses.map(b => ({
          _id: b._id,
          businessName: b.businessName,
          city: b.city,
          state: b.state,
          location: b.location
        }))
      };
    });

    // ==================== 3. TOP VENDORS NEAR USER ====================
    let topVendorsNearUser = [];

    if (hasLocation) {
      // Find approved businesses within radius - Get more to ensure we have 25
      const nearbyBusinesses = await Kyc.find({
        status: 'approved',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        }
      })
        .populate('userId', 'name email phone role isVerified')
        .limit(100); // Get more to ensure we have enough for complete data

      // Get vendor IDs
      const vendorIds = nearbyBusinesses.map(b => b.userId._id);

      // Get vendor profiles
      const vendorProfiles = await VendorProfile.find({
        userId: { $in: vendorIds }
      }).lean();

      const vendorProfileMap = new Map();
      vendorProfiles.forEach(profile => {
        vendorProfileMap.set(profile.userId.toString(), profile);
      });

      // Get all businesses for these vendors
      const allVendorBusinesses = await Kyc.find({
        userId: { $in: vendorIds },
        status: 'approved'
      }).lean();

      const businessesByVendor = new Map();
      allVendorBusinesses.forEach(business => {
        const vendorId = business.userId.toString();
        if (!businessesByVendor.has(vendorId)) {
          businessesByVendor.set(vendorId, []);
        }
        businessesByVendor.get(vendorId).push(business);
      });

      // Get service counts for each vendor
      const serviceCounts = await ServiceCatalog.aggregate([
        { $match: { vendorId: { $in: vendorIds } } },
        {
          $group: {
            _id: '$vendorId',
            totalServices: { $sum: 1 }
          }
        }
      ]);

      const serviceCountMap = new Map();
      serviceCounts.forEach(item => {
        serviceCountMap.set(item._id.toString(), item.totalServices);
      });

      // Build vendor list with complete data
      topVendorsNearUser = nearbyBusinesses.map(business => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          business.location.coordinates[1],
          business.location.coordinates[0]
        );

        const vendorId = business.userId._id.toString();
        const vendorProfile = vendorProfileMap.get(vendorId);
        const allBusinesses = businessesByVendor.get(vendorId) || [];

        return {
          // Complete vendor data
          _id: business.userId._id,
          name: business.userId.name,
          email: business.userId.email,
          phone: business.userId.phone,
          role: business.userId.role,
          isVerified: business.userId.isVerified,
          vendorProfile: vendorProfile ? {
            website: vendorProfile.website,
            socialMediaLinks: vendorProfile.socialMediaLinks,
            businessPhotos: vendorProfile.businessPhotos,
            businessVideo: vendorProfile.businessVideo
          } : null,
          // Complete business data
          business: {
            _id: business._id,
            businessName: business.businessName,
            gstNumber: business.gstNumber,
            panNumber: business.panNumber,
            email: business.email,
            mobileNumber: business.mobileNumber,
            alternateNumber: business.alternateNumber,
            businessAddress: business.businessAddress,
            city: business.city,
            state: business.state,
            pincode: business.pincode,
            location: business.location,
            category: business.category,
            subCategory: business.subCategory,
            businessDescription: business.businessDescription,
            website: business.website,
            socialMedia: business.socialMedia,
            operatingHours: business.operatingHours
          },
          // All businesses for this vendor
          allBusinesses: allBusinesses.map(b => ({
            _id: b._id,
            businessName: b.businessName,
            city: b.city,
            state: b.state,
            location: b.location
          })),
          // Distance and services count
          distance: Math.round(distance),
          distanceKm: (distance / 1000).toFixed(2),
          totalServices: serviceCountMap.get(vendorId) || 0
        };
      });

      // Sort by distance (nearest first) first, then by total services (desc), limit to 25
      topVendorsNearUser.sort((a, b) => {
        // First sort by distance (nearest first)
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        // If distance equal, sort by total services (more services = better)
        return b.totalServices - a.totalServices;
      });
      topVendorsNearUser = topVendorsNearUser.slice(0, 25);
    }

    // ==================== 4. ALL CATEGORIES ====================
    const categories = await Category.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Format categories
    const formattedCategories = categories.map(category => ({
      _id: category._id,
      categoryName: category.categoryName,
      categoryImage: category.categoryImage,
      isActive: category.isActive,
      createdBy: category.createdBy,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    // ==================== 5. HERO SECTION BANNERS ====================
    const now = new Date();
    const heroBanners = await Banner.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // Format hero banners
    const formattedHeroBanners = heroBanners.map(banner => ({
      _id: banner._id,
      title: banner.title,
      image: banner.image,
      link: banner.link,
      startDate: banner.startDate,
      endDate: banner.endDate,
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
      createdBy: banner.createdBy,
      updatedBy: banner.updatedBy,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt
    }));

    // ==================== 6. OFFER BANNERS (ALL PLACES) ====================
    const offerBannersTop = await OfferBanner.find({
      place: 'top',
      isActive: true,
      isPaid: true,
      paymentStatus: 'completed',
      isBannerUploaded: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .select('title image link displayOrder startDate endDate place')
      .sort({ purchaseDate: 1, displayOrder: 1 })
      .lean();

    const offerBannersMiddle = await OfferBanner.find({
      place: 'middle',
      isActive: true,
      isPaid: true,
      paymentStatus: 'completed',
      isBannerUploaded: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .select('title image link displayOrder startDate endDate place')
      .sort({ purchaseDate: 1, displayOrder: 1 })
      .lean();

    const offerBannersBottom = await OfferBanner.find({
      place: 'bottom',
      isActive: true,
      isPaid: true,
      paymentStatus: 'completed',
      isBannerUploaded: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .select('title image link displayOrder startDate endDate place')
      .sort({ purchaseDate: 1, displayOrder: 1 })
      .lean();

    // ==================== RESPONSE ====================
    res.status(200).json({
      success: true,
      data: {
        userLocation: userLocation ? {
          longitude: userLocation.longitude,
          latitude: userLocation.latitude,
          radius: userLocation.radius,
          radiusKm: (userLocation.radius / 1000).toFixed(1)
        } : null,
        trendingServicesNearUser: {
          count: trendingServicesNearUser.length,
          services: trendingServicesNearUser
        },
        mostPopularServices: {
          count: formattedPopularServices.length,
          services: formattedPopularServices
        },
        topVendorsNearUser: {
          count: topVendorsNearUser.length,
          vendors: topVendorsNearUser
        },
        categories: {
          count: formattedCategories.length,
          categories: formattedCategories
        },
        heroBanners: {
          count: formattedHeroBanners.length,
          banners: formattedHeroBanners
        },
        offerBanners: {
          top: {
            count: offerBannersTop.length,
            banners: offerBannersTop
          },
          middle: {
            count: offerBannersMiddle.length,
            banners: offerBannersMiddle
          },
          bottom: {
            count: offerBannersBottom.length,
            banners: offerBannersBottom
          }
        }
      }
    });

  } catch (error) {
    console.error('Get home data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get home data',
      error: error.message
    });
  }
};
