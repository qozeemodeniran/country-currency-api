const request = require('supertest');
const app = require('../app');

describe('Status API Tests', () => {
  describe('GET /status', () => {
    it('should return status information', async () => {
      const response = await request(app)
        .get('/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('total_countries');
      expect(response.body).toHaveProperty('last_refreshed_at');
      expect(typeof response.body.total_countries).toBe('number');
    });
  });
});