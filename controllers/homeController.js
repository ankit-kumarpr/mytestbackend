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

// Helper function to generate static trending services
function getStaticTrendingServices() {
  return [
    {
      _id: 'static_trending_1',
      serviceName: 'Home Cleaning Service',
      serviceImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      priceType: 'fixed',
      actualPrice: 1500,
      discountPrice: 1200,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'Professional home cleaning service with trained staff',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_1',
        name: 'Clean Home Services',
        email: 'info@cleanhome.com',
        phone: '+91-9876543210',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://cleanhome.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_1',
        businessName: 'Clean Home Services',
        city: 'Mumbai',
        state: 'Maharashtra',
        location: { type: 'Point', coordinates: [72.8777, 19.0760] }
      },
      allBusinesses: [],
      distance: 2500,
      distanceKm: '2.50'
    },
    {
      _id: 'static_trending_2',
      serviceName: 'Plumbing Services',
      serviceImage: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 500,
      maxPrice: 2000,
      unit: 'per visit',
      quantityPricing: null,
      description: 'Expert plumbing solutions for all your needs',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_2',
        name: 'Quick Fix Plumbing',
        email: 'info@quickfix.com',
        phone: '+91-9876543211',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://quickfix.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_2',
        businessName: 'Quick Fix Plumbing',
        city: 'Delhi',
        state: 'Delhi',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] }
      },
      allBusinesses: [],
      distance: 3500,
      distanceKm: '3.50'
    },
    {
      _id: 'static_trending_3',
      serviceName: 'Electrician Services',
      serviceImage: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800',
      priceType: 'fixed',
      actualPrice: 800,
      discountPrice: 650,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'Licensed electricians for all electrical work',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_3',
        name: 'Power Electric',
        email: 'info@powerelectric.com',
        phone: '+91-9876543212',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://powerelectric.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_3',
        businessName: 'Power Electric',
        city: 'Bangalore',
        state: 'Karnataka',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      },
      allBusinesses: [],
      distance: 4200,
      distanceKm: '4.20'
    },
    {
      _id: 'static_trending_4',
      serviceName: 'Carpentry Services',
      serviceImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 2000,
      maxPrice: 10000,
      unit: 'per project',
      quantityPricing: null,
      description: 'Custom furniture and carpentry work',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_4',
        name: 'Wood Crafters',
        email: 'info@woodcrafters.com',
        phone: '+91-9876543213',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://woodcrafters.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_4',
        businessName: 'Wood Crafters',
        city: 'Pune',
        state: 'Maharashtra',
        location: { type: 'Point', coordinates: [73.8567, 18.5204] }
      },
      allBusinesses: [],
      distance: 1800,
      distanceKm: '1.80'
    },
    {
      _id: 'static_trending_5',
      serviceName: 'Painting Services',
      serviceImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 3000,
      maxPrice: 15000,
      unit: 'per room',
      quantityPricing: null,
      description: 'Professional interior and exterior painting',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_5',
        name: 'Color Masters',
        email: 'info@colormasters.com',
        phone: '+91-9876543214',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://colormasters.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_5',
        businessName: 'Color Masters',
        city: 'Hyderabad',
        state: 'Telangana',
        location: { type: 'Point', coordinates: [78.4867, 17.3850] }
      },
      allBusinesses: [],
      distance: 3200,
      distanceKm: '3.20'
    },
    {
      _id: 'static_trending_6',
      serviceName: 'AC Repair & Service',
      serviceImage: 'https://images.unsplash.com/photo-1631542772215-3518b5d00b7d?w=800',
      priceType: 'fixed',
      actualPrice: 1200,
      discountPrice: 999,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'AC installation, repair and maintenance',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_6',
        name: 'Cool Air Solutions',
        email: 'info@coolair.com',
        phone: '+91-9876543215',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://coolair.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_6',
        businessName: 'Cool Air Solutions',
        city: 'Chennai',
        state: 'Tamil Nadu',
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      },
      allBusinesses: [],
      distance: 2800,
      distanceKm: '2.80'
    },
    {
      _id: 'static_trending_7',
      serviceName: 'Appliance Repair',
      serviceImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 500,
      maxPrice: 3000,
      unit: 'per appliance',
      quantityPricing: null,
      description: 'Expert repair for all home appliances',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_7',
        name: 'Fix It Right',
        email: 'info@fixitright.com',
        phone: '+91-9876543216',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://fixitright.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_7',
        businessName: 'Fix It Right',
        city: 'Kolkata',
        state: 'West Bengal',
        location: { type: 'Point', coordinates: [88.3639, 22.5726] }
      },
      allBusinesses: [],
      distance: 1900,
      distanceKm: '1.90'
    },
    {
      _id: 'static_trending_8',
      serviceName: 'Pest Control Services',
      serviceImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      priceType: 'fixed',
      actualPrice: 2000,
      discountPrice: 1500,
      minPrice: null,
      maxPrice: null,
      unit: 'per treatment',
      quantityPricing: null,
      description: 'Professional pest control and extermination',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_8',
        name: 'Pest Free Home',
        email: 'info@pestfree.com',
        phone: '+91-9876543217',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://pestfree.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_8',
        businessName: 'Pest Free Home',
        city: 'Ahmedabad',
        state: 'Gujarat',
        location: { type: 'Point', coordinates: [72.5714, 23.0225] }
      },
      allBusinesses: [],
      distance: 2400,
      distanceKm: '2.40'
    },
    {
      _id: 'static_trending_9',
      serviceName: 'Flooring Services',
      serviceImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 5000,
      maxPrice: 25000,
      unit: 'per sq ft',
      quantityPricing: null,
      description: 'Tile, marble, and wooden flooring installation',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_9',
        name: 'Perfect Floors',
        email: 'info@perfectfloors.com',
        phone: '+91-9876543218',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://perfectfloors.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_9',
        businessName: 'Perfect Floors',
        city: 'Jaipur',
        state: 'Rajasthan',
        location: { type: 'Point', coordinates: [75.7873, 26.9124] }
      },
      allBusinesses: [],
      distance: 3600,
      distanceKm: '3.60'
    },
    {
      _id: 'static_trending_10',
      serviceName: 'RO Water Purifier Service',
      serviceImage: 'https://images.unsplash.com/photo-1556912167-f556f1f39f0b?w=800',
      priceType: 'fixed',
      actualPrice: 800,
      discountPrice: 600,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'RO water purifier installation and maintenance',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_10',
        name: 'Pure Water Solutions',
        email: 'info@purewater.com',
        phone: '+91-9876543219',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://purewater.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      business: {
        _id: 'static_business_10',
        businessName: 'Pure Water Solutions',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        location: { type: 'Point', coordinates: [80.9462, 26.8467] }
      },
      allBusinesses: [],
      distance: 2100,
      distanceKm: '2.10'
    }
  ];
}

// Helper function to generate static popular services
function getStaticPopularServices() {
  return [
    {
      _id: 'static_popular_1',
      serviceName: 'Carpentry Services',
      serviceImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 2000,
      maxPrice: 10000,
      unit: 'per project',
      quantityPricing: null,
      description: 'Custom furniture and carpentry work',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_11',
        name: 'Wood Crafters',
        email: 'info@woodcrafters.com',
        phone: '+91-9876543213',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://woodcrafters.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_2',
      serviceName: 'Painting Services',
      serviceImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 3000,
      maxPrice: 15000,
      unit: 'per room',
      quantityPricing: null,
      description: 'Professional interior and exterior painting',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_12',
        name: 'Color Masters',
        email: 'info@colormasters.com',
        phone: '+91-9876543214',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://colormasters.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_3',
      serviceName: 'AC Repair & Service',
      serviceImage: 'https://images.unsplash.com/photo-1631542772215-3518b5d00b7d?w=800',
      priceType: 'fixed',
      actualPrice: 1200,
      discountPrice: 999,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'AC installation, repair and maintenance',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_13',
        name: 'Cool Air Solutions',
        email: 'info@coolair.com',
        phone: '+91-9876543215',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://coolair.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_4',
      serviceName: 'Home Cleaning Service',
      serviceImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      priceType: 'fixed',
      actualPrice: 1500,
      discountPrice: 1200,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'Professional home cleaning service with trained staff',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_14',
        name: 'Sparkle Clean',
        email: 'info@sparkleclean.com',
        phone: '+91-9876543222',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://sparkleclean.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_5',
      serviceName: 'Plumbing Services',
      serviceImage: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 500,
      maxPrice: 2000,
      unit: 'per visit',
      quantityPricing: null,
      description: 'Expert plumbing solutions for all your needs',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_15',
        name: 'Plumb Pro',
        email: 'info@plumbpro.com',
        phone: '+91-9876543223',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://plumbpro.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_6',
      serviceName: 'Electrician Services',
      serviceImage: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800',
      priceType: 'fixed',
      actualPrice: 800,
      discountPrice: 650,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'Licensed electricians for all electrical work',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_16',
        name: 'Bright Electric',
        email: 'info@brightelectric.com',
        phone: '+91-9876543224',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://brightelectric.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_7',
      serviceName: 'Appliance Repair',
      serviceImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 500,
      maxPrice: 3000,
      unit: 'per appliance',
      quantityPricing: null,
      description: 'Expert repair for all home appliances',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_17',
        name: 'Appliance Masters',
        email: 'info@appliancemasters.com',
        phone: '+91-9876543225',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://appliancemasters.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_8',
      serviceName: 'Pest Control Services',
      serviceImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      priceType: 'fixed',
      actualPrice: 2000,
      discountPrice: 1500,
      minPrice: null,
      maxPrice: null,
      unit: 'per treatment',
      quantityPricing: null,
      description: 'Professional pest control and extermination',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_18',
        name: 'Pest Shield',
        email: 'info@pestshield.com',
        phone: '+91-9876543226',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://pestshield.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_9',
      serviceName: 'Flooring Services',
      serviceImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      priceType: 'range',
      actualPrice: null,
      discountPrice: null,
      minPrice: 5000,
      maxPrice: 25000,
      unit: 'per sq ft',
      quantityPricing: null,
      description: 'Tile, marble, and wooden flooring installation',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_19',
        name: 'Floor Experts',
        email: 'info@floorexperts.com',
        phone: '+91-9876543227',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://floorexperts.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    },
    {
      _id: 'static_popular_10',
      serviceName: 'RO Water Purifier Service',
      serviceImage: 'https://images.unsplash.com/photo-1556912167-f556f1f39f0b?w=800',
      priceType: 'fixed',
      actualPrice: 800,
      discountPrice: 600,
      minPrice: null,
      maxPrice: null,
      unit: 'per service',
      quantityPricing: null,
      description: 'RO water purifier installation and maintenance',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        _id: 'static_vendor_20',
        name: 'Aqua Pure',
        email: 'info@aquapure.com',
        phone: '+91-9876543228',
        role: 'vendor',
        isVerified: true,
        vendorProfile: {
          website: 'https://aquapure.com',
          socialMediaLinks: {},
          businessPhotos: [],
          businessVideo: null
        }
      },
      allBusinesses: []
    }
  ];
}

// Helper function to generate static vendors
function getStaticVendors() {
  return [
    {
      _id: 'static_vendor_near_1',
      name: 'Home Services Pro',
      email: 'info@homeservicespro.com',
      phone: '+91-9876543220',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://homeservicespro.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_1',
        businessName: 'Home Services Pro',
        city: 'Mumbai',
        state: 'Maharashtra',
        location: { type: 'Point', coordinates: [72.8777, 19.0760] }
      },
      allBusinesses: [],
      distance: 1800,
      distanceKm: '1.80',
      totalServices: 15
    },
    {
      _id: 'static_vendor_near_2',
      name: 'Fix It All',
      email: 'info@fixitall.com',
      phone: '+91-9876543221',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://fixitall.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_2',
        businessName: 'Fix It All',
        city: 'Delhi',
        state: 'Delhi',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] }
      },
      allBusinesses: [],
      distance: 2200,
      distanceKm: '2.20',
      totalServices: 12
    },
    {
      _id: 'static_vendor_near_3',
      name: 'Pro Services Hub',
      email: 'info@proserviceshub.com',
      phone: '+91-9876543229',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://proserviceshub.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_3',
        businessName: 'Pro Services Hub',
        city: 'Bangalore',
        state: 'Karnataka',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      },
      allBusinesses: [],
      distance: 1500,
      distanceKm: '1.50',
      totalServices: 18
    },
    {
      _id: 'static_vendor_near_4',
      name: 'Quick Fix Solutions',
      email: 'info@quickfixsolutions.com',
      phone: '+91-9876543230',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://quickfixsolutions.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_4',
        businessName: 'Quick Fix Solutions',
        city: 'Pune',
        state: 'Maharashtra',
        location: { type: 'Point', coordinates: [73.8567, 18.5204] }
      },
      allBusinesses: [],
      distance: 2100,
      distanceKm: '2.10',
      totalServices: 14
    },
    {
      _id: 'static_vendor_near_5',
      name: 'Expert Home Care',
      email: 'info@experthomecare.com',
      phone: '+91-9876543231',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://experthomecare.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_5',
        businessName: 'Expert Home Care',
        city: 'Hyderabad',
        state: 'Telangana',
        location: { type: 'Point', coordinates: [78.4867, 17.3850] }
      },
      allBusinesses: [],
      distance: 1900,
      distanceKm: '1.90',
      totalServices: 16
    },
    {
      _id: 'static_vendor_near_6',
      name: 'All In One Services',
      email: 'info@allinoneservices.com',
      phone: '+91-9876543232',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://allinoneservices.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_6',
        businessName: 'All In One Services',
        city: 'Chennai',
        state: 'Tamil Nadu',
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      },
      allBusinesses: [],
      distance: 2300,
      distanceKm: '2.30',
      totalServices: 20
    },
    {
      _id: 'static_vendor_near_7',
      name: 'Reliable Repairs',
      email: 'info@reliablerepairs.com',
      phone: '+91-9876543233',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://reliablerepairs.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_7',
        businessName: 'Reliable Repairs',
        city: 'Kolkata',
        state: 'West Bengal',
        location: { type: 'Point', coordinates: [88.3639, 22.5726] }
      },
      allBusinesses: [],
      distance: 1700,
      distanceKm: '1.70',
      totalServices: 13
    },
    {
      _id: 'static_vendor_near_8',
      name: 'Top Quality Services',
      email: 'info@topqualityservices.com',
      phone: '+91-9876543234',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://topqualityservices.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_8',
        businessName: 'Top Quality Services',
        city: 'Ahmedabad',
        state: 'Gujarat',
        location: { type: 'Point', coordinates: [72.5714, 23.0225] }
      },
      allBusinesses: [],
      distance: 2000,
      distanceKm: '2.00',
      totalServices: 17
    },
    {
      _id: 'static_vendor_near_9',
      name: 'Best Home Solutions',
      email: 'info@besthomesolutions.com',
      phone: '+91-9876543235',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://besthomesolutions.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_9',
        businessName: 'Best Home Solutions',
        city: 'Jaipur',
        state: 'Rajasthan',
        location: { type: 'Point', coordinates: [75.7873, 26.9124] }
      },
      allBusinesses: [],
      distance: 2400,
      distanceKm: '2.40',
      totalServices: 19
    },
    {
      _id: 'static_vendor_near_10',
      name: 'Premium Services',
      email: 'info@premiumservices.com',
      phone: '+91-9876543236',
      role: 'vendor',
      isVerified: true,
      vendorProfile: {
        website: 'https://premiumservices.com',
        socialMediaLinks: {},
        businessPhotos: [],
        businessVideo: null
      },
      business: {
        _id: 'static_business_near_10',
        businessName: 'Premium Services',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        location: { type: 'Point', coordinates: [80.9462, 26.8467] }
      },
      allBusinesses: [],
      distance: 1600,
      distanceKm: '1.60',
      totalServices: 21
    }
  ];
}

// Helper function to generate static categories
function getStaticCategories() {
  return [
    {
      _id: 'static_category_1',
      categoryName: 'Home Services',
      categoryImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_2',
      categoryName: 'Plumbing',
      categoryImage: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_3',
      categoryName: 'Electrical',
      categoryImage: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_4',
      categoryName: 'Carpentry',
      categoryImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_5',
      categoryName: 'Painting',
      categoryImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_6',
      categoryName: 'AC Services',
      categoryImage: 'https://images.unsplash.com/photo-1631542772215-3518b5d00b7d?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_7',
      categoryName: 'Appliance Repair',
      categoryImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_8',
      categoryName: 'Pest Control',
      categoryImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_9',
      categoryName: 'Flooring',
      categoryImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_category_10',
      categoryName: 'Water Purifier',
      categoryImage: 'https://images.unsplash.com/photo-1556912167-f556f1f39f0b?w=800',
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

// Helper function to generate static hero banners
function getStaticHeroBanners() {
  return [
    {
      _id: 'static_hero_1',
      title: 'Welcome to Our Platform',
      image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 1,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_2',
      title: 'Best Services Near You',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 2,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_3',
      title: 'Professional Home Services',
      image: 'https://images.unsplash.com/photo-1556761175-4f46a9b84c59?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 3,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_4',
      title: 'Trusted Service Providers',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 4,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_5',
      title: 'Quality Services Guaranteed',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 5,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_6',
      title: 'Expert Technicians Available',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 6,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_7',
      title: '24/7 Service Support',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 7,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_8',
      title: 'Affordable Pricing',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 8,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_9',
      title: 'Book Your Service Now',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 9,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'static_hero_10',
      title: 'Satisfaction Guaranteed',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
      link: '#',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      displayOrder: 10,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

// Helper function to generate static offer banners
function getStaticOfferBanners(place) {
  const placeCapitalized = place.charAt(0).toUpperCase() + place.slice(1);
  return [
    {
      _id: `static_offer_${place}_1`,
      title: `Special Offer ${placeCapitalized} 1`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_2`,
      title: `Special Offer ${placeCapitalized} 2`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 2,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_3`,
      title: `Special Offer ${placeCapitalized} 3`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 3,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_4`,
      title: `Special Offer ${placeCapitalized} 4`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 4,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_5`,
      title: `Special Offer ${placeCapitalized} 5`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 5,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_6`,
      title: `Special Offer ${placeCapitalized} 6`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 6,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_7`,
      title: `Special Offer ${placeCapitalized} 7`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 7,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_8`,
      title: `Special Offer ${placeCapitalized} 8`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 8,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_9`,
      title: `Special Offer ${placeCapitalized} 9`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 9,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    },
    {
      _id: `static_offer_${place}_10`,
      title: `Special Offer ${placeCapitalized} 10`,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      link: '#',
      displayOrder: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      place: place
    }
  ];
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

    // ==================== RESPONSE WITH STATIC FALLBACK ====================
    // Use static data if arrays are empty
    const finalTrendingServices = trendingServicesNearUser.length > 0 
      ? trendingServicesNearUser 
      : getStaticTrendingServices();
    
    const finalPopularServices = formattedPopularServices.length > 0 
      ? formattedPopularServices 
      : getStaticPopularServices();
    
    const finalTopVendors = topVendorsNearUser.length > 0 
      ? topVendorsNearUser 
      : getStaticVendors();
    
    const finalCategories = formattedCategories.length > 0 
      ? formattedCategories 
      : getStaticCategories();
    
    const finalHeroBanners = formattedHeroBanners.length > 0 
      ? formattedHeroBanners 
      : getStaticHeroBanners();
    
    const finalOfferBannersTop = offerBannersTop.length > 0 
      ? offerBannersTop 
      : getStaticOfferBanners('top');
    
    const finalOfferBannersMiddle = offerBannersMiddle.length > 0 
      ? offerBannersMiddle 
      : getStaticOfferBanners('middle');
    
    const finalOfferBannersBottom = offerBannersBottom.length > 0 
      ? offerBannersBottom 
      : getStaticOfferBanners('bottom');

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
          count: finalTrendingServices.length,
          services: finalTrendingServices
        },
        mostPopularServices: {
          count: finalPopularServices.length,
          services: finalPopularServices
        },
        topVendorsNearUser: {
          count: finalTopVendors.length,
          vendors: finalTopVendors
        },
        categories: {
          count: finalCategories.length,
          categories: finalCategories
        },
        heroBanners: {
          count: finalHeroBanners.length,
          banners: finalHeroBanners
        },
        offerBanners: {
          top: {
            count: finalOfferBannersTop.length,
            banners: finalOfferBannersTop
          },
          middle: {
            count: finalOfferBannersMiddle.length,
            banners: finalOfferBannersMiddle
          },
          bottom: {
            count: finalOfferBannersBottom.length,
            banners: finalOfferBannersBottom
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
