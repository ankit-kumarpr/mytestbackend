const mongoose = require('mongoose');
const User = require('../models/User');
const Kyc = require('../models/Kyc');
const BusinessKeyword = require('../models/BusinessKeyword');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkBusinessKeywords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // KYC ID
    const kycId = '69148370524c6d6112d4870d';
    
    const kyc = await Kyc.findById(kycId);
    
    if (!kyc) {
      console.log('❌ KYC not found!');
      return;
    }

    console.log('📋 Vendor/Business Details:');
    console.log('==========================');
    console.log('Business Name:', kyc.businessName);
    console.log('Business ID:', kyc._id);
    console.log('Vendor ID:', kyc.userId);
    console.log('Status:', kyc.status);

    // Check keywords for this business
    console.log('\n\n🔍 Checking Business Keywords:');
    console.log('==============================');
    
    const keywords = await BusinessKeyword.find({ businessId: kycId })
      .populate('vendorId', 'name email')
      .populate('businessId', 'businessName');

    if (keywords.length === 0) {
      console.log('❌ NO KEYWORDS FOUND for this business!');
      console.log('\n🚨 PROBLEM: Business has no keywords registered!');
      console.log('   That\'s why lead search is failing.\n');
    } else {
      console.log(`✅ Found ${keywords.length} keyword(s):\n`);
      keywords.forEach((kw, index) => {
        console.log(`${index + 1}. "${kw.keyword}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkBusinessKeywords();

