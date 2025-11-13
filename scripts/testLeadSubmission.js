const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadResponse = require('../models/LeadResponse');
const BusinessKeyword = require('../models/BusinessKeyword');
const Kyc = require('../models/Kyc');
const User = require('../models/User');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testLeadSubmission() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test data
    const searchKeyword = 'Web development';
    const userLocation = {
      longitude: 78.0322,
      latitude: 30.3165,
      address: 'Dehradun, Uttarakhand',
      city: 'Dehradun',
      state: 'Uttarakhand',
      pincode: '248001'
    };
    const radius = 15000;
    const userId = '6914830289d2fba83f5fb7e5'; // Vendor ID (for testing)

    console.log('🧪 Testing Lead Submission Flow:');
    console.log('================================\n');

    // Step 1: Check keywords
    console.log('1️⃣  Checking keywords...');
    const searchWords = searchKeyword.trim().split(/\s+/);
    const searchRegex = new RegExp(searchWords.join('|'), 'i');
    const matchedKeywords = await BusinessKeyword.find({
      keyword: searchRegex
    }).populate('businessId vendorId');

    console.log(`   ✅ Found ${matchedKeywords.length} matching keyword(s)`);
    if (matchedKeywords.length === 0) {
      console.log('   ❌ No keywords found!');
      return;
    }

    // Step 2: Check nearby businesses
    console.log('\n2️⃣  Checking nearby businesses...');
    const nearbyBusinesses = await Kyc.find({
      status: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLocation.longitude, userLocation.latitude]
          },
          $maxDistance: radius
        }
      }
    }).select('_id userId businessName location');

    console.log(`   ✅ Found ${nearbyBusinesses.length} business(es) within ${radius/1000}km`);
    if (nearbyBusinesses.length === 0) {
      console.log('   ❌ No businesses found within radius!');
      return;
    }

    const nearbyBusinessIds = nearbyBusinesses.map(b => b._id.toString());
    console.log('   Business IDs:', nearbyBusinessIds);

    // Step 3: Filter relevant matches
    console.log('\n3️⃣  Filtering relevant matches...');
    const relevantMatches = matchedKeywords.filter(k => 
      k.businessId && 
      k.businessId.status === 'approved' &&
      nearbyBusinessIds.includes(k.businessId._id.toString())
    );

    console.log(`   ✅ Found ${relevantMatches.length} relevant match(es)`);
    if (relevantMatches.length === 0) {
      console.log('   ❌ No relevant matches!');
      return;
    }

    // Step 4: Check vendor IDs
    console.log('\n4️⃣  Vendor Details:');
    relevantMatches.forEach((match, index) => {
      const vendorId = match.vendorId?._id?.toString();
      const businessId = match.businessId?._id?.toString();
      console.log(`   ${index + 1}. Vendor ID: ${vendorId}`);
      console.log(`      Business ID: ${businessId}`);
      console.log(`      Keyword: "${match.keyword}"`);
      console.log(`      Room: vendor_${vendorId}`);
    });

    // Step 5: Check recent leads
    console.log('\n5️⃣  Recent Leads:');
    const recentLeads = await Lead.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email');

    console.log(`   Found ${recentLeads.length} recent lead(s):\n`);
    recentLeads.forEach((lead, index) => {
      console.log(`   ${index + 1}. Lead ID: ${lead._id}`);
      console.log(`      Keyword: "${lead.searchKeyword}"`);
      console.log(`      Status: ${lead.status}`);
      console.log(`      Created: ${lead.createdAt}`);
      console.log(`      Vendors Notified: ${lead.totalVendorsNotified || 0}`);
      console.log('');
    });

    // Step 6: Check lead responses
    if (recentLeads.length > 0) {
      console.log('6️⃣  Lead Responses:');
      const latestLead = recentLeads[0];
      const responses = await LeadResponse.find({ leadId: latestLead._id })
        .populate('vendorId', 'name email')
        .populate('businessId', 'businessName');

      console.log(`   Found ${responses.length} response(s) for latest lead:\n`);
      responses.forEach((response, index) => {
        const vendorId = response.vendorId?._id?.toString();
        console.log(`   ${index + 1}. Response ID: ${response._id}`);
        console.log(`      Vendor ID: ${vendorId}`);
        console.log(`      Vendor Room: vendor_${vendorId}`);
        console.log(`      Status: ${response.status}`);
        console.log(`      Distance: ${response.distance}m`);
        console.log('');
      });
    }

    console.log('\n✅ Test Complete!');
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log(`✓ Keywords matched: ${matchedKeywords.length}`);
    console.log(`✓ Nearby businesses: ${nearbyBusinesses.length}`);
    console.log(`✓ Relevant matches: ${relevantMatches.length}`);
    console.log(`✓ Recent leads: ${recentLeads.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testLeadSubmission();

