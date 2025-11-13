const Lead = require('../models/Lead');
const LeadResponse = require('../models/LeadResponse');
const BusinessKeyword = require('../models/BusinessKeyword');
const Kyc = require('../models/Kyc');
const User = require('../models/User');
const ServiceCatalog = require('../models/ServiceCatalog');

// Search Keywords and Get Suggestions (Public/User) - No Radius
exports.searchKeywordSuggestions = async (req, res) => {
  try {
    const { searchTerm } = req.query;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    // Create regex for flexible matching (spaces allowed)
    const searchWords = searchTerm.trim().split(/\s+/);
    const searchRegex = new RegExp(searchWords.join('|'), 'i');

    // Find matching keywords from approved businesses
    const matchedKeywords = await BusinessKeyword.find({
      keyword: searchRegex
    })
      .populate({
        path: 'businessId',
        match: { status: 'approved' },
        select: 'businessName city state'
      })
      .limit(50);

    // Filter out null businesses
    const validMatches = matchedKeywords.filter(k => k.businessId !== null);

    // Get unique keywords
    const uniqueKeywords = [...new Set(validMatches.map(k => k.keyword))];

    // Keyword suggestions only (no radius, no filtering)
    const suggestions = uniqueKeywords.slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        searchTerm,
        totalSuggestions: suggestions.length,
        suggestions: suggestions
      }
    });

  } catch (error) {
    console.error('Search keyword suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message
    });
  }
};

// Search Vendors by Keyword with Location & Radius (User Side - Tuta Futa Match)
exports.searchVendorsByKeyword = async (req, res) => {
  try {
    const { keyword, longitude, latitude, radius = 15000, page = 1, limit = 20 } = req.query;

    // Validation
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required'
      });
    }

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Location (longitude, latitude) is required'
      });
    }

    // Create regex for flexible matching (tuta futa bhi chalega)
    const searchWords = keyword.trim().split(/\s+/);
    const searchRegex = new RegExp(searchWords.join('|'), 'i');

    // Find all matching keywords from approved businesses
    const matchedKeywords = await BusinessKeyword.find({
      keyword: searchRegex
    })
      .populate({
        path: 'businessId',
        match: { status: 'approved' },
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .populate('vendorId', 'name email phone');

    // Filter out null businesses
    const validMatches = matchedKeywords.filter(k => k.businessId !== null);

    if (validMatches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No vendors found matching your search'
      });
    }

    // Get business IDs to filter by location
    const businessIds = [...new Set(validMatches.map(k => k.businessId._id.toString()))];

    // Find businesses within radius using geospatial query
    const nearbyBusinesses = await Kyc.find({
      _id: { $in: businessIds },
      status: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius) // in meters
        }
      }
    }).populate('userId', 'name email phone');

    if (nearbyBusinesses.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No vendors found within ${parseInt(radius)/1000}km radius matching your search`
      });
    }

    // Map nearby business IDs
    const nearbyBusinessIds = nearbyBusinesses.map(b => b._id.toString());

    // Group by business and include only nearby ones
    const businessMap = new Map();
    
    validMatches.forEach(match => {
      const businessId = match.businessId._id.toString();
      
      // Only include if business is within radius
      if (nearbyBusinessIds.includes(businessId)) {
        const business = nearbyBusinesses.find(b => b._id.toString() === businessId);
        
        // Calculate distance
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          business.location.coordinates[1],
          business.location.coordinates[0]
        );

        if (!businessMap.has(businessId)) {
          businessMap.set(businessId, {
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
            operatingHours: business.operatingHours,
            vendor: business.userId,
            matchedKeywords: [match.keyword],
            distance: Math.round(distance), // Distance in meters
            distanceKm: (distance / 1000).toFixed(2) // Distance in km
          });
        } else {
          businessMap.get(businessId).matchedKeywords.push(match.keyword);
        }
      }
    });

    // Convert to array and sort by distance
    const businesses = Array.from(businessMap.values()).sort((a, b) => a.distance - b.distance);

    // Get vendor IDs from businesses
    const vendorIds = businesses.map(b => b.vendor._id.toString());

    // Fetch all services for these vendors
    const allServices = await ServiceCatalog.find({
      vendorId: { $in: vendorIds }
    }).sort({ createdAt: -1 });

    // Group services by vendorId
    const servicesByVendor = new Map();
    allServices.forEach(service => {
      const vendorId = service.vendorId.toString();
      if (!servicesByVendor.has(vendorId)) {
        servicesByVendor.set(vendorId, []);
      }
      servicesByVendor.get(vendorId).push({
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
        updatedAt: service.updatedAt
      });
    });

    // Add services to each business/vendor
    const businessesWithServices = businesses.map(business => {
      const vendorId = business.vendor._id.toString();
      return {
        ...business,
        services: servicesByVendor.get(vendorId) || [],
        totalServices: servicesByVendor.get(vendorId)?.length || 0
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedBusinesses = businessesWithServices.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        searchKeyword: keyword.trim(),
        userLocation: {
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude)
        },
        radius: parseInt(radius),
        radiusKm: (parseInt(radius) / 1000).toFixed(1),
        totalVendors: businessesWithServices.length,
        vendors: paginatedBusinesses,
        pagination: {
          total: businessesWithServices.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(businessesWithServices.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Search vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vendors',
      error: error.message
    });
  }
};

// Submit Lead/Inquiry (User) - Real-time with Socket.IO
exports.submitLead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      searchKeyword, 
      description, 
      location, // { longitude, latitude, address, city, state, pincode }
      radius = 15000 // 15km default
    } = req.body;

    // Validation (description optional)
    if (!searchKeyword || !location || !location.longitude || !location.latitude) {
      return res.status(400).json({
        success: false,
        message: 'Search keyword and location (longitude, latitude) are required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Search for matching keywords (spaces allowed, flexible)
    const searchWords = searchKeyword.trim().split(/\s+/);
    const searchRegex = new RegExp(searchWords.join('|'), 'i');
    const matchedKeywords = await BusinessKeyword.find({
      keyword: searchRegex
    }).populate('businessId vendorId');

    if (matchedKeywords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No vendors found matching your search'
      });
    }

    // Create lead
    const lead = await Lead.create({
      userId,
      searchKeyword: searchKeyword.trim(),
      description: description ? description.trim() : '',
      userLocation: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        address: location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode
      },
      matchedKeywords: [...new Set(matchedKeywords.map(k => k.keyword))],
      radius: radius || 15000
    });

    // Find vendors within radius
    const nearbyBusinesses = await Kyc.find({
      status: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          $maxDistance: radius || 15000 // 15km
        }
      }
    }).select('_id userId businessName location city state');

    const nearbyBusinessIds = nearbyBusinesses.map(b => b._id.toString());
    
    // Filter matched keywords for nearby businesses only
    const relevantMatches = matchedKeywords.filter(k => 
      k.businessId && 
      k.businessId.status === 'approved' &&
      nearbyBusinessIds.includes(k.businessId._id.toString())
    );

    if (relevantMatches.length === 0) {
      await Lead.findByIdAndUpdate(lead._id, {
        status: 'cancelled',
        totalVendorsNotified: 0
      });

      return res.status(404).json({
        success: false,
        message: `No vendors found within ${radius/1000}km radius matching your search`,
        data: {
          leadId: lead._id,
          status: 'cancelled'
        }
      });
    }

    // Group by vendor and create lead responses
    const vendorLeadsMap = new Map();
    
    relevantMatches.forEach(match => {
      const vendorId = match.vendorId._id.toString();
      const businessId = match.businessId._id.toString();
      
      if (!vendorLeadsMap.has(vendorId)) {
        const business = nearbyBusinesses.find(b => b._id.toString() === businessId);
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          business.location.coordinates[1],
          business.location.coordinates[0]
        );

        vendorLeadsMap.set(vendorId, {
          vendorId: match.vendorId._id,
          businessId: match.businessId._id,
          matchedKeywords: [match.keyword],
          distance: Math.round(distance)
        });
      } else {
        vendorLeadsMap.get(vendorId).matchedKeywords.push(match.keyword);
      }
    });

    // Create lead responses for all matched vendors
    const leadResponses = Array.from(vendorLeadsMap.values()).map(vendor => ({
      leadId: lead._id,
      vendorId: vendor.vendorId,
      businessId: vendor.businessId,
      matchedKeywords: [...new Set(vendor.matchedKeywords)],
      distance: vendor.distance,
      status: 'pending'
    }));

    await LeadResponse.insertMany(leadResponses);

    // Update lead with stats
    await Lead.findByIdAndUpdate(lead._id, {
      totalVendorsNotified: leadResponses.length,
      totalPending: leadResponses.length
    });

    // Populate and return
    const populatedLead = await Lead.findById(lead._id)
      .populate('userId', 'name email phone');

    const populatedResponses = await LeadResponse.find({ leadId: lead._id })
      .populate('vendorId', 'name email phone')
      .populate('businessId', 'businessName city state mobileNumber email');

    // Send real-time notification to vendors via Socket.IO
    const io = req.app.get('io');
    if (io) {
      console.log(`📤 Sending lead notifications to ${populatedResponses.length} vendor(s)...`);
      populatedResponses.forEach(response => {
        const vendorId = response.vendorId._id.toString();
        const vendorRoom = `vendor_${vendorId}`;
        const leadData = {
          leadResponse: response,
          lead: {
            searchKeyword: lead.searchKeyword,
            description: lead.description,
            userLocation: lead.userLocation,
            user: {
              name: user.name,
              phone: user.phone,
              email: user.email
            }
          }
        };
        console.log(`   📨 Emitting 'new_lead' to room: ${vendorRoom}`);
        io.to(vendorRoom).emit('new_lead', leadData);
      });
      console.log(`✅ Lead notifications sent!`);
    } else {
      console.warn('⚠️  Socket.IO not available - notifications not sent');
    }

    res.status(201).json({
      success: true,
      message: `Lead submitted successfully! ${leadResponses.length} vendor(s) notified in real-time`,
      data: {
        lead: populatedLead,
        notifiedVendors: populatedResponses
      }
    });

  } catch (error) {
    console.error('Submit lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit lead',
      error: error.message
    });
  }
};

// Get User's Leads (User)
exports.getUserLeads = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name email phone');

    const total = await Lead.countDocuments(query);

    // Get responses for each lead
    const leadsWithResponses = await Promise.all(
      leads.map(async (lead) => {
        const responses = await LeadResponse.find({ leadId: lead._id })
          .populate('vendorId', 'name email phone')
          .populate('businessId', 'businessName city state mobileNumber email');
        
        return {
          ...lead.toObject(),
          responses
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        leads: leadsWithResponses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads',
      error: error.message
    });
  }
};

// Get Vendor's Leads (Vendor)
exports.getVendorLeads = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this'
      });
    }

    const query = { vendorId };
    if (status) {
      query.status = status;
    }

    const leadResponses = await LeadResponse.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('leadId')
      .populate('businessId', 'businessName city state')
      .populate({
        path: 'leadId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    const total = await LeadResponse.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        leads: leadResponses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get vendor leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads',
      error: error.message
    });
  }
};

// Accept/Reject Lead (Vendor)
exports.respondToLead = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { leadResponseId } = req.params;
    const { status, notes } = req.body; // status: 'accepted' or 'rejected'

    // Validation
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "accepted" or "rejected"'
      });
    }

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can respond to leads'
      });
    }

    // Find lead response
    const leadResponse = await LeadResponse.findById(leadResponseId);
    if (!leadResponse) {
      return res.status(404).json({
        success: false,
        message: 'Lead response not found'
      });
    }

    // Check ownership
    if (leadResponse.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only respond to your own leads'
      });
    }

    // Check if already responded
    if (leadResponse.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This lead has already been ${leadResponse.status}`
      });
    }

    // Update lead response
    leadResponse.status = status;
    leadResponse.respondedAt = new Date();
    if (notes) {
      leadResponse.notes = notes;
    }
    await leadResponse.save();

    // Update lead statistics
    const lead = await Lead.findById(leadResponse.leadId);
    if (lead) {
      if (status === 'accepted') {
        lead.totalAccepted += 1;
        lead.totalPending -= 1;
        if (lead.status === 'pending') {
          lead.status = 'in-progress';
        }
      } else if (status === 'rejected') {
        lead.totalRejected += 1;
        lead.totalPending -= 1;
      }
      await lead.save();
    }

    // Populate and return
    const populatedResponse = await LeadResponse.findById(leadResponseId)
      .populate('leadId')
      .populate('businessId', 'businessName city state')
      .populate({
        path: 'leadId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    res.status(200).json({
      success: true,
      message: `Lead ${status} successfully`,
      data: populatedResponse
    });

  } catch (error) {
    console.error('Respond to lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to lead',
      error: error.message
    });
  }
};

// Get Vendor Lead Statistics (Vendor)
exports.getVendorLeadStats = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access this'
      });
    }

    const totalLeads = await LeadResponse.countDocuments({ vendorId });
    const acceptedLeads = await LeadResponse.countDocuments({ vendorId, status: 'accepted' });
    const rejectedLeads = await LeadResponse.countDocuments({ vendorId, status: 'rejected' });
    const pendingLeads = await LeadResponse.countDocuments({ vendorId, status: 'pending' });

    // Get recent activity
    const recentLeads = await LeadResponse.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('leadId', 'searchKeyword description')
      .populate('businessId', 'businessName');

    // Get acceptance rate
    const acceptanceRate = totalLeads > 0 
      ? ((acceptedLeads / (acceptedLeads + rejectedLeads)) * 100).toFixed(2) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          total: totalLeads,
          accepted: acceptedLeads,
          rejected: rejectedLeads,
          pending: pendingLeads,
          acceptanceRate: parseFloat(acceptanceRate)
        },
        recentActivity: recentLeads
      }
    });

  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

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

