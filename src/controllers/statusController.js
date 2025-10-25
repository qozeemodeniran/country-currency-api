// src/controllers/statusController.js
const db = require('../config/database');

class StatusController {
  async getStatus(req, res) {
    try {
      // Get total countries and last refresh timestamp
      const query = `
        SELECT 
          COUNT(*) as total_countries,
          MAX(last_refreshed_at) as last_refreshed_at
        FROM countries
      `;
      
      db.query(query, (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        const status = {
          total_countries: results[0].total_countries,
          last_refreshed_at: results[0].last_refreshed_at
        };
        
        res.json(status);
      });
      
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new StatusController();