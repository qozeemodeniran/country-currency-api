const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');

describe('Country API Tests', () => {
  beforeAll(async () => {
    // Ensure database is clean before tests
    await pool.execute('DELETE FROM countries');
    await pool.execute('DELETE FROM refresh_timestamp');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /countries/refresh', () => {
    it('should refresh countries data', async () => {
      const response = await request(app)
        .post('/countries/refresh')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('total_processed');
      expect(response.body).toHaveProperty('last_refreshed_at');
    });

    it('should handle external API failure', async () => {
      // This test might pass/fail based on external API availability
      const response = await request(app)
        .post('/countries/refresh');

      // Should either succeed or return 503
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('GET /countries', () => {
    it('should return all countries', async () => {
      const response = await request(app)
        .get('/countries')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by region', async () => {
      const response = await request(app)
        .get('/countries?region=Africa')
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body[0].region).toBe('Africa');
      }
    });

    it('should filter by currency', async () => {
      const response = await request(app)
        .get('/countries?currency=USD')
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body[0].currency_code).toBe('USD');
      }
    });

    it('should sort by GDP', async () => {
      const response = await request(app)
        .get('/countries?sort=gdp_desc')
        .expect(200);

      if (response.body.length > 1) {
        // Check if sorted in descending order
        const gdpValues = response.body.map(c => c.estimated_gdp).filter(g => g);
        const sortedGdp = [...gdpValues].sort((a, b) => b - a);
        expect(gdpValues).toEqual(sortedGdp);
      }
    });
  });

  describe('GET /countries/:name', () => {
    it('should return a specific country', async () => {
      // First, get all countries to have a valid name
      const allResponse = await request(app).get('/countries');
      if (allResponse.body.length > 0) {
        const countryName = allResponse.body[0].name;
        
        const response = await request(app)
          .get(`/countries/${encodeURIComponent(countryName)}`)
          .expect(200);

        expect(response.body).toHaveProperty('name', countryName);
      }
    });

    it('should return 404 for non-existent country', async () => {
      await request(app)
        .get('/countries/NonExistentCountry123')
        .expect(404)
        .expect({ error: "Country not found" });
    });
  });

  describe('DELETE /countries/:name', () => {
    it('should delete a country', async () => {
      const allResponse = await request(app).get('/countries');
      if (allResponse.body.length > 0) {
        const countryName = allResponse.body[0].name;
        
        await request(app)
          .delete(`/countries/${encodeURIComponent(countryName)}`)
          .expect(200)
          .expect({ message: "Country deleted successfully" });

        // Verify deletion
        await request(app)
          .get(`/countries/${encodeURIComponent(countryName)}`)
          .expect(404);
      }
    });

    it('should return 404 when deleting non-existent country', async () => {
      await request(app)
        .delete('/countries/NonExistentCountry123')
        .expect(404);
    });
  });
});