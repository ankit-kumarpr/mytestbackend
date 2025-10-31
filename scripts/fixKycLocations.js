require('dotenv').config();
const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your_database');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Fix all KYC locations
const fixLocations = async () => {
  try {
    console.log('🔄 Starting location fix...\n');

    // Find all KYC records
    const allKyc = await Kyc.find({});
    console.log(`📊 Found ${allKyc.length} KYC records\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const kyc of allKyc) {
      try {
        let needsUpdate = false;
        let longitude = 0;
        let latitude = 0;

        // Check if location object exists and is valid
        if (!kyc.location || 
            !kyc.location.coordinates || 
            kyc.location.coordinates[0] === 0 || 
            kyc.location.coordinates[1] === 0) {
          
          // Check if latitude/longitude fields exist (old format)
          if (kyc.latitude && kyc.longitude) {
            longitude = parseFloat(kyc.longitude);
            latitude = parseFloat(kyc.latitude);
            needsUpdate = true;
            console.log(`🔧 Fixing: ${kyc.businessName}`);
            console.log(`   Old format: lat=${kyc.latitude}, lng=${kyc.longitude}`);
          } else {
            // No location data at all - try geocoding from address
            console.log(`⚠️  No location data for: ${kyc.businessName}`);
            console.log(`   Address: ${kyc.city}, ${kyc.state}, ${kyc.pincode}`);
            
            // Use approximate center of India as fallback
            longitude = 78.9629;
            latitude = 20.5937;
            needsUpdate = true;
            console.log(`   Using default location (India center)`);
          }
        }

        if (needsUpdate) {
          // Update with proper location format
          kyc.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };

          // Build business address if not exists
          if (!kyc.businessAddress) {
            kyc.businessAddress = [
              kyc.plotNo,
              kyc.buildingName,
              kyc.street,
              kyc.area,
              kyc.city,
              kyc.state,
              kyc.pincode
            ].filter(Boolean).join(', ');
          }

          await kyc.save();
          console.log(`✅ Fixed: [${longitude}, ${latitude}]\n`);
          fixedCount++;
        } else {
          console.log(`✓ Already OK: ${kyc.businessName}`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error fixing ${kyc.businessName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`⏭️  Skipped (already OK): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${allKyc.length}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await fixLocations();
};

run();

