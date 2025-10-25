const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs');
const path = require('path');

class ImageGenerator {
  constructor() {
    this.cacheDir = path.join(__dirname, '../cache');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      notation: 'compact'
    }).format(num);
  }

  generateHTML(totalCountries, topCountries, lastRefreshed) {
    // Ensure we have valid data
    const safeTopCountries = Array.isArray(topCountries) ? topCountries.slice(0, 5) : [];
    const safeTotal = totalCountries || 0;
    const safeLastRefreshed = lastRefreshed || new Date().toISOString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c3e50;
            font-size: 36px;
            margin: 0;
            padding: 0;
          }
          .stats {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            text-align: center;
            border-left: 5px solid #3498db;
          }
          .total-countries {
            font-size: 24px;
            color: #34495e;
            margin-bottom: 10px;
            font-weight: bold;
          }
          .last-refreshed {
            color: #7f8c8d;
            font-size: 16px;
          }
          .top-countries {
            margin-top: 30px;
          }
          .top-countries h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 12px;
            margin-bottom: 20px;
            font-size: 24px;
          }
          .country-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .country-item {
            background: white;
            margin: 15px 0;
            padding: 20px;
            border-radius: 12px;
            border-left: 5px solid #27ae60;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: transform 0.2s ease;
          }
          .country-item:hover {
            transform: translateY(-2px);
          }
          .country-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
          }
          .country-gdp {
            font-size: 18px;
            color: #27ae60;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #95a5a6;
            font-size: 14px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
          }
          .no-data {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌍 Countries Summary</h1>
          </div>
          
          <div class="stats">
            <div class="total-countries">
              📊 Total Countries: ${safeTotal}
            </div>
            <div class="last-refreshed">
              🔄 Last Refreshed: ${new Date(safeLastRefreshed).toLocaleString()}
            </div>
          </div>

          <div class="top-countries">
            <h2>🏆 Top 5 Countries by Estimated GDP</h2>
            ${safeTopCountries.length > 0 ? `
              <ul class="country-list">
                ${safeTopCountries.map((country, index) => `
                  <li class="country-item">
                    <span class="country-name">${index + 1}. ${country.name}</span>
                    <span class="country-gdp">$${this.formatNumber(country.estimated_gdp)}</span>
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div class="no-data">
                No GDP data available. Refresh countries data first.
              </div>
            `}
          </div>

          <div class="footer">
            Generated by Country Currency API • ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async generateSummaryImage(totalCountries, topCountries, lastRefreshed) {
    try {
      const html = this.generateHTML(totalCountries, topCountries, lastRefreshed);
      
      const imagePath = path.join(this.cacheDir, 'summary.png');
      
      await nodeHtmlToImage({
        output: imagePath,
        html: html,
        type: 'png',
        quality: 100,
        puppeteerArgs: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true
        },
        waitUntil: 'networkidle0'
      });

      console.log('Summary image generated successfully at:', imagePath);
      return imagePath;
    } catch (error) {
      console.error('Error generating summary image:', error);
      // Create a simple fallback image or text file
      const fallbackPath = path.join(this.cacheDir, 'summary.png');
      fs.writeFileSync(fallbackPath, ''); // Create empty file as fallback
      return fallbackPath;
    }
  }

  getImagePath() {
    return path.join(this.cacheDir, 'summary.png');
  }

  imageExists() {
    const path = this.getImagePath();
    return fs.existsSync(path) && fs.statSync(path).size > 0;
  }
}

module.exports = new ImageGenerator();