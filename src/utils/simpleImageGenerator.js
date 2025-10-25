// src/utils/simpleImageGenerator.js
const cloudinary = require('../config/cloudinary');

class SimpleImageGenerator {
  async generateSummaryImage(countries, totalCountries, lastRefresh) {
    try {
      // Create a simple text-based image using Cloudinary's text overlay feature
      const textLines = [
        'COUNTRIES SUMMARY',
        `Total Countries: ${totalCountries}`,
        `Last Updated: ${new Date(lastRefresh).toLocaleDateString()}`,
        '',
        'TOP 5 COUNTRIES BY GDP:',
        ...countries.map((country, index) => 
          `${index + 1}. ${country.name}: $${(country.estimated_gdp / 1e9).toFixed(2)}B`
        )
      ];

      const textContent = textLines.join('|');

      // Use Cloudinary's text generation feature
      const uploadResult = await cloudinary.uploader.upload(
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_800,h_600,c_fill,q_auto,f_auto/r_max/c_scale,w_700/b_white/fl_layer_apply,g_north_west,x_50,y_50,l_text:arial_24_bold:${encodeURIComponent('COUNTRIES SUMMARY')}/fl_layer_apply,g_north_west,x_50,y_100,l_text:arial_18:${encodeURIComponent(`Total Countries: ${totalCountries}`)}/fl_layer_apply,g_north_west,x_50,y_140,l_text:arial_18:${encodeURIComponent(`Last Updated: ${new Date(lastRefresh).toLocaleDateString()}`)}/fl_layer_apply,g_north_west,x_50,y_200,l_text:arial_20_bold:${encodeURIComponent('TOP 5 COUNTRIES BY GDP:')}${countries.map((country, index) => `/fl_layer_apply,g_north_west,x_70,y_${250 + index * 40},l_text:arial_16:${encodeURIComponent(`${index + 1}. ${country.name}: $${(country.estimated_gdp / 1e9).toFixed(2)}B`)}`).join('')}`,
        {
          public_id: `countries_summary_${Date.now()}`,
          folder: 'country-api'
        }
      );

      console.log('Summary image generated using Cloudinary');
      return uploadResult.secure_url;

    } catch (error) {
      console.error('Error generating summary image:', error);
      
      // Fallback: Return a URL to a placeholder image
      return 'https://res.cloudinary.com/' + process.env.CLOUDINARY_CLOUD_NAME + '/image/upload/w_800,h_600,c_fill,q_auto,f_auto/b_white/l_text:arial_24:Countries%20Summary%20Not%20Available/country-api/placeholder';
    }
  }

  // Alternative method using multiple API calls for better formatting
  async generateFormattedSummaryImage(countries, totalCountries, lastRefresh) {
    try {
      // Start with a base image
      let transformation = [
        'w_800',
        'h_600',
        'c_fill',
        'q_auto',
        'f_auto',
        'b_white'
      ];

      // Add title
      transformation.push(`l_text:arial_30_bold:${encodeURIComponent('COUNTRIES SUMMARY')},g_north,y_50`);
      
      // Add total countries
      transformation.push(`l_text:arial_20:${encodeURIComponent(`Total Countries: ${totalCountries}`)},g_north,y_120`);
      
      // Add last updated
      transformation.push(`l_text:arial_20:${encodeURIComponent(`Last Updated: ${new Date(lastRefresh).toLocaleString()}`)},g_north,y_160`);
      
      // Add section header
      transformation.push(`l_text:arial_24_bold:${encodeURIComponent('TOP 5 COUNTRIES BY GDP')},g_north,y_220`);

      // Add each country
      countries.forEach((country, index) => {
        const gdpText = country.estimated_gdp 
          ? `$${(country.estimated_gdp / 1e9).toFixed(2)}B`
          : 'N/A';
        transformation.push(`l_text:arial_18:${encodeURIComponent(`${index + 1}. ${country.name}: ${gdpText}`)},g_north,y_${280 + index * 40}`);
      });

      const transformationString = transformation.join('/');

      const uploadResult = await cloudinary.uploader.upload(
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}`,
        {
          public_id: `countries_summary_${Date.now()}`,
          folder: 'country-api'
        }
      );

      return uploadResult.secure_url;

    } catch (error) {
      console.error('Error generating formatted summary image:', error);
      return this.generateFallbackImage();
    }
  }

  generateFallbackImage() {
    // Return a simple fallback image URL
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_800,h_600,c_fill,q_auto,f_auto/b_white/l_text:arial_24:Countries%20Data%20Summary/country-api/fallback`;
  }
}

module.exports = new SimpleImageGenerator();