const axios = require('axios');
const database = require('../config/database');
const fs = require('fs');
const path = require('path');

class CountryService {
  async fetchCountriesFromAPI() {
    try {
      const response = await axios.get(
        'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies',
        { timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Could not fetch data from Countries API: ${error.message}`);
    }
  }

  async fetchExchangeRates() {
    try {
      const response = await axios.get(
        'https://open.er-api.com/v6/latest/USD',
        { timeout: 15000 }
      );
      return response.data.rates;
    } catch (error) {
      throw new Error(`Could not fetch data from Exchange Rates API: ${error.message}`);
    }
  }

  async refreshCountries() {
    const connection = await database.createConnection();
    
    try {
      await connection.beginTransaction();

      console.log('Fetching countries data from external API...');
      const countries = await this.fetchCountriesFromAPI();
      console.log('Fetching exchange rates from external API...');
      const exchangeRates = await this.fetchExchangeRates();

      let processedCount = 0;
      let successCount = 0;

      for (const country of countries) {
        let currencyCode = null;
        let exchangeRate = null;
        let estimatedGdp = null;

        // Extract currency code (first currency only)
        if (country.currencies && country.currencies.length > 0 && country.currencies[0].code) {
          currencyCode = country.currencies[0].code;
          
          // Get exchange rate if currency code exists in exchange rates
          if (currencyCode && exchangeRates[currencyCode]) {
            exchangeRate = exchangeRates[currencyCode];
            
            // Calculate estimated GDP with fresh random multiplier for each country
            const randomMultiplier = Math.random() * 1000 + 1000; // 1000-2000
            estimatedGdp = (country.population * randomMultiplier) / exchangeRate;
          }
        }

        // If no currencies or currency not found in exchange rates, set to null
        if (!currencyCode) {
          currencyCode = null;
          exchangeRate = null;
          estimatedGdp = 0;
        }

        try {
          // Insert or update country (case-insensitive name matching)
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
            country.capital || null,
            country.region || null,
            country.population,
            currencyCode,
            exchangeRate,
            estimatedGdp,
            country.flag || null
          ]);

          successCount++;
        } catch (dbError) {
          console.error(`Failed to process country ${country.name}:`, dbError.message);
          // Continue with next country even if one fails
        }

        processedCount++;
      }

      // Update metadata
      await connection.execute(
        'UPDATE refresh_metadata SET last_refreshed_at = NOW(), total_countries = ? WHERE id = 1',
        [successCount]
      );

      await connection.commit();
      console.log(`Successfully processed ${successCount} out of ${processedCount} countries`);

      return { 
        processed: processedCount, 
        success: successCount,
        total: countries.length 
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  async getAllCountries(filters = {}) {
    const connection = await database.createConnection();
    
    try {
      let query = `
        SELECT id, name, capital, region, population, currency_code, 
               exchange_rate, estimated_gdp, flag_url, last_refreshed_at
        FROM countries 
        WHERE 1=1
      `;
      const params = [];

      if (filters.region) {
        query += ' AND LOWER(region) = LOWER(?)';
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
      
      // Format response to match expected structure
      return rows.map(row => ({
        ...row,
        last_refreshed_at: row.last_refreshed_at ? new Date(row.last_refreshed_at).toISOString() : null
      }));
    } finally {
      await connection.end();
    }
  }

  async getCountryByName(name) {
    const connection = await database.createConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM countries WHERE LOWER(name) = LOWER(?)',
        [name]
      );
      
      if (rows.length === 0) {
        return null;
      }

      const country = rows[0];
      return {
        ...country,
        last_refreshed_at: country.last_refreshed_at ? new Date(country.last_refreshed_at).toISOString() : null
      };
    } finally {
      await connection.end();
    }
  }

  async deleteCountryByName(name) {
    const connection = await database.createConnection();
    
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
    const connection = await database.createConnection();
    
    try {
      const [[metadata]] = await connection.execute(
        'SELECT last_refreshed_at, total_countries FROM refresh_metadata WHERE id = 1'
      );
      
      return {
        total_countries: metadata.total_countries,
        last_refreshed_at: metadata.last_refreshed_at ? new Date(metadata.last_refreshed_at).toISOString() : null
      };
    } finally {
      await connection.end();
    }
  }

  async getTopCountriesByGDP(limit = 5) {
    const connection = await database.createConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT name, estimated_gdp FROM countries WHERE estimated_gdp IS NOT NULL ORDER BY estimated_gdp DESC LIMIT ?',
        [limit]
      );
      return rows;
    } finally {
      await connection.end();
    }
  }
}

module.exports = new CountryService();