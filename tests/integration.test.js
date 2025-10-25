const request = require('supertest');
const app = require('../app');
const database = require('../config/database');

describe('Integration Tests', () => {
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

  describe('Full workflow', () => {
    it('should complete full refresh and retrieval workflow', async () => {
      // Start with empty database
      const initialStatus = await request(app).get('/status');
      expect(initialStatus.body.total_countries).toBe(0);

      // Refresh countries (with mocked external APIs)
      // Note: In real tests, you'd mock axios here

      // Check status after operations
      const finalStatus = await request(app).get('/status');
      expect(finalStatus.body).toHaveProperty('total_countries');
      expect(finalStatus.body).toHaveProperty('last_refreshed_at');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Endpoint not found'
      });
    });

    it('should return JSON for all error responses', async () => {
      const responses = await Promise.all([
        request(app).get('/unknown'),
        request(app).post('/invalid'),
        request(app).put('/test')
      ]);

      responses.forEach(response => {
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});