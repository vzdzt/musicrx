// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/musicrx_test';
  process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
  process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
  process.env.PORT = '3001';
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Mock external APIs for testing
jest.mock('spotify-web-api-node', () => {
  return jest.fn().mockImplementation(() => ({
    clientCredentialsGrant: jest.fn().mockResolvedValue({
      body: { 'access_token': 'mock_access_token' }
    }),
    setAccessToken: jest.fn(),
    getMe: jest.fn().mockResolvedValue({ body: { id: 'test_user' } }),
    getAlbum: jest.fn().mockResolvedValue({
      body: {
        id: 'test_album_id',
        name: 'Test Album',
        artists: [{ name: 'Test Artist' }],
        release_date: '2023-01-01',
        images: [{ url: 'https://example.com/image.jpg' }],
        popularity: 50
      }
    }),
    getArtist: jest.fn().mockResolvedValue({
      body: {
        id: 'test_artist_id',
        name: 'Test Artist',
        popularity: 50,
        followers: { total: 100000 },
        images: [{ url: 'https://example.com/artist.jpg' }],
        genres: ['pop', 'rock']
      }
    }),
    getArtistTopTracks: jest.fn().mockResolvedValue({
      body: {
        tracks: [
          {
            id: 'track1',
            name: 'Test Track 1',
            popularity: 60
          },
          {
            id: 'track2',
            name: 'Test Track 2',
            popularity: 55
          }
        ]
      }
    }),
    searchArtists: jest.fn().mockResolvedValue({
      body: {
        artists: {
          items: [{
            id: 'test_artist_id',
            name: 'Test Artist',
            popularity: 50,
            followers: { total: 100000 }
          }]
        }
      }
    }),
    search: jest.fn().mockResolvedValue({
      body: {
        shows: {
          items: [{
            id: 'test_podcast_id',
            name: 'Test Podcast',
            description: 'Test description',
            publisher: 'Test Publisher',
            total_episodes: 10,
            images: [{ url: 'https://example.com/podcast.jpg' }]
          }]
        }
      }
    }),
    getShow: jest.fn().mockResolvedValue({
      body: {
        id: 'test_podcast_id',
        name: 'Test Podcast',
        description: 'Test description',
        publisher: 'Test Publisher',
        total_episodes: 10,
        images: [{ url: 'https://example.com/podcast.jpg' }]
      }
    }),
    getShowEpisodes: jest.fn().mockResolvedValue({
      body: {
        items: [{
          id: 'episode1',
          name: 'Test Episode',
          description: 'Test episode description',
          duration_ms: 3600000,
          release_date: '2023-01-01',
          images: [{ url: 'https://example.com/episode.jpg' }]
        }],
        total: 1
      }
    }),
    getNewReleases: jest.fn().mockResolvedValue({
      body: {
        albums: {
          items: [{
            id: 'new_album_id',
            name: 'New Release Album',
            artists: [{ name: 'New Artist' }],
            release_date: '2023-01-01',
            images: [{ url: 'https://example.com/new.jpg' }],
            popularity: 70
          }]
        }
      }
    })
  }));
});

// Mock axios for external API calls
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock child_process for system operations
jest.mock('child_process', () => ({
  exec: jest.fn((command, options, callback) => {
    if (callback) {
      callback(null, 'success', '');
    }
  })
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn(),
    on: jest.fn().mockImplementation(function(event, callback) {
      if (event === 'end') {
        callback();
      }
      return this;
    })
  })
}));

// Mock path for file operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const ext = filename.split('.').pop();
    return ext ? `.${ext}` : '';
  })
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/musicrx_test';
process.env.PORT = '3001';
