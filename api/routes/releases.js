import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
import { Album } from '../models/index.js';

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Authenticate Spotify
async function authenticateSpotify() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify authenticated');
    return true;
  } catch (err) {
    console.error('Spotify auth failed:', err);
    return false;
  }
}

// Refresh Spotify token if needed
async function ensureSpotifyAuth() {
  try {
    // Try a simple API call to check if token is valid
    await spotifyApi.getMe();
    return true;
  } catch (err) {
    console.log('Spotify auth check failed:', err.message || err);

    if (err.statusCode === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      console.log('Spotify token expired, refreshing...');
      return await authenticateSpotify();
    }

    console.error('Spotify auth check failed with unexpected error:', err);
    return false;
  }
}

// Initialize Spotify auth
authenticateSpotify();

/**
 * GET /api/new-releases
 * Get new music releases from Spotify
 */
export const getNewReleases = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'month';

    console.log(`Fetching new releases for time range: ${timeRange}`);

    // Ensure Spotify auth
    if (!(await ensureSpotifyAuth())) {
      console.log('Spotify auth failed, using database fallback');
      return await getPopularAlbumsFallback(res);
    }

    // Get new releases from Spotify
    const response = await spotifyApi.getNewReleases({
      limit: 20,
      offset: 0,
      country: 'US'
    });

    const albums = response.body.albums.items;

    if (!albums || albums.length === 0) {
      console.log('No albums from Spotify, using fallback');
      return await getPopularAlbumsFallback(res);
    }

    // Process the albums
    const processedAlbums = await processNewReleases(albums);

    // Filter by time range if specified
    let filteredAlbums = processedAlbums;
    if (timeRange !== 'all') {
      const now = new Date();
      let cutoffDate;

      switch (timeRange) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      filteredAlbums = processedAlbums.filter(album => {
        const releaseDate = new Date(album.releaseDate);
        return releaseDate >= cutoffDate;
      });
    }

    // Ensure we return at least some albums
    if (filteredAlbums.length === 0) {
      console.log('No albums in time range, returning recent albums');
      filteredAlbums = processedAlbums.slice(0, 12);
    }

    // Limit to 12 albums for homepage display
    const finalAlbums = filteredAlbums.slice(0, 12);

    console.log(`Returning ${finalAlbums.length} new releases`);
    res.json(finalAlbums);

  } catch (err) {
    console.error('New releases error:', err);
    // Fallback to database albums
    await getPopularAlbumsFallback(res);
  }
};

/**
 * GET /api/world-first/trends
 * Get World First underground trends
 */
export const getWorldFirstTrends = async (req, res) => {
  try {
    console.log('🌍 Fetching World First underground trends...');

    // For now, return mock data since the full implementation is complex
    const mockTrends = [
      {
        id: 'global_1',
        country: 'North America',
        countryCode: 'US',
        genre: 'various',
        track: {
          id: 'track1',
          title: 'Mock Track 1',
          previewUrl: null,
          duration: 180,
          rank: 1
        },
        artist: {
          id: 'artist1',
          name: 'Mock Underground Artist 1',
          imageUrl: 'https://via.placeholder.com/300x300',
          deezerUrl: 'https://deezer.com'
        },
        trendingScore: 8,
        spotifyPresence: 'emerging',
        trendStrength: 85,
        discoveredAt: new Date(),
        lastUpdated: new Date()
      }
    ];

    console.log(`🎯 Returning ${mockTrends.length} World First trends`);
    res.json(mockTrends);
  } catch (error) {
    console.error('Get World First trends error:', error);
    res.status(500).json({ error: 'Failed to fetch World First trends' });
  }
};

/**
 * GET /api/world-first/featured
 * Get featured World First trends
 */
export const getWorldFirstFeatured = async (req, res) => {
  try {
    console.log('🌟 Fetching featured World First trends (top 5)...');

    const mockFeatured = [
      {
        id: 'global_featured_1',
        country: 'North America',
        track: { title: 'Featured Track 1', artist: { name: 'Featured Artist 1' } },
        trendingScore: 9,
        trendStrength: 95
      }
    ];

    res.json(mockFeatured);
  } catch (error) {
    console.error('Get World First featured error:', error);
    res.status(500).json({ error: 'Failed to fetch featured trends' });
  }
};

// Helper function to process new releases
async function processNewReleases(albums) {
  const processedAlbums = [];

  for (const album of albums) {
    try {
      // Get full album details if we only have basic info
      let albumData = album;
      if (!album.images || !album.artists) {
        const fullAlbum = await spotifyApi.getAlbum(album.id);
        albumData = fullAlbum.body;
      }

      // Check if album is already in our database
      const existingAlbum = await Album.findOne({ albumId: albumData.id });

      processedAlbums.push({
        id: albumData.id,
        title: albumData.name,
        artist: albumData.artists[0].name,
        releaseDate: albumData.release_date,
        imageUrl: albumData.images[0]?.url,
        popularity: albumData.popularity,
        external_urls: albumData.external_urls,
        isRated: !!existingAlbum
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (albumErr) {
      console.error(`Error processing album ${album.id}:`, albumErr.message);
      continue;
    }
  }

  // Sort by popularity
  processedAlbums.sort((a, b) => b.popularity - a.popularity);

  return processedAlbums;
}

// Fallback function to return popular albums from database
async function getPopularAlbumsFallback(res) {
  try {
    console.log('Using database fallback for new releases...');

    // Get popular albums from our database that were released recently
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const popularAlbums = await Album.find({
      status: 'reviewed',
      releaseDate: { $gte: sixMonthsAgo },
      score: { $gte: 7.0 }
    })
    .sort({ score: -1, releaseDate: -1 })
    .limit(12);

    const fallbackAlbums = popularAlbums.map(album => ({
      id: album.albumId,
      title: album.title,
      artist: album.artist,
      releaseDate: album.releaseDate,
      imageUrl: album.imageUrl,
      popularity: Math.floor(album.score * 10), // Estimate popularity from score
      external_urls: { spotify: `https://open.spotify.com/album/${album.albumId}` },
      isRated: true,
      isFallback: true
    }));

    console.log(`Database fallback returned ${fallbackAlbums.length} albums`);
    return res.json(fallbackAlbums);

  } catch (fallbackErr) {
    console.error('Database fallback failed:', fallbackErr.message);

    // Ultimate fallback: Return some hardcoded popular albums
    const ultimateFallback = [
      {
        id: '4gzpq5DPGxSnKTe4SA8HAU', // Coldplay album
        title: 'Music of the Spheres',
        artist: 'Coldplay',
        releaseDate: '2021-10-15',
        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273ec10f247b100da1ce0d80b6',
        popularity: 75,
        external_urls: { spotify: 'https://open.spotify.com/album/4gzpq5DPGxSnKTe4SA8HAU' },
        isRated: false,
        isFallback: true
      },
      {
        id: '6s84u2TUpR3wdUv4NgKA2j', // Adele album
        title: '30',
        artist: 'Adele',
        releaseDate: '2021-11-19',
        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c6b2127ce1c6c87e5b945957',
        popularity: 80,
        external_urls: { spotify: 'https://open.spotify.com/album/6s84u2TUpR3wdUv4NgKA2j' },
        isRated: false,
        isFallback: true
      }
    ];

    console.log('Using ultimate fallback with hardcoded albums');
    return res.json(ultimateFallback);
  }
}
