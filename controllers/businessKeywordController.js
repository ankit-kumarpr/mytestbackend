const BusinessKeyword = require('../models/BusinessKeyword');
const Kyc = require('../models/Kyc');
const User = require('../models/User');

// Add Keywords (Single or Multiple)
exports.addKeywords = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { keywords } = req.body; // Array of keywords
    const vendorId = req.user._id;

    // Validation
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required and must not be empty'
      });
    }

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can add keywords'
      });
    }

    // Check if business exists and belongs to this vendor
    const business = await Kyc.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.userId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only add keywords to your own business'
      });
    }

    // Filter out empty keywords and convert to lowercase
    const validKeywords = keywords
      .filter(k => k && k.trim() !== '')
      .map(k => k.trim().toLowerCase());

    if (validKeywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid keywords provided'
      });
    }

    // Get existing keywords for this business
    const existingKeywords = await BusinessKeyword.find({
      businessId,
      keyword: { $in: validKeywords }
    });

    const existingKeywordsList = existingKeywords.map(k => k.keyword);

    // Filter out duplicates
    const newKeywords = validKeywords.filter(k => !existingKeywordsList.includes(k));

    if (newKeywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All keywords already exist for this business',
        data: {
          skipped: existingKeywordsList
        }
      });
    }

    // Create keyword documents
    const keywordDocs = newKeywords.map(keyword => ({
      businessId,
      vendorId,
      keyword
    }));

    // Insert all keywords
    const addedKeywords = await BusinessKeyword.insertMany(keywordDocs);

    // Get all current keywords
    const allKeywords = await BusinessKeyword.find({ businessId })
      .select('keyword createdAt')
      .sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      message: `${addedKeywords.length} keyword(s) added successfully`,
      data: {
        added: addedKeywords.map(k => k.keyword),
        skipped: existingKeywordsList,
        totalKeywords: allKeywords.length,
        allKeywords: allKeywords
      }
    });

  } catch (error) {
    console.error('Add keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add keywords',
      error: error.message
    });
  }
};

// Get All Keywords of a Business
exports.getBusinessKeywords = async (req, res) => {
  try {
    const { businessId } = req.params;

    // Check if business exists
    const business = await Kyc.findById(businessId).populate('userId', 'name email');
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get all keywords for this business
    const keywords = await BusinessKeyword.find({ businessId })
      .sort({ createdAt: -1 })
      .select('keyword createdAt updatedAt');

    res.status(200).json({
      success: true,
      data: {
        business: {
          id: business._id,
          businessName: business.businessName,
          vendor: business.userId
        },
        keywords: keywords,
        total: keywords.length
      }
    });

  } catch (error) {
    console.error('Get business keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get keywords',
      error: error.message
    });
  }
};

// Get All Keywords of All Businesses of a Vendor
exports.getVendorAllKeywords = async (req, res) => {
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

    // Get all keywords for this vendor
    const keywords = await BusinessKeyword.find({ vendorId })
      .populate('businessId', 'businessName gstNumber city state')
      .sort({ createdAt: -1 });

    // Group keywords by business
    const groupedByBusiness = {};
    keywords.forEach(kw => {
      const businessId = kw.businessId._id.toString();
      if (!groupedByBusiness[businessId]) {
        groupedByBusiness[businessId] = {
          business: {
            id: kw.businessId._id,
            businessName: kw.businessId.businessName,
            gstNumber: kw.businessId.gstNumber,
            city: kw.businessId.city,
            state: kw.businessId.state
          },
          keywords: []
        };
      }
      groupedByBusiness[businessId].keywords.push({
        id: kw._id,
        keyword: kw.keyword,
        createdAt: kw.createdAt
      });
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: Object.values(groupedByBusiness),
        totalKeywords: keywords.length
      }
    });

  } catch (error) {
    console.error('Get vendor keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get keywords',
      error: error.message
    });
  }
};

// Remove Keywords (Single or Multiple)
exports.removeKeywords = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { keywords } = req.body; // Array of keywords
    const vendorId = req.user._id;

    // Validation
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required and must not be empty'
      });
    }

    // Check if user is vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can remove keywords'
      });
    }

    // Check if business exists and belongs to this vendor
    const business = await Kyc.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.userId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove keywords from your own business'
      });
    }

    // Filter and lowercase keywords
    const keywordsToRemove = keywords
      .filter(k => k && k.trim() !== '')
      .map(k => k.trim().toLowerCase());

    if (keywordsToRemove.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid keywords provided'
      });
    }

    // Delete keywords
    const result = await BusinessKeyword.deleteMany({
      businessId,
      vendorId,
      keyword: { $in: keywordsToRemove }
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching keywords found to remove'
      });
    }

    // Get all remaining keywords
    const remainingKeywords = await BusinessKeyword.find({ businessId })
      .select('keyword createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} keyword(s) removed successfully`,
      data: {
        removed: keywordsToRemove,
        removedCount: result.deletedCount,
        totalKeywords: remainingKeywords.length,
        remainingKeywords: remainingKeywords
      }
    });

  } catch (error) {
    console.error('Remove keywords error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove keywords',
      error: error.message
    });
  }
};


// Search Businesses by Keyword (Public - for SEO)
exports.searchBusinessesByKeyword = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required'
      });
    }

    // Search for keywords (case-insensitive partial match)
    const keywords = await BusinessKeyword.find({
      keyword: { $regex: keyword.trim(), $options: 'i' }
    })
      .populate({
        path: 'businessId',
        select: 'businessName gstNumber city state pincode email mobileNumber status',
        match: { status: 'approved' } // Only approved businesses
      })
      .populate('vendorId', 'name email phone')
      .limit(50);

    // Filter out null businesses (not approved)
    const validResults = keywords.filter(k => k.businessId !== null);

    // Group by business
    const businessesMap = new Map();
    validResults.forEach(k => {
      const businessId = k.businessId._id.toString();
      if (!businessesMap.has(businessId)) {
        businessesMap.set(businessId, {
          business: k.businessId,
          vendor: k.vendorId,
          keywords: []
        });
      }
      businessesMap.get(businessId).keywords.push(k.keyword);
    });

    const businesses = Array.from(businessesMap.values());

    res.status(200).json({
      success: true,
      data: {
        searchKeyword: keyword,
        businesses: businesses,
        total: businesses.length
      }
    });

  } catch (error) {
    console.error('Search businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search businesses',
      error: error.message
    });
  }
};

