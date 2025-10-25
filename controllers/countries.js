const countryService = require('../services/countryService');
const imageService = require('../services/imageService');
const fs = require('fs');

const countriesController = {
  async refreshCountries(req, res) {
    try {
      console.log('Starting countries refresh...');
      const result = await countryService.refreshCountries();
      
      // Generate summary image after refresh
      await imageService.generateSummaryImage();
      
      res.json({
        message: 'Countries data refreshed successfully',
        processed: result.processed,
        total: result.total
      });
    } catch (error) {
      console.error('Refresh error:', error);
      
      if (error.message.includes('Failed to fetch')) {
        return res.status(503).json({
          error: 'External data source unavailable',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  },

  async getAllCountries(req, res) {
    try {
      const filters = {
        region: req.query.region,
        currency: req.query.currency,
        sort: req.query.sort
      };

      const countries = await countryService.getAllCountries(filters);
      res.json(countries);
    } catch (error) {
      console.error('Get countries error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  async getCountryByName(req, res) {
    try {
      const country = await countryService.getCountryByName(req.params.name);
      
      if (!country) {
        return res.status(404).json({
          error: 'Country not found'
        });
      }

      res.json(country);
    } catch (error) {
      console.error('Get country error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  async deleteCountry(req, res) {
    try {
      const deleted = await countryService.deleteCountryByName(req.params.name);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Country not found'
        });
      }

      res.json({
        message: 'Country deleted successfully'
      });
    } catch (error) {
      console.error('Delete country error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  async getCountriesImage(req, res) {
    try {
      const imagePath = imageService.getImagePath();
      
      if (!imagePath) {
        return res.status(404).json({
          error: 'Summary image not found'
        });
      }

      res.setHeader('Content-Type', 'image/png');
      fs.createReadStream(imagePath).pipe(res);
    } catch (error) {
      console.error('Get image error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};

module.exports = countriesController;