const countryModel = require('../models/countryModel');
const externalApi = require('../models/externalApi');
const imageGenerator = require('../utils/imageGenerator');
const fs = require('fs');

class CountryController {
  // Refresh all countries data
  async refreshCountries(req, res, next) {
    try {
      let countriesData, exchangeRates;

      // Fetch data from external APIs
      try {
        countriesData = await externalApi.fetchCountries();
        exchangeRates = await externalApi.fetchExchangeRates();
      } catch (error) {
        return res.status(503).json({
          error: "External data source unavailable",
          details: error.message
        });
      }

      // Process and store countries
      const processedCountries = [];
      
      for (const country of countriesData) {
        const currencyCode = externalApi.getCurrencyCode(country.currencies);
        let exchangeRate = null;
        let estimatedGDP = 0;

        if (currencyCode && exchangeRates && exchangeRates[currencyCode]) {
          exchangeRate = exchangeRates[currencyCode];
          estimatedGDP = externalApi.calculateEstimatedGDP(country.population, exchangeRate);
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

        try {
          await countryModel.upsert(countryRecord);
          processedCountries.push(countryRecord);
        } catch (error) {
          console.error(`Error processing ${country.name}:`, error);
        }
      }

      // Update refresh timestamp
      await countryModel.updateRefreshTimestamp();

      // Generate summary image
      const status = await countryModel.getStatus();
      const topCountries = await countryModel.getAll({}, 'gdp_desc');
      
      await imageGenerator.generateSummaryImage(
        status.total_countries,
        topCountries.slice(0, 5),
        status.last_refreshed_at
      );

      res.json({
        message: `Successfully refreshed ${processedCountries.length} countries`,
        total_processed: processedCountries.length,
        last_refreshed_at: status.last_refreshed_at
      });

    } catch (error) {
      next(error);
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
      next(error);
    }
  }

  // Serve summary image
  async getSummaryImage(req, res, next) {
    try {
      if (!imageGenerator.imageExists()) {
        return res.status(404).json({ error: "Summary image not found" });
      }

      const imagePath = imageGenerator.getImagePath();
      res.sendFile(imagePath);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CountryController();