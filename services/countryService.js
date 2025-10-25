const axios = require('axios');
const { createConnection } = require('../config/database');

class CountryService {
  async fetchCountriesFromAPI() {
    try {
      const response = await axios.get(
        'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies',
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }
  }

  async fetchExchangeRates() {
    try {
      const response = await axios.get(
        'https://open.er-api.com/v6/latest/USD',
        { timeout: 10000 }
      );
      return response.data.rates;
    } catch (error) {
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }
  }

  async refreshCountries() {
    const connection = await createConnection();
    
    try {
      await connection.beginTransaction();

      console.log('Fetching countries data...');
      const countries = await this.fetchCountriesFromAPI();
      console.log('Fetching exchange rates...');
      const exchangeRates = await this.fetchExchangeRates();

      let processedCount = 0;

      for (const country of countries) {
        let currencyCode = null;
        let exchangeRate = null;
        let estimatedGdp = null;

        // Extract currency code
        if (country.currencies && country.currencies.length > 0) {
          currencyCode = country.currencies[0].code;
          
          // Get exchange rate if currency code exists
          if (currencyCode && exchangeRates[currencyCode]) {
            exchangeRate = exchangeRates[currencyCode];
            
            // Calculate estimated GDP
            const randomMultiplier = Math.random() * 1000 + 1000; // 1000-2000
            estimatedGdp = (country.population * randomMultiplier) / exchangeRate;
          }
        }

        // Insert or update country
        const query = `
          INSERT INTO countries 
          (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
          capital = VALUES(capital),
          region = VALUES(region),
          population = VALUES(population),
          currency_code = VALUES(currency_code),
          exchange_rate = VALUES(exchange_rate),
          estimated_gdp = VALUES(estimated_gdp),
          flag_url = VALUES(flag_url),
          last_refreshed_at = NOW()
        `;

        await connection.execute(query, [
          country.name,
          country.capital,
          country.region,
          country.population,
          currencyCode,
          exchangeRate,
          estimatedGdp,
          country.flag
        ]);

        processedCount++;
      }

      // Update metadata
      await connection.execute(
        'UPDATE refresh_metadata SET last_refreshed_at = NOW(), total_countries = ? WHERE id = 1',
        [processedCount]
      );

      await connection.commit();
      console.log(`Successfully processed ${processedCount} countries`);

      return { processed: processedCount, total: countries.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  async getAllCountries(filters = {}) {
    const connection = await createConnection();
    
    try {
      let query = `
        SELECT id, name, capital, region, population, currency_code, 
               exchange_rate, estimated_gdp, flag_url, last_refreshed_at
        FROM countries 
        WHERE 1=1
      `;
      const params = [];

      if (filters.region) {
        query += ' AND region = ?';
        params.push(filters.region);
      }

      if (filters.currency) {
        query += ' AND currency_code = ?';
        params.push(filters.currency);
      }

      if (filters.sort) {
        if (filters.sort === 'gdp_desc') {
          query += ' ORDER BY estimated_gdp DESC';
        } else if (filters.sort === 'gdp_asc') {
          query += ' ORDER BY estimated_gdp ASC';
        }
      } else {
        query += ' ORDER BY name ASC';
      }

      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      await connection.end();
    }
  }

  async getCountryByName(name) {
    const connection = await createConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM countries WHERE LOWER(name) = LOWER(?)',
        [name]
      );
      return rows[0] || null;
    } finally {
      await connection.end();
    }
  }

  async deleteCountryByName(name) {
    const connection = await createConnection();
    
    try {
      const [result] = await connection.execute(
        'DELETE FROM countries WHERE LOWER(name) = LOWER(?)',
        [name]
      );
      
      if (result.affectedRows === 0) {
        return false;
      }

      // Update total countries count
      const [countRows] = await connection.execute('SELECT COUNT(*) as count FROM countries');
      await connection.execute(
        'UPDATE refresh_metadata SET total_countries = ? WHERE id = 1',
        [countRows[0].count]
      );

      return true;
    } finally {
      await connection.end();
    }
  }

  async getStatus() {
    const connection = await createConnection();
    
    try {
      const [[metadata]] = await connection.execute(
        'SELECT last_refreshed_at, total_countries FROM refresh_metadata WHERE id = 1'
      );
      
      return metadata;
    } finally {
      await connection.end();
    }
  }
}

module.exports = new CountryService();