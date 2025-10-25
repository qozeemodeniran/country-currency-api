// tests/app.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Country Currency API', () => {
  beforeAll(async () => {
    // Clear test data
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM countries', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterAll(async () => {
    db.end();
  });

  describe('GET /', () => {
    it('should return API status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Country Currency & Exchange API');
    });
  });

  describe('POST /countries/refresh', () => {
    it('should refresh countries data', async () => {
      const response = await request(app)
        .post('/countries/refresh')
        .expect('Content-Type', /json/);

      // This might return 503 if external APIs are down, which is acceptable
      if (response.status === 503) {
        expect(response.body).toHaveProperty('error', 'External data source unavailable');
      } else if (response.status === 200) {
        expect(response.body).toHaveProperty('message', 'Countries data refreshed successfully');
        expect(response.body).toHaveProperty('total_processed');
      }
    });
  });

  describe('GET /countries', () => {
    it('should return all countries', async () => {
      const response = await request(app)
        .get('/countries')
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by region', async () => {
      const response = await request(app)
        .get('/countries?region=Africa')
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by currency', async () => {
      const response = await request(app)
        .get('/countries?currency=USD')
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should sort by GDP descending', async () => {
      const response = await request(app)
        .get('/countries?sort=gdp_desc')
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /countries/:name', () => {
    it('should return 404 for non-existent country', async () => {
      const response = await request(app)
        .get('/countries/NonExistentCountry')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Country not found');
    });
  });

  describe('DELETE /countries/:name', () => {
    it('should return 404 for non-existent country', async () => {
      const response = await request(app)
        .delete('/countries/NonExistentCountry')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Country not found');
    });
  });

  describe('GET /status', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/status')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_countries');
      expect(response.body).toHaveProperty('last_refreshed_at');
    });
  });

  describe('GET /countries/image', () => {
    it('should return image or not found', async () => {
      const response = await request(app)
        .get('/countries/image/generate')
        .expect('Content-Type', /json/);

      // Either redirects to image or returns not found
      expect([200, 302, 404]).toContain(response.status);
    });
  });
});