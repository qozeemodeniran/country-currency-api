// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Log Cloudinary configuration status
console.log('=== Cloudinary Configuration ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'NOT SET');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'NOT SET');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ MISSING Cloudinary environment variables!');
  console.error('Please set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
} else {
  console.log('✅ Cloudinary environment variables are set');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test the configuration
async function testCloudinary() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary configuration test passed');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary configuration test failed:', error.message);
    return false;
  }
}

// Run test on startup
testCloudinary().then(success => {
  if (success) {
    console.log('✅ Cloudinary is ready to use');
  } else {
    console.log('❌ Cloudinary configuration issues - image generation will fail');
  }
});

module.exports = cloudinary;