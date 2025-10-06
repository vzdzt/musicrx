const request = require('supertest');
const express = require('express');
const cors = require('cors');
const albumsRoute = require('../api/routes/albums.js');
const healthRoute = require('../api/routes/health.js');
const Album = require('../api/models/index.js');

describe('Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());

    // Mount all routes
    app.use('/api/health', healthRoute);
    app.use('/api/v1/albums', albumsRoute);
    app.use('/api/albums', albumsRoute); // Backward compatibility

    // Add some additional test routes for integration testing
    app.get('/api/featured-albums', async (req, res) => {
      try {
        const featuredAlbums = await Album.find({ featured: true }).sort({ ranking: 1 });
        res.json(featuredAlbums);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch featured albums' });
      }
    });

    app.get('/api/all-time-rankings', async (req, res) => {
      try {
        const allAlbums = await Album.find({ status: 'reviewed' })
          .sort({ score: -1 })
          .limit(10);
        res.json(allAlbums);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all-time rankings' });
      }
    });
  });

  describe('Full album workflow', () => {
    it('should handle complete album creation and retrieval workflow', async () => {
      // Step 1: Check health endpoint
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');

      // Step 2: Initially no albums should exist
      const initialAlbumsResponse = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      expect(initialAlbumsResponse.body).toHaveLength(0);

      // Step 3: Create a new album
      const createResponse = await request(app)
        .post('/api/v1/album')
        .send({ albumId: 'integration_test_album' })
        .expect(200);

      expect(createResponse.body).toHaveProperty('albumId', 'integration_test_album');
      expect(createResponse.body).toHaveProperty('title', 'Test Album');
      expect(createResponse.body).toHaveProperty('status');

      // Step 4: Retrieve the album by ID
      const albumResponse = await request(app)
        .get('/api/v1/album/integration_test_album')
        .expect(200);

      expect(albumResponse.body.albumId).toBe('integration_test_album');
      expect(albumResponse.body.title).toBe('Test Album');

      // Step 5: Check that albums list now contains the album
      const albumsListResponse = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      expect(albumsListResponse.body).toHaveLength(1);
      expect(albumsListResponse.body[0].albumId).toBe('integration_test_album');

      // Step 6: Test backward compatibility routes
      const oldRouteResponse = await request(app)
        .get('/api/album/integration_test_album')
        .expect(200);

      expect(oldRouteResponse.body.albumId).toBe('integration_test_album');
    });

    it('should handle multiple albums and rankings', async () => {
      // Create multiple albums with different scores
      const albumsData = [
        { albumId: 'album1', title: 'Album One', artist: 'Artist One', score: 9.5 },
        { albumId: 'album2', title: 'Album Two', artist: 'Artist Two', score: 8.7 },
        { albumId: 'album3', title: 'Album Three', artist: 'Artist Three', score: 7.2 }
      ];

      // Create albums in database
      for (const albumData of albumsData) {
        const album = new Album({
          ...albumData,
          status: 'reviewed',
          releaseDate: new Date('2023-01-01'),
          imageUrl: 'https://example.com/image.jpg'
        });
        await album.save();
      }

      // Test all-time rankings
      const rankingsResponse = await request(app)
        .get('/api/all-time-rankings')
        .expect(200);

      expect(rankingsResponse.body).toHaveLength(3);
      // Should be sorted by score descending
      expect(rankingsResponse.body[0].score).toBe(9.5);
      expect(rankingsResponse.body[1].score).toBe(8.7);
      expect(rankingsResponse.body[2].score).toBe(7.2);

      // Test individual album access
      for (const albumData of albumsData) {
        const response = await request(app)
          .get(`/api/v1/album/${albumData.albumId}`)
          .expect(200);

        expect(response.body.albumId).toBe(albumData.albumId);
        expect(response.body.score).toBe(albumData.score);
      }
    });

    it('should handle featured albums workflow', async () => {
      // Create albums and mark some as featured
      const albums = [];
      for (let i = 1; i <= 5; i++) {
        const album = new Album({
          albumId: `featured_test_${i}`,
          title: `Featured Album ${i}`,
          artist: `Artist ${i}`,
          status: 'reviewed',
          score: 10 - i, // Scores: 9, 8, 7, 6, 5
          releaseDate: new Date('2023-01-01'),
          imageUrl: 'https://example.com/image.jpg',
          featured: i <= 3, // First 3 are featured
          ranking: i <= 3 ? i : null
        });
        await album.save();
        albums.push(album);
      }

      // Test featured albums endpoint
      const featuredResponse = await request(app)
        .get('/api/featured-albums')
        .expect(200);

      expect(featuredResponse.body).toHaveLength(3);
      // Should be sorted by ranking
      expect(featuredResponse.body[0].ranking).toBe(1);
      expect(featuredResponse.body[1].ranking).toBe(2);
      expect(featuredResponse.body[2].ranking).toBe(3);

      // Verify featured albums have correct data
      featuredResponse.body.forEach((album, index) => {
        expect(album.featured).toBe(true);
        expect(album.ranking).toBe(index + 1);
      });
    });
  });

  describe('Error handling integration', () => {
    it('should handle database connection issues gracefully', async () => {
      // Force database disconnection
      await Album.db.close();

      // All endpoints should handle the error gracefully
      const endpoints = [
        '/api/health',
        '/api/v1/albums',
        '/api/featured-albums',
        '/api/all-time-rankings'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(response => {
            // Should either succeed or return a proper error
            expect([200, 500]).toContain(response.status);
            if (response.status === 500) {
              expect(response.body).toHaveProperty('error');
            }
          });
      }
    });

    it('should handle malformed requests', async () => {
      const malformedRequests = [
        {
          method: 'post',
          url: '/api/v1/album',
          data: { invalidField: 'invalid' },
          expectedStatus: 400
        },
        {
          method: 'get',
          url: '/api/v1/album/invalid@id',
          expectedStatus: 404
        }
      ];

      for (const req of malformedRequests) {
        const requestBuilder = request(app)[req.method](req.url);

        if (req.data) {
          requestBuilder.send(req.data);
        }

        const response = await requestBuilder.expect(req.expectedStatus);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent album operations', async () => {
      const concurrentOperations = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/v1/album')
          .send({ albumId: `concurrent_test_${index}` })
      );

      const responses = await Promise.all(concurrentOperations);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('albumId');
      });

      // Verify all albums were created
      const albumsResponse = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      expect(albumsResponse.body.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent health checks', async () => {
      const healthChecks = Array(20).fill().map(() =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(healthChecks);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe('Data consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create an album
      const createResponse = await request(app)
        .post('/api/v1/album')
        .send({ albumId: 'consistency_test' })
        .expect(200);

      const createdAlbum = createResponse.body;

      // Retrieve the same album multiple times
      const retrievalPromises = Array(5).fill().map(() =>
        request(app).get('/api/v1/album/consistency_test')
      );

      const retrievalResponses = await Promise.all(retrievalPromises);

      // All retrievals should return the same data
      retrievalResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.albumId).toBe(createdAlbum.albumId);
        expect(response.body.title).toBe(createdAlbum.title);
      });

      // Album should appear in the list
      const listResponse = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      const foundAlbum = listResponse.body.find(album => album.albumId === 'consistency_test');
      expect(foundAlbum).toBeDefined();
      expect(foundAlbum.title).toBe(createdAlbum.title);
    });
  });
});
