const request = require('supertest');
const app = require('../app');
const database = require('../config/database');

// Mock external APIs
jest.mock('axios');
const axios = require('axios');

describe('Countries API', () => {
  let connection;

  beforeAll(async () => {
    connection = await database.createConnection();
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await connection.execute('DELETE FROM countries');
    await connection.execute('UPDATE refresh_metadata SET total_countries = 0, last_refreshed_at = NOW()');
  });

  describe('POST /countries/refresh', () => {
    it('should refresh countries data successfully', async () => {
      // Mock external APIs
      axios.get.mockImplementation((url) => {
        if (url.includes('restcountries.com')) {
          return Promise.resolve({
            data: [
              {
                name: 'Test Country',
                capital: 'Test Capital',
                region: 'Test Region',
                population: 1000000,
                flag: 'https://flagcdn.com/tc.svg',
                currencies: [{ code: 'USD', name: 'US Dollar' }]
              }
            ]
          });
        }
        if (url.includes('open.er-api.com')) {
          return Promise.resolve({
            data: {
              rates: {
                USD: 1.0,
                EUR: 0.85
              }
            }
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const response = await request(app)
        .post('/countries/refresh')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Countries data refreshed successfully',
        processed: expect.any(Number),
        success: expect.any(Number),
        total: expect.any(Number)
      });
    });

    it('should return 503 when external API fails', async () => {
      axios.get.mockRejectedValue(new Error('API unavailable'));

      const response = await request(app)
        .post('/countries/refresh')
        .expect(503);

      expect(response.body).toEqual({
        error: 'External data source unavailable',
        details: expect.any(String)
      });
    });
  });

  describe('GET /countries', () => {
    beforeEach(async () => {
      // Insert test data
      await connection.execute(`
        INSERT INTO countries 
        (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
        VALUES 
        ('Nigeria', 'Abuja', 'Africa', 206139589, 'NGN', 1600.23, 25767448125.2, 'https://flagcdn.com/ng.svg'),
        ('Ghana', 'Accra', 'Africa', 31072940, 'GHS', 15.34, 3029834520.6, 'https://flagcdn.com/gh.svg'),
        ('France', 'Paris', 'Europe', 67391582, 'EUR', 0.85, 79284214117.6, 'https://flagcdn.com/fr.svg')
      `);
    });

    it('should return all countries', async () => {
      const response = await request(app)
        .get('/countries')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('population');
      expect(response.body[0]).toHaveProperty('currency_code');
    });

    it('should filter by region', async () => {
      const response = await request(app)
        .get('/countries?region=Africa')
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.every(country => country.region === 'Africa')).toBe(true);
    });

    it('should filter by currency', async () => {
      const response = await request(app)
        .get('/countries?currency=EUR')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].currency_code).toBe('EUR');
    });

    it('should sort by GDP descending', async () => {
      const response = await request(app)
        .get('/countries?sort=gdp_desc')
        .expect(200);

      const gdps = response.body.map(country => country.estimated_gdp);
      const sortedGdps = [...gdps].sort((a, b) => b - a);
      expect(gdps).toEqual(sortedGdps);
    });

    it('should return 400 for invalid sort parameter', async () => {
      const response = await request(app)
        .get('/countries?sort=invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation failed',
        details: {
          sort: 'must be either gdp_desc or gdp_asc'
        }
      });
    });
  });

  describe('GET /countries/:name', () => {
    beforeEach(async () => {
      await connection.execute(`
        INSERT INTO countries 
        (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
        VALUES 
        ('Nigeria', 'Abuja', 'Africa', 206139589, 'NGN', 1600.23, 25767448125.2, 'https://flagcdn.com/ng.svg')
      `);
    });

    it('should return country by name', async () => {
      const response = await request(app)
        .get('/countries/Nigeria')
        .expect(200);

      expect(response.body.name).toBe('Nigeria');
      expect(response.body.capital).toBe('Abuja');
      expect(response.body.population).toBe(206139589);
    });

    it('should return 404 for non-existent country', async () => {
      const response = await request(app)
        .get('/countries/NonExistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Country not found'
      });
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/countries/nigeria')
        .expect(200);

      expect(response.body.name).toBe('Nigeria');
    });
  });

  describe('DELETE /countries/:name', () => {
    beforeEach(async () => {
      await connection.execute(`
        INSERT INTO countries 
        (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
        VALUES 
        ('Test Country', 'Test Capital', 'Test Region', 1000000, 'TEST', 1.0, 1000000, 'https://flagcdn.com/tc.svg')
      `);
    });

    it('should delete country successfully', async () => {
      const response = await request(app)
        .delete('/countries/Test Country')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Country deleted successfully'
      });

      // Verify country is deleted
      const [rows] = await connection.execute('SELECT * FROM countries WHERE name = ?', ['Test Country']);
      expect(rows.length).toBe(0);
    });

    it('should return 404 for non-existent country', async () => {
      const response = await request(app)
        .delete('/countries/NonExistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Country not found'
      });
    });
  });
});