// src/utils/simpleImageGenerator.js
const { createCanvas } = require('canvas');
const cloudinary = require('../config/cloudinary');

const simpleImageGenerator = {
  async generateFormattedSummaryImage(topCountries, totalProcessed, refreshTimestamp) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 30px Sans';
    ctx.fillText('🌍 Country Currency Summary', 40, 60);

    // Sub-info
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px Sans';
    ctx.fillText(`Total Countries: ${totalProcessed}`, 40, 110);
    ctx.fillText(`Last Refresh: ${new Date(refreshTimestamp).toUTCString()}`, 40, 140);

    // Header for top 5 GDPs
    ctx.fillStyle = '#38bdf8';
    ctx.font = '20px Sans';
    ctx.fillText('Top 5 Countries by Estimated GDP:', 40, 190);

    // List countries
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px Sans';
    topCountries.forEach((c, i) => {
      ctx.fillText(`${i + 1}. ${c.name} — ${Number(c.estimated_gdp).toLocaleString()}`, 60, 230 + i * 40);
    });

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');

    // Upload directly to Cloudinary (no local file)
    const result = await cloudinary.uploader.upload_stream({
      folder: 'country-api',
      public_id: 'countries_summary',
      overwrite: true,
      resource_type: 'image'
    }, (error, uploadResult) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
      }
      return uploadResult;
    });

    // ✅ Fix: return Promise that resolves after stream upload
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'country-api',
          public_id: 'countries_summary',
          overwrite: true,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }
};

module.exports = simpleImageGenerator;
