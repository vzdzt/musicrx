const request = require('supertest');
const express = require('express');
const healthRoute = require('../backend/routes/health.js');

describe('Health API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRoute);
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.headers['content-type']).toMatch(/application\/json/);
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
