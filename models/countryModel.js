const { pool } = require('../config/database');

class CountryModel {
  // Get all countries with optional filtering and sorting
  async getAll(filters = {}, sort = '') {
    let query = `SELECT * FROM countries WHERE 1=1`;
    const params = [];

    // Apply filters
    if (filters.region) {
      query += ` AND region = ?`;
      params.push(filters.region);
    }

    if (filters.currency) {
      query += ` AND currency_code = ?`;
      params.push(filters.currency);
    }

    // Apply sorting
    if (sort) {
      const sortMapping = {
        'gdp_desc': 'estimated_gdp DESC',
        'gdp_asc': 'estimated_gdp ASC',
        'population_desc': 'population DESC',
        'population_asc': 'population ASC',
        'name_asc': 'name ASC',
        'name_desc': 'name DESC'
      };
      query += ` ORDER BY ${sortMapping[sort] || 'name ASC'}`;
    }

    try {
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  }

  // Get country by name
  async getByName(name) {
    const query = `SELECT * FROM countries WHERE LOWER(name) = LOWER(?)`;
    try {
      const [rows] = await pool.execute(query, [name]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error fetching country:', error);
      throw error;
    }
  }

  // Create or update country
  async upsert(countryData) {
    const query = `
      INSERT INTO countries 
      (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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

    const params = [
      countryData.name,
      countryData.capital,
      countryData.region,
      countryData.population,
      countryData.currency_code,
      countryData.exchange_rate,
      countryData.estimated_gdp,
      countryData.flag_url
    ];

    try {
      const [result] = await pool.execute(query, params);
      return result;
    } catch (error) {
      console.error('Error upserting country:', error);
      throw error;
    }
  }

  // Delete country by name
  async deleteByName(name) {
    const query = `DELETE FROM countries WHERE LOWER(name) = LOWER(?)`;
    try {
      const [result] = await pool.execute(query, [name]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting country:', error);
      throw error;
    }
  }

  // Get total countries count and last refresh timestamp
  async getStatus() {
    try {
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM countries');
      const [timestampResult] = await pool.execute('SELECT last_refreshed_at FROM refresh_timestamp ORDER BY id DESC LIMIT 1');
      
      return {
        total_countries: countResult[0].total,
        last_refreshed_at: timestampResult[0] ? timestampResult[0].last_refreshed_at : null
      };
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }

  // Update refresh timestamp
  async updateRefreshTimestamp() {
    const query = `INSERT INTO refresh_timestamp (last_refreshed_at) VALUES (CURRENT_TIMESTAMP)`;
    try {
      await pool.execute(query);
    } catch (error) {
      console.error('Error updating refresh timestamp:', error);
      throw error;
    }
  }
}

module.exports = new CountryModel();