const countryModel = require('../models/countryModel');
const externalApi = require('../models/externalApi');
const imageGenerator = require('../utils/imageGenerator');
const fs = require('fs');

class CountryController {
  // Refresh all countries data - FIXED with better error handling
  async refreshCountries(req, res, next) {
    let countriesData, exchangeRates;

    try {
      // Fetch data from external APIs
      try {
        countriesData = await externalApi.fetchCountries();
        exchangeRates = await externalApi.fetchExchangeRates();
      } catch (error) {
        console.error('External API error:', error.message);
        return res.status(503).json({
          error: "External data source unavailable",
          details: error.message
        });
      }

      // Validate data
      if (!countriesData || !Array.isArray(countriesData)) {
        return res.status(503).json({
          error: "External data source unavailable",
          details: "Invalid countries data received"
        });
      }

      // Process and store countries
      const processedCountries = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const country of countriesData) {
        try {
          // Validate required fields
          if (!country.name || country.population === undefined) {
            console.warn(`Skipping country with missing required fields:`, country.name);
            errorCount++;
            continue;
          }

          const currencyCode = externalApi.getCurrencyCode(country.currencies);
          let exchangeRate = null;
          let estimatedGDP = 0;

          // Only fetch exchange rate if currency code exists and is in exchange rates
          if (currencyCode && exchangeRates && exchangeRates[currencyCode]) {
            exchangeRate = exchangeRates[currencyCode];
            estimatedGDP = externalApi.calculateEstimatedGDP(country.population, exchangeRate);
          } else if (currencyCode) {
            console.warn(`Exchange rate not found for currency: ${currencyCode}`);
          }

          const countryRecord = {
            name: country.name,
            capital: country.capital || null,
            region: country.region || null,
            population: country.population,
            currency_code: currencyCode,
            exchange_rate: exchangeRate,
            estimated_gdp: estimatedGDP,
            flag_url: country.flag
          };

          await countryModel.upsert(countryRecord);
          processedCountries.push(countryRecord);
          successCount++;
        } catch (error) {
          console.error(`Error processing ${country.name}:`, error.message);
          errorCount++;
        }
      }

      // Update refresh timestamp
      await countryModel.updateRefreshTimestamp();

      // Generate summary image
      try {
        const status = await countryModel.getStatus();
        const topCountries = await countryModel.getTopCountriesByGDP(5);
        
        await imageGenerator.generateSummaryImage(
          status.total_countries,
          topCountries,
          status.last_refreshed_at || new Date().toISOString()
        );
      } catch (imageError) {
        console.error('Error generating summary image:', imageError);
        // Don't fail the whole request if image generation fails
      }

      res.json({
        message: `Successfully refreshed ${successCount} countries${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        total_processed: successCount,
        errors: errorCount,
        last_refreshed_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Refresh endpoint error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  }

  // Get all countries with filtering and sorting
  async getCountries(req, res, next) {
    try {
      const { region, currency, sort } = req.query;
      const filters = {};
      
      if (region) filters.region = region;
      if (currency) filters.currency = currency;

      const countries = await countryModel.getAll(filters, sort);
      
      res.json(countries);
    } catch (error) {
      console.error('Get countries error:', error);
      next(error);
    }
  }

  // Get country by name
  async getCountryByName(req, res, next) {
    try {
      const { name } = req.params;
      const country = await countryModel.getByName(name);

      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }

      res.json(country);
    } catch (error) {
      console.error('Get country by name error:', error);
      next(error);
    }
  }

  // Delete country by name
  async deleteCountry(req, res, next) {
    try {
      const { name } = req.params;
      const deleted = await countryModel.deleteByName(name);

      if (!deleted) {
        return res.status(404).json({ error: "Country not found" });
      }

      res.json({ message: "Country deleted successfully" });
    } catch (error) {
      console.error('Delete country error:', error);
      next(error);
    }
  }

  // Serve summary image - FIXED with proper error handling
  async getSummaryImage(req, res, next) {
    try {
      if (!imageGenerator.imageExists()) {
        return res.status(404).json({ error: "Summary image not found" });
      }

      const imagePath = imageGenerator.getImagePath();
      
      // Set proper headers for image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      
      res.sendFile(imagePath, (err) => {
        if (err) {
          console.error('Error sending image:', err);
          res.status(404).json({ error: "Summary image not found" });
        }
      });
    } catch (error) {
      console.error('Get summary image error:', error);
      res.status(404).json({ error: "Summary image not found" });
    }
  }
}

module.exports = new CountryController();