const request = require('supertest');
const app = require('../app');
const database = require('../config/database');

describe('Status API', () => {
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
    await connection.execute('DELETE FROM countries');
    await connection.execute('UPDATE refresh_metadata SET total_countries = 0, last_refreshed_at = NOW()');
  });

  describe('GET /status', () => {
    it('should return status with zero countries initially', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200);

      expect(response.body).toEqual({
        total_countries: 0,
        last_refreshed_at: expect.any(String)
      });
    });

    it('should return correct count after adding countries', async () => {
      // Add test countries
      await connection.execute(`
        INSERT INTO countries 
        (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
        VALUES 
        ('Country1', 'Capital1', 'Region1', 1000000, 'CUR1', 1.0, 1000000, 'https://flagcdn.com/c1.svg'),
        ('Country2', 'Capital2', 'Region2', 2000000, 'CUR2', 2.0, 2000000, 'https://flagcdn.com/c2.svg')
      `);

      await connection.execute('UPDATE refresh_metadata SET total_countries = 2');

      const response = await request(app)
        .get('/status')
        .expect(200);

      expect(response.body.total_countries).toBe(2);
    });
  });
});