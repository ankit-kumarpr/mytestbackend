const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkKycCoordinates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the specific KYC
    const kyc = await Kyc.findById('69148370524c6d6112d4870d');
    
    if (!kyc) {
      console.log('❌ KYC not found!');
      return;
    }

    console.log('\n📍 KYC Location Details:');
    console.log('========================');
    console.log('Business Name:', kyc.businessName);
    console.log('Business City:', kyc.businessCity);
    console.log('Business State:', kyc.businessState);
    console.log('Business Pincode:', kyc.businessPincode);
    console.log('\n🗺️  Location Object:');
    console.log('Type:', kyc.location?.type);
    console.log('Coordinates:', kyc.location?.coordinates);
    console.log('  - Longitude:', kyc.location?.coordinates?.[0]);
    console.log('  - Latitude:', kyc.location?.coordinates?.[1]);

    // Check if coordinates are default/invalid
    if (!kyc.location || !kyc.location.coordinates) {
      console.log('\n❌ PROBLEM: Location coordinates not set!');
    } else if (kyc.location.coordinates[0] === 0 && kyc.location.coordinates[1] === 0) {
      console.log('\n❌ PROBLEM: Coordinates are [0, 0] (default/invalid)');
    } else if (kyc.location.coordinates[0] === 78.9629 && kyc.location.coordinates[1] === 20.5937) {
      console.log('\n⚠️  WARNING: Using fallback coordinates (India center)');
      console.log('   Google Maps API key missing or geocoding failed');
    } else {
      console.log('\n✅ Coordinates look valid!');
      
      // Expected coordinates for Dehradun
      console.log('\n📌 Expected Coordinates for Dehradun:');
      console.log('   Longitude: ~78.0322');
      console.log('   Latitude: ~30.3165');
      console.log('\n📌 Actual Coordinates in DB:');
      console.log('   Longitude:', kyc.location.coordinates[0]);
      console.log('   Latitude:', kyc.location.coordinates[1]);
    }

    // Check all approved KYCs
    console.log('\n\n📊 All Approved KYCs:');
    console.log('======================');
    const allKycs = await Kyc.find({ status: 'approved' })
      .select('businessName businessCity location');
    
    allKycs.forEach((k, index) => {
      console.log(`\n${index + 1}. ${k.businessName}`);
      console.log(`   City: ${k.businessCity}`);
      console.log(`   Coordinates: [${k.location?.coordinates?.[0]}, ${k.location?.coordinates?.[1]}]`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

checkKycCoordinates();

