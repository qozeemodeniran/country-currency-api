const countryModel = require('../models/countryModel');

class StatusController {
  async getStatus(req, res, next) {
    try {
      const status = await countryModel.getStatus();
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatusController();