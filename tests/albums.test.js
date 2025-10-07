const request = require('supertest');
const express = require('express');
const cors = require('cors');
const albumsRoute = require('../backend/routes/albums.js');
const Album = require('../backend/models/index.js');

describe('Albums API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/v1/albums', albumsRoute);
    // Backward compatibility route
    app.use('/api/albums', albumsRoute);
  });

  describe('GET /api/v1/albums', () => {
    it('should return empty array when no albums exist', async () => {
      const response = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return albums when they exist', async () => {
      // Create test albums
      const testAlbum = new Album({
        albumId: 'test_album_1',
        title: 'Test Album',
        artist: 'Test Artist',
        releaseDate: new Date('2023-01-01'),
        status: 'reviewed',
        score: 8.5,
        imageUrl: 'https://example.com/image.jpg'
      });
      await testAlbum.save();

      const response = await request(app)
        .get('/api/v1/albums')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('albumId', 'test_album_1');
      expect(response.body[0]).toHaveProperty('title', 'Test Album');
      expect(response.body[0]).toHaveProperty('artist', 'Test Artist');
    });
  });

  describe('GET /api/v1/album/:id', () => {
    it('should return 404 for non-existent album', async () => {
      const response = await request(app)
        .get('/api/v1/album/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return album data for existing album', async () => {
      // Create test album
      const testAlbum = new Album({
        albumId: 'test_album_2',
        title: 'Existing Album',
        artist: 'Existing Artist',
        releaseDate: new Date('2023-01-01'),
        status: 'reviewed',
        score: 7.8,
        imageUrl: 'https://example.com/image2.jpg'
      });
      await testAlbum.save();

      const response = await request(app)
        .get('/api/v1/album/test_album_2')
        .expect(200);

      expect(response.body).toHaveProperty('albumId', 'test_album_2');
      expect(response.body).toHaveProperty('title', 'Existing Album');
      expect(response.body).toHaveProperty('score', 7.8);
    });

    it('should create new album if it does not exist', async () => {
      // Mock the Spotify API response
      const response = await request(app)
        .get('/api/v1/album/test_album_id')
        .expect(200);

      // Should return the mocked album data
      expect(response.body).toHaveProperty('albumId', 'test_album_id');
      expect(response.body).toHaveProperty('title', 'Test Album');
      expect(response.body).toHaveProperty('artist', 'Test Artist');
    });
  });

  describe('POST /api/v1/album', () => {
    it('should create new album with valid data', async () => {
      const albumData = {
        albumId: 'new_test_album'
      };

      const response = await request(app)
        .post('/api/v1/album')
        .send(albumData)
        .expect(200);

      expect(response.body).toHaveProperty('albumId', 'new_test_album');
      expect(response.body).toHaveProperty('title', 'Test Album');
      expect(response.body).toHaveProperty('artist', 'Test Artist');
    });

    it('should return existing album if already exists', async () => {
      // Create existing album
      const existingAlbum = new Album({
        albumId: 'existing_album',
        title: 'Existing Album',
        artist: 'Existing Artist',
        status: 'reviewed',
        score: 8.0
      });
      await existingAlbum.save();

      const response = await request(app)
        .post('/api/v1/album')
        .send({ albumId: 'existing_album' })
        .expect(200);

      expect(response.body).toHaveProperty('albumId', 'existing_album');
      expect(response.body).toHaveProperty('title', 'Existing Album');
      expect(response.body).toHaveProperty('score', 8.0);
    });

    it('should return 400 for missing albumId', async () => {
      const response = await request(app)
        .post('/api/v1/album')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Backward compatibility routes', () => {
    it('should work with old /api/albums route', async () => {
      const response = await request(app)
        .get('/api/albums')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should work with old /api/album/:id route', async () => {
      const response = await request(app)
        .get('/api/album/test_album_id')
        .expect(200);

      expect(response.body).toHaveProperty('albumId', 'test_album_id');
    });

    it('should work with old POST /api/album route', async () => {
      const response = await request(app)
        .post('/api/album')
        .send({ albumId: 'old_route_test' })
        .expect(200);

      expect(response.body).toHaveProperty('albumId', 'old_route_test');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Force a database error by disconnecting
      await Album.db.close();

      const response = await request(app)
        .get('/api/v1/albums')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
