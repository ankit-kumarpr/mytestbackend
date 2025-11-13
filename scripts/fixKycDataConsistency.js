const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// City coordinates database
const cityCoordinates = {
  'Dehradun': { longitude: 78.0322, latitude: 30.3165, state: 'Uttarakhand', pincode: '248001' },
  'Bangalore': { longitude: 77.5946, latitude: 12.9716, state: 'Karnataka', pincode: '560001' },
  'Delhi': { longitude: 77.2090, latitude: 28.6139, state: 'Delhi', pincode: '110001' },
  'Mumbai': { longitude: 72.8777, latitude: 19.0760, state: 'Maharashtra', pincode: '400001' },
  'Pune': { longitude: 73.8567, latitude: 18.5204, state: 'Maharashtra', pincode: '411001' },
  'Chennai': { longitude: 80.2707, latitude: 13.0827, state: 'Tamil Nadu', pincode: '600001' },
  'Hyderabad': { longitude: 78.4867, latitude: 17.3850, state: 'Telangana', pincode: '500001' },
  'Kolkata': { longitude: 88.3639, latitude: 22.5726, state: 'West Bengal', pincode: '700001' }
};

async function fixKycDataConsistency() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // KYC ID that needs fixing
    const kycId = '69148370524c6d6112d4870d';
    
    const kyc = await Kyc.findById(kycId);
    
    if (!kyc) {
      console.log('❌ KYC not found!');
      return;
    }

    console.log('📋 Current KYC Data:');
    console.log('========================');
    console.log('\n🏢 Business Fields (PRIMARY):');
    console.log('   businessCity:', kyc.businessCity);
    console.log('   businessState:', kyc.businessState);
    console.log('   businessPincode:', kyc.businessPincode);
    
    console.log('\n📍 Legacy Fields:');
    console.log('   city:', kyc.city);
    console.log('   state:', kyc.state);
    console.log('   pincode:', kyc.pincode);
    
    console.log('\n🗺️  Current Location:');
    console.log('   Coordinates:', kyc.location?.coordinates);
    console.log('   Longitude:', kyc.location?.coordinates?.[0]);
    console.log('   Latitude:', kyc.location?.coordinates?.[1]);

    // Detect inconsistency
    console.log('\n\n🔍 Data Consistency Check:');
    console.log('==========================');
    
    const businessCity = kyc.businessCity || kyc.city;
    const businessState = kyc.businessState || kyc.state;
    const businessPincode = kyc.businessPincode || kyc.pincode;
    
    // Check if legacy fields match business fields
    if (kyc.pincode && kyc.pincode !== businessPincode) {
      console.log('⚠️  WARNING: Legacy pincode (' + kyc.pincode + ') does not match businessPincode (' + businessPincode + ')');
    }
    
    if (kyc.state && kyc.state !== businessState) {
      console.log('⚠️  WARNING: Legacy state (' + kyc.state + ') does not match businessState (' + businessState + ')');
    }

    // Determine correct city
    console.log('\n📍 Primary Business Location: ' + businessCity + ', ' + businessState);
    
    // Get coordinates for the city
    const cityData = cityCoordinates[businessCity];
    
    if (!cityData) {
      console.log('\n❌ City "' + businessCity + '" not found in database.');
      console.log('   Available cities:', Object.keys(cityCoordinates).join(', '));
      console.log('\n💡 Please manually add coordinates or use one of the available cities.');
      return;
    }

    console.log('\n✅ Found coordinates for ' + businessCity + ':');
    console.log('   Longitude:', cityData.longitude);
    console.log('   Latitude:', cityData.latitude);
    console.log('   State:', cityData.state);
    console.log('   Sample Pincode:', cityData.pincode);

    // Ask for confirmation (in comments)
    console.log('\n\n🔄 Will Update:');
    console.log('================');
    console.log('✓ location.coordinates: [' + cityData.longitude + ', ' + cityData.latitude + ']');
    console.log('✓ Fix legacy fields to match business fields');
    console.log('\nUpdating...\n');

    // Update KYC with correct data
    kyc.location = {
      type: 'Point',
      coordinates: [cityData.longitude, cityData.latitude]
    };

    // Fix legacy fields to match business fields
    kyc.city = businessCity;
    kyc.state = businessState;
    kyc.pincode = businessPincode;

    await kyc.save();

    console.log('✅ KYC Data Updated Successfully!');
    console.log('\n📍 Updated Location:');
    console.log('   Coordinates:', kyc.location.coordinates);
    console.log('   City:', kyc.city);
    console.log('   State:', kyc.state);
    console.log('   Pincode:', kyc.pincode);

    // Calculate match radius for testing
    console.log('\n\n🎯 Testing Info:');
    console.log('=================');
    console.log('✓ Vendor is now correctly located in: ' + businessCity);
    console.log('✓ Coordinates: [' + cityData.longitude + ', ' + cityData.latitude + ']');
    console.log('\n📱 To test lead submission:');
    console.log('   Use location near ' + businessCity + ' with 15km radius');
    console.log('   Example coordinates: [' + cityData.longitude + ', ' + cityData.latitude + ']');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

fixKycDataConsistency();

