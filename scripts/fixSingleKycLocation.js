const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');
const axios = require('axios');
require('dotenv').config();

// Helper function to get coordinates from address
async function getCoordinatesFromAddress(address) {
  try {
    console.log('Geocoding address:', address);

    // Try Google Maps API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: address,
            key: process.env.GOOGLE_MAPS_API_KEY,
            region: 'in'
          },
          timeout: 5000
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          console.log('✅ Google Geocoding successful:', location);
          return {
            longitude: location.lng,
            latitude: location.lat
          };
        }
      } catch (googleError) {
        console.warn('Google Geocoding failed:', googleError.message);
      }
    }

    // Try Positionstack API as fallback
    if (process.env.POSITIONSTACK_API_KEY) {
      try {
        const response = await axios.get('http://api.positionstack.com/v1/forward', {
          params: {
            access_key: process.env.POSITIONSTACK_API_KEY,
            query: address,
            country: 'IN',
            limit: 1
          },
          timeout: 5000
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
          const location = response.data.data[0];
          console.log('✅ Positionstack Geocoding successful:', location);
          return {
            longitude: location.longitude,
            latitude: location.latitude
          };
        }
      } catch (positionstackError) {
        console.warn('Positionstack Geocoding failed:', positionstackError.message);
      }
    }

    console.warn('❌ No geocoding API available or all failed.');
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

async function fixKycLocation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // KYC ID from your data
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

    // Build full address
    const fullAddress = [
      kyc.businessPlotNo,
      kyc.businessBuildingName,
      kyc.businessStreet,
      kyc.businessArea,
      kyc.businessCity,
      kyc.businessState,
      kyc.businessPincode,
      'India'
    ].filter(Boolean).join(', ');

    console.log('\n📍 Full Address:', fullAddress);
    console.log('\n🔄 Fetching correct coordinates...\n');

    // Get coordinates from address
    const coordinates = await getCoordinatesFromAddress(fullAddress);

    if (!coordinates) {
      console.log('\n❌ Could not fetch coordinates. Please check:');
      console.log('   1. Google Maps API key is set in .env');
      console.log('   2. Or Positionstack API key is set in .env');
      console.log('   3. Or manually update coordinates\n');
      return;
    }

    console.log('\n✅ New Coordinates Found:');
    console.log('   Longitude:', coordinates.longitude);
    console.log('   Latitude:', coordinates.latitude);

    // Update KYC
    kyc.location = {
      type: 'Point',
      coordinates: [coordinates.longitude, coordinates.latitude]
    };

    await kyc.save();

    console.log('\n✅ KYC Location Updated Successfully!');
    console.log('\n📍 Updated Location:');
    console.log('   Type:', kyc.location.type);
    console.log('   Coordinates:', kyc.location.coordinates);
    console.log('   Longitude:', kyc.location.coordinates[0]);
    console.log('   Latitude:', kyc.location.coordinates[1]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

fixKycLocation();

