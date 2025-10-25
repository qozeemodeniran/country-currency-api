// src/controllers/countryController.js
const db = require('../config/database');
const axios = require('axios');
const cloudinary = require('../config/cloudinary');
const simpleImageGenerator = require('../utils/simpleImageGenerator');

// Helper functions (not class methods to avoid scope issues)
const getTopCountriesByGDP = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT name, estimated_gdp 
      FROM countries 
      WHERE estimated_gdp IS NOT NULL 
      ORDER BY estimated_gdp DESC 
      LIMIT 5
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error in getTopCountriesByGDP:', err);
        reject(err);
      } else {
        console.log(`Found ${results.length} top countries for image`);
        resolve(results);
      }
    });
  });
};

const getTotalCountries = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM countries';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error in getTotalCountries:', err);
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
};

class CountryController {
  // Refresh countries data
  refreshCountries = async (req, res) => {
    try {
      console.log('Starting countries refresh...');
      
      // Fetch countries data
      const countriesResponse = await axios.get(process.env.COUNTRIES_API_URL, {
        timeout: 30000
      });
      const countries = countriesResponse.data;
      console.log(`Fetched ${countries.length} countries from API`);
      
      // Fetch exchange rates
      let exchangeRates;
      try {
        const exchangeResponse = await axios.get(process.env.EXCHANGE_API_URL, {
          timeout: 30000
        });
        exchangeRates = exchangeResponse.data.rates;
        console.log('Fetched exchange rates successfully');
      } catch (exchangeError) {
        console.error('Exchange API error:', exchangeError);
        return res.status(503).json({
          error: 'External data source unavailable',
          details: 'Could not fetch data from exchange rates API'
        });
      }
      
      let refreshTimestamp = new Date();
      let processedCount = 0;
      let errors = [];
      
      // Process each country
      for (const country of countries) {
        try {
          // Validate required fields
          if (!country.name || country.population === undefined) {
            errors.push(`Missing required fields for country: ${country.name}`);
            continue;
          }
          
          // Extract currency code (take first one if multiple)
          let currencyCode = null;
          if (country.currencies && country.currencies.length > 0 && country.currencies[0].code) {
            currencyCode = country.currencies[0].code;
          }
          
          // Get exchange rate
          let exchangeRate = null;
          let estimatedGdp = null;
          
          if (currencyCode && exchangeRates[currencyCode]) {
            exchangeRate = parseFloat(exchangeRates[currencyCode]);
            // Generate random multiplier between 1000 and 2000
            const randomMultiplier = Math.random() * 1000 + 1000;
            estimatedGdp = (country.population * randomMultiplier) / exchangeRate;
          } else if (currencyCode) {
            // Currency code exists but no exchange rate found
            exchangeRate = null;
            estimatedGdp = null;
          } else {
            // No currency code
            estimatedGdp = 0;
          }
          
          // Insert or update country
          const query = `
            INSERT INTO countries (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            capital = VALUES(capital),
            region = VALUES(region),
            population = VALUES(population),
            currency_code = VALUES(currency_code),
            exchange_rate = VALUES(exchange_rate),
            estimated_gdp = VALUES(estimated_gdp),
            flag_url = VALUES(flag_url),
            last_refreshed_at = VALUES(last_refreshed_at)
          `;
          
          const values = [
            country.name,
            country.capital || null,
            country.region || null,
            country.population,
            currencyCode,
            exchangeRate,
            estimatedGdp,
            country.flag || null,
            refreshTimestamp
          ];
          
          await new Promise((resolve, reject) => {
            db.query(query, values, (err, result) => {
              if (err) {
                console.error(`Database error for ${country.name}:`, err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
          
          processedCount++;
          
        } catch (countryError) {
          console.error(`Error processing country ${country.name}:`, countryError);
          errors.push(`Failed to process ${country.name}: ${countryError.message}`);
          // Continue with next country
        }
      }
      
      // Generate summary image with multiple fallbacks
      let imageUrl = null;
      try {
        console.log('Starting image generation process...');
        
        // Get data for image - using the helper function directly
        const topCountries = await getTopCountriesByGDP();
        console.log(`Retrieved ${topCountries.length} top countries for image`);
        
        // Try the main method first
        try {
          console.log('Trying formatted image generation...');
          imageUrl = await simpleImageGenerator.generateFormattedSummaryImage(
            topCountries, 
            processedCount, 
            refreshTimestamp
          );
          console.log('Main image generation successful');
        } catch (firstError) {
          console.log('First image generation failed:', firstError.message);
          
          // First fallback
          try {
            console.log('Trying simple image generation...');
            imageUrl = await simpleImageGenerator.generateSimpleImage(
              topCountries, 
              processedCount, 
              refreshTimestamp
            );
            console.log('Simple image generation successful');
          } catch (secondError) {
            console.log('Simple image generation failed:', secondError.message);
            
            // Final fallback - basic image
            try {
              console.log('Trying basic image generation...');
              imageUrl = await simpleImageGenerator.generateBasicImage(
                processedCount, 
                refreshTimestamp
              );
              console.log('Basic image generation successful');
            } catch (thirdError) {
              console.log('Basic image generation failed:', thirdError.message);
              
              // Last resort - placeholder
              try {
                console.log('Trying placeholder image...');
                imageUrl = await simpleImageGenerator.generatePlaceholderImage(processedCount);
                console.log('Placeholder image generated');
              } catch (finalError) {
                console.log('All image generation methods failed completely');
                throw new Error('All image generation methods failed: ' + finalError.message);
              }
            }
          }
        }
        
        console.log('Final image URL:', imageUrl);
      } catch (imageError) {
        console.error('All image generation methods failed:', imageError);
        errors.push('Failed to generate summary image: ' + imageError.message);
      }
      
      console.log(`Refresh completed. Processed ${processedCount} countries. Errors: ${errors.length}`);
      
      const response = {
        message: 'Countries data refreshed successfully',
        total_processed: processedCount,
        last_refreshed_at: refreshTimestamp.toISOString()
      };
      
      if (errors.length > 0) {
        response.warnings = errors.slice(0, 5); // Limit to first 5 errors
      }
      
      if (imageUrl) {
        response.summary_image_url = imageUrl;
      }
      
      res.json(response);
      
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(503).json({
        error: 'External data source unavailable',
        details: 'Could not fetch data from countries API'
      });
    }
  }

  // Get all countries with filtering and sorting
  getCountries = async (req, res) => {
    try {
      let query = 'SELECT * FROM countries WHERE 1=1';
      const params = [];
      
      // Filter by region
      if (req.query.region) {
        query += ' AND LOWER(region) = LOWER(?)';
        params.push(req.query.region);
      }
      
      // Filter by currency
      if (req.query.currency) {
        query += ' AND currency_code = ?';
        params.push(req.query.currency.toUpperCase());
      }
      
      // Sorting
      if (req.query.sort) {
        const sortMapping = {
          'gdp_desc': 'estimated_gdp DESC',
          'gdp_asc': 'estimated_gdp ASC',
          'name_asc': 'name ASC',
          'name_desc': 'name DESC',
          'population_desc': 'population DESC',
          'population_asc': 'population ASC'
        };
        
        const sortClause = sortMapping[req.query.sort];
        if (sortClause) {
          query += ` ORDER BY ${sortClause}`;
        }
      } else {
        query += ' ORDER BY name ASC';
      }
      
      // Limit for safety
      query += ' LIMIT 500';
      
      db.query(query, params, (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Format the response
        const formattedResults = results.map(country => ({
          id: country.id,
          name: country.name,
          capital: country.capital,
          region: country.region,
          population: country.population,
          currency_code: country.currency_code,
          exchange_rate: country.exchange_rate,
          estimated_gdp: country.estimated_gdp,
          flag_url: country.flag_url,
          last_refreshed_at: country.last_refreshed_at
        }));
        
        res.json(formattedResults);
      });
      
    } catch (error) {
      console.error('Get countries error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single country by name
  getCountryByName = async (req, res) => {
    try {
      const { name } = req.params;
      
      const query = 'SELECT * FROM countries WHERE LOWER(name) = LOWER(?)';
      
      db.query(query, [name], (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (results.length === 0) {
          return res.status(404).json({ error: 'Country not found' });
        }
        
        const country = results[0];
        const response = {
          id: country.id,
          name: country.name,
          capital: country.capital,
          region: country.region,
          population: country.population,
          currency_code: country.currency_code,
          exchange_rate: country.exchange_rate,
          estimated_gdp: country.estimated_gdp,
          flag_url: country.flag_url,
          last_refreshed_at: country.last_refreshed_at
        };
        
        res.json(response);
      });
      
    } catch (error) {
      console.error('Get country error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete country by name
  deleteCountry = async (req, res) => {
    try {
      const { name } = req.params;
      
      const query = 'DELETE FROM countries WHERE LOWER(name) = LOWER(?)';
      
      db.query(query, [name], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Country not found' });
        }
        
        res.json({ message: 'Country deleted successfully' });
      });
      
    } catch (error) {
      console.error('Delete country error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get summary image - JSON fallback version
  getSummaryImage = async (req, res) => {
    try {
      // First try to get existing image from Cloudinary
      try {
        const result = await cloudinary.search
          .expression('folder:country-api')
          .sort_by('created_at', 'desc')
          .max_results(1)
          .execute();

        if (result.resources.length > 0) {
          const imageUrl = result.resources[0].secure_url;
          console.log('Found existing image, redirecting to:', imageUrl);
          return res.redirect(imageUrl);
        }
      } catch (searchError) {
        console.log('No existing image found or search failed:', searchError.message);
      }

      // If no image found, return JSON summary
      console.log('No image found, returning JSON summary');
      const topCountries = await getTopCountriesByGDP();
      const totalCountries = await getTotalCountries();
      
      const lastRefresh = await new Promise((resolve, reject) => {
        db.query('SELECT MAX(last_refreshed_at) as last_refresh FROM countries', (err, results) => {
          if (err) reject(err);
          else resolve(results[0].last_refresh);
        });
      });

      // Return JSON summary instead of image
      res.json({
        summary_data: {
          total_countries: totalCountries,
          last_refreshed_at: lastRefresh,
          top_5_countries_by_gdp: topCountries.map((country, index) => ({
            rank: index + 1,
            name: country.name,
            estimated_gdp: country.estimated_gdp,
            formatted_gdp: country.estimated_gdp ? `$${(country.estimated_gdp / 1e9).toFixed(2)}B` : 'N/A'
          }))
        },
        note: "This endpoint normally returns an image. Currently serving JSON data. Refresh countries data to generate a new image."
      });
      
    } catch (error) {
      console.error('Error getting summary image:', error);
      res.status(404).json({ 
        error: 'Summary data not found. Please refresh countries data first by calling POST /countries/refresh' 
      });
    }
  }

  // Test endpoint for Cloudinary
  testCloudinary = async (req, res) => {
    try {
      // Test Cloudinary upload with a simple image
      const result = await cloudinary.uploader.upload(
        'https://res.cloudinary.com/demo/image/upload/w_100,h_100,c_fill/sample.jpg',
        {
          public_id: `test_image_${Date.now()}`,
          folder: 'country-api-tests'
        }
      );
      
      res.json({
        success: true,
        message: 'Cloudinary test passed',
        url: result.secure_url
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'Cloudinary test failed',
        error: error.message
      });
    }
  }
}

module.exports = new CountryController();