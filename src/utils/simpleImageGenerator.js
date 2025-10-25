// src/utils/simpleImageGenerator.js
const cloudinary = require('../config/cloudinary');

class SimpleImageGenerator {
  async generateFormattedSummaryImage(countries, totalCountries, lastRefresh) {
    try {
      console.log('Starting formatted image generation...');
      console.log('Countries for image:', countries);
      
      // Create base transformation
      const transformations = [
        'w_800',
        'h_600',
        'c_fill',
        'q_auto:best',
        'f_auto',
        'b_white'
      ];

      // Add title
      transformations.push('l_text:Arial_30_bold:COUNTRIES%20SUMMARY,g_north,y_50');
      
      // Add total countries
      transformations.push(`l_text:Arial_20:Total%20Countries%3A%20${totalCountries},g_north,y_120`);
      
      // Add last updated
      const lastUpdated = new Date(lastRefresh).toLocaleDateString();
      transformations.push(`l_text:Arial_20:Last%20Updated%3A%20${encodeURIComponent(lastUpdated)},g_north,y_160`);
      
      // Add section header
      transformations.push('l_text:Arial_24_bold:TOP%205%20COUNTRIES%20BY%20GDP,g_north,y_220');

      // Add each country
      if (countries && countries.length > 0) {
        countries.forEach((country, index) => {
          const yPosition = 280 + (index * 40);
          const gdpValue = country.estimated_gdp ? (country.estimated_gdp / 1e9).toFixed(2) : '0.00';
          const countryText = `${index + 1}.%20${encodeURIComponent(country.name)}%3A%20$${gdpValue}B`;
          transformations.push(`l_text:Arial_18:${countryText},g_north,y_${yPosition}`);
        });
      } else {
        transformations.push('l_text:Arial_18:No%20GDP%20data%20available,g_north,y_280');
      }

      const transformationString = transformations.join('/');
      const imageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}`;
      
      console.log('Uploading to Cloudinary...');
      console.log('Image URL length:', imageUrl.length);
      
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        public_id: `countries_summary_${Date.now()}`,
        folder: 'country-api',
        resource_type: 'image',
        timeout: 30000
      });

      console.log('Formatted image uploaded successfully');
      return uploadResult.secure_url;

    } catch (error) {
      console.error('Error in generateFormattedSummaryImage:', error.message);
      throw error;
    }
  }

  // Simple image with less complexity
  async generateSimpleImage(countries, totalCountries, lastRefresh) {
    try {
      console.log('Starting simple image generation...');
      
      const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      const params = [
        'w_600',
        'h_400',
        'c_fill',
        'b_lightblue',
        `l_text:Arial_26:Countries%20Summary,co_black,g_center,y_80`,
        `l_text:Arial_18:Total%3A%20${totalCountries}%20countries,co_black,g_center,y_120`,
        `l_text:Arial_16:Updated%3A%20${encodeURIComponent(new Date(lastRefresh).toLocaleDateString())},co_black,g_center,y_150`
      ];

      // Add top countries if available
      if (countries && countries.length > 0) {
        params.push('l_text:Arial_18_bold:Top%20Countries%3A,co_black,g_center,y_190');
        countries.slice(0, 3).forEach((country, index) => {
          const yPos = 220 + (index * 25);
          const shortName = country.name.length > 15 ? country.name.substring(0, 15) + '...' : country.name;
          params.push(`l_text:Arial_14:${encodeURIComponent(shortName)},co_black,g_center,y_${yPos}`);
        });
      }

      const imageUrl = `${baseUrl}/${params.join('/')}`;
      
      console.log('Simple image URL length:', imageUrl.length);
      
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        public_id: `simple_summary_${Date.now()}`,
        folder: 'country-api',
        timeout: 30000
      });

      console.log('Simple image uploaded successfully');
      return uploadResult.secure_url;
    } catch (error) {
      console.error('Error in generateSimpleImage:', error.message);
      throw error;
    }
  }

  // Basic image - minimal text
  async generateBasicImage(totalCountries, lastRefresh) {
    try {
      console.log('Starting basic image generation...');
      
      const uploadResult = await cloudinary.uploader.upload(
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_300,c_fill,b_lightsteelblue/l_text:Arial_20:Countries%20Summary/l_text:Arial_16:Total%3A%20${totalCountries}%20countries/l_text:Arial_14:Updated%3A%20${encodeURIComponent(new Date(lastRefresh).toLocaleDateString())}`,
        {
          public_id: `basic_summary_${Date.now()}`,
          folder: 'country-api',
          timeout: 30000
        }
      );

      console.log('Basic image uploaded successfully');
      return uploadResult.secure_url;
    } catch (error) {
      console.error('Error in generateBasicImage:', error.message);
      throw error;
    }
  }

  // Ultra simple placeholder as last resort
  async generatePlaceholderImage(totalCountries) {
    try {
      // Use a placeholder service
      const placeholderUrl = `https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Countries%3A+${totalCountries}`;
      
      const uploadResult = await cloudinary.uploader.upload(placeholderUrl, {
        public_id: `placeholder_${Date.now()}`,
        folder: 'country-api',
        timeout: 30000
      });

      console.log('Placeholder image uploaded');
      return uploadResult.secure_url;
    } catch (error) {
      console.error('Error in generatePlaceholderImage:', error.message);
      // If even this fails, return a static URL
      return `https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Countries%3A+${totalCountries}`;
    }
  }
}

module.exports = new SimpleImageGenerator();