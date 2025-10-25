const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { createConnection } = require('../config/database');

class ImageService {
  constructor() {
    this.cacheDir = path.join(__dirname, '../cache');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async generateSummaryImage() {
    const connection = await createConnection();
    
    try {
      // Get top 5 countries by GDP
      const [topCountries] = await connection.execute(`
        SELECT name, estimated_gdp 
        FROM countries 
        WHERE estimated_gdp IS NOT NULL 
        ORDER BY estimated_gdp DESC 
        LIMIT 5
      `);

      const status = await connection.execute(
        'SELECT last_refreshed_at, total_countries FROM refresh_metadata WHERE id = 1'
      );
      const metadata = status[0][0];

      // Create canvas
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, 800, 600);

      // Title
      ctx.fillStyle = '#343a40';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Countries Summary', 400, 60);

      // Total countries
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Total Countries: ${metadata.total_countries}`, 50, 120);

      // Last refresh
      ctx.fillText(`Last Refresh: ${new Date(metadata.last_refreshed_at).toLocaleString()}`, 50, 150);

      // Top countries title
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Top 5 Countries by Estimated GDP:', 50, 200);

      // Top countries list
      ctx.font = '18px Arial';
      let yPosition = 240;
      topCountries.forEach((country, index) => {
        const gdpFormatted = new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 2
        }).format(country.estimated_gdp / 1e9); // Convert to billions
        
        ctx.fillText(
          `${index + 1}. ${country.name}: $${gdpFormatted}B`,
          70,
          yPosition
        );
        yPosition += 30;
      });

      // Save image
      const buffer = canvas.toBuffer('image/png');
      const imagePath = path.join(this.cacheDir, 'summary.png');
      fs.writeFileSync(imagePath, buffer);

      return imagePath;
    } finally {
      await connection.end();
    }
  }

  getImagePath() {
    const imagePath = path.join(this.cacheDir, 'summary.png');
    return fs.existsSync(imagePath) ? imagePath : null;
  }
}

module.exports = new ImageService();