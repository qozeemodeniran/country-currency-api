// src/controllers/countryController.js
const db = require('../config/database');
const axios = require('axios');
const { createCanvas } = require('canvas');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

class CountryController {
  // Refresh countries data
  async refreshCountries(req, res) {
    try {
      console.log('Starting countries refresh...');
      
      // Fetch countries data
      const countriesResponse = await axios.get(process.env.COUNTRIES_API_URL);
      const countries = countriesResponse.data;
      
      // Fetch exchange rates
      let exchangeRates;
      try {
        const exchangeResponse = await axios.get(process.env.EXCHANGE_API_URL);
        exchangeRates = exchangeResponse.data.rates;
      } catch (exchangeError) {
        console.error('Exchange API error:', exchangeError);
        return res.status(503).json({
          error: 'External data source unavailable',
          details: 'Could not fetch data from exchange rates API'
        });
      }
      
      let refreshTimestamp = new Date();
      let processedCount = 0;
      
      // Process each country
      for (const country of countries) {
        try {
          // Extract currency code (take first one if multiple)
          let currencyCode = null;
          if (country.currencies && country.currencies.length > 0) {
            currencyCode = country.currencies[0].code;
          }
          
          // Get exchange rate
          let exchangeRate = null;
          let estimatedGdp = null;
          
          if (currencyCode && exchangeRates[currencyCode]) {
            exchangeRate = exchangeRates[currencyCode];
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
              if (err) reject(err);
              else resolve(result);
            });
          });
          
          processedCount++;
          
        } catch (countryError) {
          console.error(`Error processing country ${country.name}:`, countryError);
          // Continue with next country
        }
      }
      
      // Generate summary image
      await this.generateSummaryImage();
      
      console.log(`Refresh completed. Processed ${processedCount} countries.`);
      
      res.json({
        message: 'Countries data refreshed successfully',
        total_processed: processedCount,
        last_refreshed_at: refreshTimestamp.toISOString()
      });
      
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(503).json({
        error: 'External data source unavailable',
        details: 'Could not fetch data from countries API'
      });
    }
  }

  // Get all countries with filtering and sorting
  async getCountries(req, res) {
    try {
      let query = 'SELECT * FROM countries WHERE 1=1';
      const params = [];
      
      // Filter by region
      if (req.query.region) {
        query += ' AND region = ?';
        params.push(req.query.region);
      }
      
      // Filter by currency
      if (req.query.currency) {
        query += ' AND currency_code = ?';
        params.push(req.query.currency);
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
  async getCountryByName(req, res) {
    try {
      const { name } = req.params;
      
      const query = 'SELECT * FROM countries WHERE name = ?';
      
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
  async deleteCountry(req, res) {
    try {
      const { name } = req.params;
      
      const query = 'DELETE FROM countries WHERE name = ?';
      
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

  // Generate summary image
  async generateSummaryImage() {
    return new Promise(async (resolve, reject) => {
      try {
        // Get countries data for the image
        const countries = await new Promise((resolve, reject) => {
          db.query(`
            SELECT name, estimated_gdp 
            FROM countries 
            WHERE estimated_gdp IS NOT NULL 
            ORDER BY estimated_gdp DESC 
            LIMIT 5
          `, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        const totalCountries = await new Promise((resolve, reject) => {
          db.query('SELECT COUNT(*) as count FROM countries', (err, results) => {
            if (err) reject(err);
            else resolve(results[0].count);
          });
        });

        const lastRefresh = await new Promise((resolve, reject) => {
          db.query('SELECT MAX(last_refreshed_at) as last_refresh FROM countries', (err, results) => {
            if (err) reject(err);
            else resolve(results[0].last_refresh);
          });
        });

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
        ctx.fillText(`Total Countries: ${totalCountries}`, 400, 110);

        // Last refresh
        ctx.fillText(`Last Refresh: ${new Date(lastRefresh).toLocaleString()}`, 400, 140);

        // Top 5 GDP countries
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Top 5 Countries by GDP', 400, 190);

        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        
        countries.forEach((country, index) => {
          const yPos = 230 + (index * 60);
          ctx.fillText(`${index + 1}. ${country.name}`, 100, yPos);
          ctx.textAlign = 'right';
          ctx.fillText(`$${country.estimated_gdp?.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 700, yPos);
          ctx.textAlign = 'left';
        });

        // Convert to buffer
        const buffer = canvas.toBuffer('image/png');

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { 
              resource_type: 'image',
              public_id: 'countries_summary',
              folder: 'country-api'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        console.log('Summary image uploaded to Cloudinary:', uploadResult.secure_url);
        resolve(uploadResult.secure_url);

      } catch (error) {
        console.error('Error generating summary image:', error);
        reject(error);
      }
    });
  }

  // Get summary image
  async getSummaryImage(req, res) {
    try {
      // Get the latest image URL from Cloudinary
      // In a real implementation, you might store this URL in the database
      // For now, we'll try to get the most recent upload
      
      const result = await cloudinary.search
        .expression('public_id:country-api/countries_summary')
        .sort_by('created_at', 'desc')
        .max_results(1)
        .execute();

      if (result.resources.length === 0) {
        return res.status(404).json({ error: 'Summary image not found' });
      }

      const imageUrl = result.resources[0].secure_url;
      
      // Redirect to Cloudinary URL
      res.redirect(imageUrl);
      
    } catch (error) {
      console.error('Error getting summary image:', error);
      res.status(404).json({ error: 'Summary image not found' });
    }
  }
}

module.exports = new CountryController();