const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function manualFixKycCoordinates() {
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

    console.log('📋 Current KYC Details:');
    console.log('========================');
    console.log('Business Name:', kyc.businessName);
    console.log('Business City:', kyc.businessCity);
    console.log('Business State:', kyc.businessState);
    console.log('Business Pincode:', kyc.businessPincode);
    console.log('Current Coordinates:', kyc.location?.coordinates);
    console.log('  - Current Longitude:', kyc.location?.coordinates?.[0]);
    console.log('  - Current Latitude:', kyc.location?.coordinates?.[1]);

    // Dehradun, Uttarakhand coordinates
    const dehradunCoordinates = {
      longitude: 78.0322,
      latitude: 30.3165
    };

    console.log('\n📍 Updating to Dehradun Coordinates:');
    console.log('   New Longitude:', dehradunCoordinates.longitude);
    console.log('   New Latitude:', dehradunCoordinates.latitude);

    // Update KYC
    kyc.location = {
      type: 'Point',
      coordinates: [dehradunCoordinates.longitude, dehradunCoordinates.latitude]
    };

    await kyc.save();

    console.log('\n✅ KYC Location Updated Successfully!');
    console.log('\n📍 Verified Updated Location:');
    console.log('   Type:', kyc.location.type);
    console.log('   Coordinates:', kyc.location.coordinates);
    console.log('   Longitude:', kyc.location.coordinates[0]);
    console.log('   Latitude:', kyc.location.coordinates[1]);

    // Verify by fetching again
    const verifyKyc = await Kyc.findById(kycId);
    console.log('\n🔍 Database Verification:');
    console.log('   Coordinates from DB:', verifyKyc.location.coordinates);
    
    console.log('\n✅ Success! Now vendor is properly located in Dehradun.');
    console.log('   Try submitting a lead from Dehradun area now!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

manualFixKycCoordinates();

