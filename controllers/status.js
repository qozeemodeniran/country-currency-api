const countryService = require('../services/countryService');

const statusController = {
  async getStatus(req, res) {
    try {
      const status = await countryService.getStatus();
      res.json({
        total_countries: status.total_countries,
        last_refreshed_at: status.last_refreshed_at
      });
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};

module.exports = statusController;