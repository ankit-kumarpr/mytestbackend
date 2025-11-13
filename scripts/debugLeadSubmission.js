const mongoose = require('mongoose');
const BusinessKeyword = require('../models/BusinessKeyword');
const Kyc = require('../models/Kyc');
const User = require('../models/User');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debugLeadSubmission() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test data
    const searchKeyword = 'Web development';
    const userLocation = {
      longitude: 78.0322,
      latitude: 30.3165
    };
    const radius = 15000; // 15km

    console.log('🔍 Testing Lead Submission Logic:');
    console.log('==================================\n');
    console.log('Search Keyword:', searchKeyword);
    console.log('User Location:', userLocation);
    console.log('Radius:', radius, 'meters (', radius/1000, 'km)\n');

    // Step 1: Find matching keywords
    console.log('📝 Step 1: Finding matching keywords...');
    const searchWords = searchKeyword.trim().split(/\s+/);
    const searchRegex = new RegExp(searchWords.join('|'), 'i');
    console.log('   Search Regex:', searchRegex);
    
    const matchedKeywords = await BusinessKeyword.find({
      keyword: searchRegex
    }).populate('businessId vendorId');

    console.log(`   ✅ Found ${matchedKeywords.length} matching keyword(s):\n`);
    matchedKeywords.forEach((kw, index) => {
      console.log(`   ${index + 1}. Keyword: "${kw.keyword}"`);
      console.log(`      Business ID: ${kw.businessId?._id || 'NULL'}`);
      console.log(`      Business Name: ${kw.businessId?.businessName || 'NULL'}`);
      console.log(`      Business Status: ${kw.businessId?.status || 'NULL'}`);
      console.log(`      Vendor ID: ${kw.vendorId?._id || 'NULL'}`);
      console.log('');
    });

    if (matchedKeywords.length === 0) {
      console.log('❌ No keywords matched!');
      return;
    }

    // Step 2: Find nearby businesses
    console.log('\n📍 Step 2: Finding businesses within radius...');
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
    }).select('_id userId businessName location city state status');

    console.log(`   ✅ Found ${nearbyBusinesses.length} business(es) within ${radius/1000}km:\n`);
    nearbyBusinesses.forEach((b, index) => {
      console.log(`   ${index + 1}. ${b.businessName}`);
      console.log(`      ID: ${b._id}`);
      console.log(`      Status: ${b.status}`);
      console.log(`      Location: [${b.location?.coordinates?.[0]}, ${b.location?.coordinates?.[1]}]`);
      console.log(`      City: ${b.city}`);
      console.log('');
    });

    const nearbyBusinessIds = nearbyBusinesses.map(b => b._id.toString());
    console.log('   Nearby Business IDs:', nearbyBusinessIds);

    // Step 3: Filter matched keywords for nearby businesses
    console.log('\n🔗 Step 3: Matching keywords with nearby businesses...');
    const relevantMatches = matchedKeywords.filter(k => {
      const businessId = k.businessId?._id?.toString();
      const businessStatus = k.businessId?.status;
      const isNearby = nearbyBusinessIds.includes(businessId);
      
      console.log(`   Keyword: "${k.keyword}"`);
      console.log(`      Business ID: ${businessId}`);
      console.log(`      Business Status: ${businessStatus}`);
      console.log(`      Is Nearby: ${isNearby}`);
      console.log(`      Match: ${businessStatus === 'approved' && isNearby ? '✅ YES' : '❌ NO'}`);
      console.log('');

      return k.businessId && 
             k.businessId.status === 'approved' && 
             nearbyBusinessIds.includes(businessId);
    });

    console.log(`\n📊 Final Result:`);
    console.log('================');
    console.log(`   Total Keywords Matched: ${matchedKeywords.length}`);
    console.log(`   Nearby Businesses: ${nearbyBusinesses.length}`);
    console.log(`   Relevant Matches: ${relevantMatches.length}`);

    if (relevantMatches.length === 0) {
      console.log('\n❌ PROBLEM FOUND:');
      console.log('================');
      console.log('No relevant matches found!');
      console.log('\nPossible issues:');
      
      if (nearbyBusinesses.length === 0) {
        console.log('   ❌ No businesses found within radius');
        console.log('      Check: Location coordinates in KYC');
        console.log('      Check: Geospatial index exists');
      } else {
        console.log('   ❌ Businesses found but keywords don\'t match');
        matchedKeywords.forEach(k => {
          const businessId = k.businessId?._id?.toString();
          const isNearby = nearbyBusinessIds.includes(businessId);
          if (!isNearby) {
            console.log(`      - Keyword "${k.keyword}" business ID ${businessId} is NOT in nearby list`);
          }
          if (k.businessId?.status !== 'approved') {
            console.log(`      - Keyword "${k.keyword}" business status is "${k.businessId?.status}" (not approved)`);
          }
        });
      }
    } else {
      console.log('\n✅ SUCCESS! Lead can be submitted!');
      console.log('   Vendors will receive notifications.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugLeadSubmission();

