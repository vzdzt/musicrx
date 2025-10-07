const request = require('supertest');
const express = require('express');

describe('Health API', () => {
  let app;

  beforeEach(async () => {
    app = express();
    // Dynamic import for ES module
    const { getHealth } = await import('../backend/routes/health.js');
    app.get('/api/health', getHealth);
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should handle multiple requests', async () => {
      // Test concurrent requests
      const promises = Array(5).fill().map(() =>
        request(app).get('/api/health').expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });
});
