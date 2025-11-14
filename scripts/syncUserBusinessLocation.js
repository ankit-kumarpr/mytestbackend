const mongoose = require('mongoose');
const Kyc = require('../models/Kyc');
const User = require('../models/User');
require('dotenv').config();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) {
      config[key] = value;
    }
  });
  
  return config;
}

// Auto-detect which location has better/more complete data
function detectSyncDirection(user, business) {
  let userScore = 0;
  let businessScore = 0;
  
  // Check user location completeness
  if (user.location?.city) userScore++;
  if (user.location?.state) userScore++;
  if (user.location?.pincode) userScore++;
  if (user.location?.streetAddress) userScore++;
  if (user.location?.latitude && user.location?.longitude) userScore += 2; // Coordinates are important
  
  // Check business location completeness
  const businessCity = business.businessCity || business.city;
  const businessState = business.businessState || business.state;
  const businessPincode = business.businessPincode || business.pincode;
  const businessStreet = business.businessStreet || business.street;
  
  if (businessCity) businessScore++;
  if (businessState) businessScore++;
  if (businessPincode) businessScore++;
  if (businessStreet) businessScore++;
  if (business.location?.coordinates && business.location.coordinates.length === 2) businessScore += 2;
  
  // If scores are equal, prefer user-to-business (user location is usually more accurate)
  if (userScore >= businessScore) {
    return 'user-to-business';
  } else {
    return 'business-to-user';
  }
}

// Sync location from User to Business (KYC)
async function syncUserToBusiness(user, business) {
  console.log('\n🔄 Syncing User Location → Business/Vendor Location\n');
  
  // Show before state
  console.log('📋 BEFORE SYNC:');
  console.log('   User Coordinates: lat=' + (user.location?.latitude || 'N/A') + ', lng=' + (user.location?.longitude || 'N/A'));
  if (business.location?.coordinates && business.location.coordinates.length === 2) {
    const [oldLng, oldLat] = business.location.coordinates;
    console.log('   Vendor Coordinates: [' + oldLng + ', ' + oldLat + ']');
  } else {
    console.log('   Vendor Coordinates: N/A');
  }
  
  const updates = {};
  
  // Update business address fields from user location
  if (user.location?.streetAddress) {
    // Parse street address to extract components if possible
    const streetParts = user.location.streetAddress.split(',');
    if (streetParts.length > 0) {
      updates.businessStreet = streetParts[0].trim();
    }
    // If businessStreet is empty, use streetAddress
    if (!business.businessStreet && user.location.streetAddress) {
      updates.businessStreet = user.location.streetAddress;
    }
  }
  
  if (user.location?.city) {
    updates.businessCity = user.location.city;
  }
  
  if (user.location?.state) {
    updates.businessState = user.location.state;
  }
  
  if (user.location?.pincode) {
    updates.businessPincode = user.location.pincode;
  }
  
  // Update business location coordinates from user coordinates
  if (user.location?.latitude && user.location?.longitude) {
    const oldCoordinates = business.location?.coordinates || 'N/A';
    const newCoordinates = [user.location.longitude, user.location.latitude]; // [longitude, latitude]
    updates.location = {
      type: 'Point',
      coordinates: newCoordinates
    };
    console.log('\n📍 Coordinates Update:');
    console.log('   Vendor Old Coordinates:', oldCoordinates);
    console.log('   User Coordinates:');
    console.log('      Latitude:', user.location.latitude);
    console.log('      Longitude:', user.location.longitude);
    console.log('   Vendor New Coordinates:', newCoordinates);
    console.log('   ✅ Converting to GeoJSON format: [longitude, latitude]');
  }
  
  // Update legacy fields for backward compatibility
  if (user.location?.city) {
    updates.city = user.location.city;
  }
  
  if (user.location?.state) {
    updates.state = user.location.state;
  }
  
  if (user.location?.pincode) {
    updates.pincode = user.location.pincode;
  }
  
  if (user.location?.streetAddress) {
    const streetParts = user.location.streetAddress.split(',');
    if (streetParts.length > 0) {
      updates.street = streetParts[0].trim();
    }
  }
  
  // Update businessAddress field
  const addressParts = [
    updates.businessStreet || business.businessStreet,
    updates.businessArea || business.businessArea,
    updates.businessCity || business.businessCity,
    updates.businessState || business.businessState,
    updates.businessPincode || business.businessPincode
  ].filter(Boolean);
  
  if (addressParts.length > 0) {
    updates.businessAddress = addressParts.join(', ');
  }
  
  // Apply updates
  Object.keys(updates).forEach(key => {
    business[key] = updates[key];
  });
  
  await business.save();
  
  console.log('\n📋 AFTER SYNC:');
  console.log('   User Coordinates: lat=' + user.location.latitude + ', lng=' + user.location.longitude);
  if (business.location?.coordinates && business.location.coordinates.length === 2) {
    const [newLng, newLat] = business.location.coordinates;
    console.log('   Vendor Coordinates: [' + newLng + ', ' + newLat + ']');
  }
  
  console.log('\n✅ Business/Vendor Location Updated:');
  console.log('   City:', business.businessCity);
  console.log('   State:', business.businessState);
  console.log('   Pincode:', business.businessPincode);
  console.log('   Street:', business.businessStreet);
  if (business.location?.coordinates && business.location.coordinates.length === 2) {
    const [lng, lat] = business.location.coordinates;
    console.log('   📍 Coordinates: [' + lng + ', ' + lat + ']');
    console.log('      (Format: [longitude, latitude])');
  } else {
    console.log('   📍 Coordinates: N/A');
  }
  console.log('   Address:', business.businessAddress);
  
  // Verify coordinates match
  if (business.location?.coordinates && user.location?.latitude && user.location?.longitude) {
    const [lng, lat] = business.location.coordinates;
    const latMatch = Math.abs(lat - user.location.latitude) < 0.0001;
    const lngMatch = Math.abs(lng - user.location.longitude) < 0.0001;
    
    if (latMatch && lngMatch) {
      console.log('\n   ✅✅✅ COORDINATES SUCCESSFULLY MATCHED! ✅✅✅');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   User Location:');
      console.log('      Latitude:  ' + user.location.latitude);
      console.log('      Longitude: ' + user.location.longitude);
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Vendor Location (GeoJSON format):');
      console.log('      Coordinates: [' + lng + ', ' + lat + ']');
      console.log('      Format: [longitude, latitude]');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   ✅✅ Both User and Vendor now have EXACTLY the same coordinates!');
      console.log('   ✅✅ Vendor coordinates updated from user location!');
    } else {
      console.log('\n   ⚠️  Coordinate mismatch detected:');
      console.log('      User: lat=' + user.location.latitude + ', lng=' + user.location.longitude);
      console.log('      Vendor: [' + lng + ', ' + lat + ']');
      console.log('      ⚠️  Please check the sync process');
    }
  }
  
  return business;
}

// Sync both locations - make them same (use the more complete one as source)
async function syncBothLocations(user, business) {
  console.log('\n🔄 Syncing Both Locations - Making them Same\n');
  
  // Determine which location is more complete
  const userScore = calculateLocationScore(user, 'user');
  const businessScore = calculateLocationScore(business, 'business');
  
  console.log('📊 Location Completeness Score:');
  console.log('   User Location Score:', userScore);
  console.log('   Business Location Score:', businessScore);
  
  // Use the one with higher score, or prefer user if equal (user location is usually more accurate)
  if (userScore >= businessScore) {
    console.log('   ✅ Using User Location as source (more complete or equal)\n');
    await syncUserToBusiness(user, business);
  } else {
    console.log('   ✅ Using Business Location as source (more complete)\n');
    await syncBusinessToUser(business, user);
    // After syncing business to user, also sync user back to business to ensure both match
    // Re-fetch user to get updated data
    const updatedUser = await User.findById(user._id);
    await syncUserToBusiness(updatedUser, business);
  }
  
  // Final verification
  console.log('\n🔍 Final Verification:');
  const finalUser = await User.findById(user._id);
  const finalBusiness = await Kyc.findById(business._id);
  
  const userCity = finalUser.location?.city;
  const businessCity = finalBusiness.businessCity || finalBusiness.city;
  const userState = finalUser.location?.state;
  const businessState = finalBusiness.businessState || finalBusiness.state;
  const userPincode = finalUser.location?.pincode;
  const businessPincode = finalBusiness.businessPincode || finalBusiness.pincode;
  
  const citiesMatch = userCity && businessCity && userCity.toLowerCase() === businessCity.toLowerCase();
  const statesMatch = userState && businessState && userState.toLowerCase() === businessState.toLowerCase();
  const pincodesMatch = userPincode && businessPincode && userPincode === businessPincode;
  
  const userCoords = finalUser.location?.latitude && finalUser.location?.longitude 
    ? [finalUser.location.longitude, finalUser.location.latitude] 
    : null;
  const businessCoords = finalBusiness.location?.coordinates || null;
  
  const coordsMatch = userCoords && businessCoords && 
    Math.abs(userCoords[0] - businessCoords[0]) < 0.0001 &&
    Math.abs(userCoords[1] - businessCoords[1]) < 0.0001;
  
  console.log('   City Match:', citiesMatch ? '✅' : '❌');
  console.log('   State Match:', statesMatch ? '✅' : '❌');
  console.log('   Pincode Match:', pincodesMatch ? '✅' : '❌');
  console.log('   Coordinates Match:', coordsMatch ? '✅' : '❌');
  
  // Show coordinate details
  if (userCoords && businessCoords) {
    console.log('\n   📍 Coordinate Details:');
    console.log('      User: lat=' + finalUser.location.latitude + ', lng=' + finalUser.location.longitude);
    console.log('      Vendor: [' + businessCoords[0] + ', ' + businessCoords[1] + ']');
    if (coordsMatch) {
      console.log('      ✅✅ Coordinates are EXACTLY the same!');
    } else {
      console.log('      ⚠️  Coordinates differ - check above for details');
    }
  }
  
  if (citiesMatch && statesMatch && pincodesMatch && coordsMatch) {
    console.log('\n   🎉🎉 All locations are now perfectly synchronized!');
    console.log('      User and Vendor have identical location data including coordinates!');
  } else {
    console.log('\n   ⚠️  Some fields may still differ. Check the data above.');
  }
}

// Calculate location completeness score
function calculateLocationScore(entity, type) {
  let score = 0;
  
  if (type === 'user') {
    if (entity.location?.city) score++;
    if (entity.location?.state) score++;
    if (entity.location?.pincode) score++;
    if (entity.location?.streetAddress) score++;
    if (entity.location?.latitude && entity.location?.longitude) score += 2; // Coordinates are important
    if (entity.location?.country) score += 0.5;
  } else if (type === 'business') {
    const city = entity.businessCity || entity.city;
    const state = entity.businessState || entity.state;
    const pincode = entity.businessPincode || entity.pincode;
    const street = entity.businessStreet || entity.street;
    
    if (city) score++;
    if (state) score++;
    if (pincode) score++;
    if (street) score++;
    if (entity.location?.coordinates && entity.location.coordinates.length === 2) score += 2;
    if (entity.businessAddress) score += 0.5;
  }
  
  return score;
}

// Sync location from Business (KYC) to User
async function syncBusinessToUser(business, user) {
  console.log('\n🔄 Syncing Business Location → User Location\n');
  
  const updates = {};
  
  // Update user location fields from business address
  // Use business address fields (preferred) or legacy fields
  const city = business.businessCity || business.city;
  const state = business.businessState || business.state;
  const pincode = business.businessPincode || business.pincode;
  const street = business.businessStreet || business.street;
  
  if (city) {
    updates.city = city;
  }
  
  if (state) {
    updates.state = state;
  }
  
  if (pincode) {
    updates.pincode = pincode;
  }
  
  // Build street address from business fields
  const streetParts = [
    business.businessPlotNo,
    business.businessBuildingName,
    street
  ].filter(Boolean);
  
  if (streetParts.length > 0) {
    updates.streetAddress = streetParts.join(', ');
  } else if (street) {
    updates.streetAddress = street;
  }
  
  // Update user coordinates from business location
  if (business.location?.coordinates && business.location.coordinates.length === 2) {
    updates.longitude = business.location.coordinates[0]; // First is longitude
    updates.latitude = business.location.coordinates[1];  // Second is latitude
  }
  
  // Set country to India if not set
  if (!user.location?.country) {
    updates.country = 'India';
  }
  
  // Apply updates
  if (!user.location) {
    user.location = {};
  }
  
  Object.keys(updates).forEach(key => {
    user.location[key] = updates[key];
  });
  
  await user.save();
  
  console.log('✅ User Location Updated:');
  console.log('   City:', user.location.city);
  console.log('   State:', user.location.state);
  console.log('   Pincode:', user.location.pincode);
  console.log('   Street Address:', user.location.streetAddress);
  console.log('   Latitude:', user.location.latitude);
  console.log('   Longitude:', user.location.longitude);
  console.log('   Country:', user.location.country);
  
  return user;
}

async function syncLocation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Parse arguments
    const config = parseArgs();
    const userId = config.userId;
    const businessId = config.businessId || config.kycId;
    const direction = config.direction || 'sync-both'; // Default: sync both locations
    const syncAll = config.syncAll === 'true';
    
    if (!userId && !businessId) {
      console.log('❌ Error: Please provide either userId or businessId');
      console.log('\nUsage:');
      console.log('  node scripts/syncUserBusinessLocation.js userId=<userId> direction=user-to-business');
      console.log('  node scripts/syncUserBusinessLocation.js businessId=<businessId> direction=business-to-user');
      return;
    }
    
    let user, business;
    
    // Fetch user and business
    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        console.log('❌ User not found with ID:', userId);
        return;
      }
      
      // Find business(es) for this user
      const businesses = await Kyc.find({ userId: userId });
      if (businesses.length === 0) {
        console.log('❌ No business found for this user');
        return;
      }
      
      if (syncAll && businesses.length > 1) {
        console.log(`\n📦 Found ${businesses.length} businesses. Syncing all...\n`);
        let successCount = 0;
        
        for (let i = 0; i < businesses.length; i++) {
          const biz = businesses[i];
          console.log(`\n${'='.repeat(60)}`);
          console.log(`Business ${i + 1}/${businesses.length}: ${biz.businessName}`);
          console.log(`${'='.repeat(60)}`);
          
          try {
            let finalDirection = direction;
            if (direction === 'auto') {
              finalDirection = 'sync-both';
            }
            
            if (finalDirection === 'user-to-business' || finalDirection === 'utb') {
              await syncUserToBusiness(user, biz);
            } else if (finalDirection === 'business-to-user' || finalDirection === 'btu') {
              await syncBusinessToUser(biz, user);
              // Re-fetch user after first sync to get updated data
              if (i > 0) {
                user = await User.findById(userId);
              }
            } else if (finalDirection === 'sync-both' || finalDirection === 'both') {
              await syncBothLocations(user, biz);
              // Re-fetch user after sync to get updated data
              if (i > 0) {
                user = await User.findById(userId);
              }
            }
            successCount++;
          } catch (error) {
            console.error(`❌ Error syncing business ${biz._id}:`, error.message);
          }
        }
        
        console.log(`\n✅ Successfully synced ${successCount}/${businesses.length} businesses`);
        return;
      }
      
      if (businesses.length > 1) {
        console.log(`⚠️  Found ${businesses.length} businesses for this user. Using the first one.`);
        console.log('   Business IDs:', businesses.map(b => b._id).join(', '));
        console.log('   Tip: Use syncAll=true to sync all businesses');
      }
      
      business = businesses[0];
    } else if (businessId) {
      business = await Kyc.findById(businessId);
      if (!business) {
        console.log('❌ Business (KYC) not found with ID:', businessId);
        return;
      }
      
      user = await User.findById(business.userId);
      if (!user) {
        console.log('❌ User not found for this business');
        return;
      }
    }
    
    // Display current data
    console.log('📋 Current Data:');
    console.log('================');
    console.log('\n👤 User Location:');
    console.log('   City:', user.location?.city || 'N/A');
    console.log('   State:', user.location?.state || 'N/A');
    console.log('   Pincode:', user.location?.pincode || 'N/A');
    console.log('   Street:', user.location?.streetAddress || 'N/A');
    console.log('   Latitude:', user.location?.latitude || 'N/A');
    console.log('   Longitude:', user.location?.longitude || 'N/A');
    if (user.location?.latitude && user.location?.longitude) {
      console.log('   📍 Coordinates: [' + user.location.longitude + ', ' + user.location.latitude + ']');
    }
    
    console.log('\n🏢 Business Location (Before Sync):');
    console.log('   Business Name:', business.businessName);
    console.log('   City:', business.businessCity || business.city || 'N/A');
    console.log('   State:', business.businessState || business.state || 'N/A');
    console.log('   Pincode:', business.businessPincode || business.pincode || 'N/A');
    console.log('   Street:', business.businessStreet || business.street || 'N/A');
    if (business.location?.coordinates && business.location.coordinates.length === 2) {
      const [lng, lat] = business.location.coordinates;
      console.log('   📍 Coordinates: [' + lng + ', ' + lat + ']');
      console.log('   (Current coordinates are ' + (lng === user.location?.longitude && lat === user.location?.latitude ? '✅ matching' : '❌ NOT matching') + ' user location)');
    } else {
      console.log('   📍 Coordinates: N/A');
    }
    
    // Auto-detect direction if needed
    let finalDirection = direction;
    if (direction === 'auto') {
      finalDirection = 'sync-both'; // Default to sync both
      console.log(`\n🔍 Auto mode: Syncing both locations to match\n`);
    }
    
    // Perform sync based on direction
    if (finalDirection === 'user-to-business' || finalDirection === 'utb') {
      await syncUserToBusiness(user, business);
    } else if (finalDirection === 'business-to-user' || finalDirection === 'btu') {
      await syncBusinessToUser(business, user);
    } else if (finalDirection === 'sync-both' || finalDirection === 'both') {
      await syncBothLocations(user, business);
    } else {
      console.log('❌ Invalid direction. Use: user-to-business, business-to-user, sync-both, or auto');
      return;
    }
    
    console.log('\n✅ Location Sync Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

// Run the script
syncLocation();

