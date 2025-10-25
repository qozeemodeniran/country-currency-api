const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

beforeAll(async () => {
  await db.sequelize.authenticate();
  // optional: run migrations externally or ensure tables exist
});

afterAll(async () => {
  await db.sequelize.close();
});

describe('API status endpoint', () => {
  test('GET /status returns valid structure', async () => {
    const res = await request(app).get('/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total_countries');
    expect(res.body).toHaveProperty('last_refreshed_at');
  });
});
