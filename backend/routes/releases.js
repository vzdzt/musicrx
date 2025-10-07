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
 * Get new music releases - prioritizes database albums over Spotify API
 */
export const getNewReleases = async (req, res) => {
  console.log('🚀🚀🚀 getNewReleases FUNCTION STARTED 🚀🚀🚀');

  // Calculate date range first (outside try block so it's available in catch)
  const timeRange = req.query?.timeRange || '2years';
  const now = new Date();
  let startDate;

  switch (timeRange) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 2 months instead of 1
      break;
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '2years':
      startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000); // 2 years
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Default to 2 months
  }

  try {
    console.log(`🎵🎵🎵 NEW RELEASES API CALLED - timeRange: ${timeRange} 🎵🎵🎵`);
    console.log(`Looking for albums released since: ${startDate.toISOString()}`);
    console.log(`CURRENT TIME DEBUG: ${now.toISOString()}`);

    // FIRST: Try to get recently reviewed albums from our database within the specified time range
    try {
      // Get all reviewed albums from the time range (no score threshold for new releases)
      const recentAlbums = await Album.find({
        status: 'reviewed',
        releaseDate: { $gte: startDate } // Use the calculated startDate from timeRange
      })
      .sort({ releaseDate: -1 }) // Most recent release date first
      .limit(12);

      if (recentAlbums && recentAlbums.length > 0) {
        console.log(`Found ${recentAlbums.length} albums in time range ${timeRange} in database`);

        const processedRecentAlbums = recentAlbums.map(album => ({
          id: album.albumId,
          title: album.title,
          artist: album.artist,
          releaseDate: album.releaseDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          imageUrl: album.imageUrl,
          popularity: Math.floor(album.score * 10), // Estimate popularity from score
          external_urls: { spotify: `https://open.spotify.com/album/${album.albumId}` },
          isRated: true,
          isFallback: false
        }));

        console.log(`Returning ${processedRecentAlbums.length} recent albums (most recent: ${processedRecentAlbums[0]?.releaseDate})`);
        return res.json(processedRecentAlbums);
      }
    } catch (dbErr) {
      console.error('Database query failed:', dbErr.message);
    }

    // SECOND: If no database albums, fall back to Spotify API
    console.log('No database albums found, trying Spotify API');

    // Ensure Spotify auth
    if (!(await ensureSpotifyAuth())) {
      console.log('Spotify auth failed, using ultimate fallback');
      return await getPopularAlbumsFallback(res);
    }

    // Try Spotify's new releases endpoint
    try {
      const response = await spotifyApi.getNewReleases({
        limit: 50,
        offset: 0,
        country: 'US'
      });

      const albums = response.body.albums.items;

      if (albums && albums.length > 0) {
        // Process the albums
        const processedAlbums = await processNewReleases(albums);

        // Sort by release date (most recent first)
        processedAlbums.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

        // Limit to 12 albums for homepage display
        const finalAlbums = processedAlbums.slice(0, 12);

        console.log(`Returning ${finalAlbums.length} Spotify albums (most recent: ${finalAlbums[0]?.releaseDate})`);
        return res.json(finalAlbums);
      }
    } catch (spotifyErr) {
      console.error('Spotify API failed:', spotifyErr.message);
    }

    // THIRD: Ultimate fallback
    console.log('All APIs failed, using ultimate fallback');
    await getPopularAlbumsFallback(res, startDate);

  } catch (err) {
    console.error('New releases error:', err);
    // Fallback to database albums
    await getPopularAlbumsFallback(res, startDate);
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
async function getPopularAlbumsFallback(res, startDate = null) {
  try {
    console.log('Using database fallback for new releases...');

    // Use the provided startDate or default to 2 years ago if not provided
    const cutoffDate = startDate || new Date(new Date().getTime() - 730 * 24 * 60 * 60 * 1000);

    console.log(`Database fallback using cutoff date: ${cutoffDate.toISOString()}`);

    const popularAlbums = await Album.find({
      status: 'reviewed',
      releaseDate: { $gte: cutoffDate }
    })
    .sort({ releaseDate: -1, score: -1 }) // Sort by release date first, then score
    .limit(12);

    const fallbackAlbums = popularAlbums.map(album => ({
      id: album.albumId,
      title: album.title,
      artist: album.artist,
      releaseDate: album.releaseDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      imageUrl: album.imageUrl,
      popularity: Math.floor(album.score * 10), // Estimate popularity from score
      external_urls: { spotify: `https://open.spotify.com/album/${album.albumId}` },
      isRated: true,
      isFallback: true
    }));

    console.log(`Database fallback returned ${fallbackAlbums.length} albums since ${cutoffDate.toISOString().split('T')[0]}`);
    return res.json(fallbackAlbums);

  } catch (fallbackErr) {
    console.error('Database fallback failed:', fallbackErr.message);

    // Ultimate fallback: Return some hardcoded popular albums from recent years
    const ultimateFallback = [
      {
        id: '1Mo4aZ8pdj6L1jx8zSwJnt', // Taylor Swift - The Tortured Poets Department
        title: 'THE TORTURED POETS DEPARTMENT',
        artist: 'Taylor Swift',
        releaseDate: '2024-04-19',
        imageUrl: 'https://i.scdn.co/image/ab67616d00001e025076e4160d018e378f488c33',
        popularity: 95,
        external_urls: { spotify: 'https://open.spotify.com/album/1Mo4aZ8pdj6L1jx8zSwJnt' },
        isRated: false,
        isFallback: true
      },
      {
        id: '7aJuG4TFXa2hmE4z1yxc3n', // Taylor Swift - Midnights
        title: 'Midnights',
        artist: 'Taylor Swift',
        releaseDate: '2022-10-21',
        imageUrl: 'https://i.scdn.co/image/ab67616d00001e02bb54dde68cd23e2a268ae0f5',
        popularity: 90,
        external_urls: { spotify: 'https://open.spotify.com/album/7aJuG4TFXa2hmE4z1yxc3n' },
        isRated: false,
        isFallback: true
      },
      {
        id: '6s84u2TUpR3wdUv4NgKA2j', // Adele album
        title: '30',
        artist: 'Adele',
        releaseDate: '2021-11-19',
        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c6b2127ce1c6c87e5b945957',
        popularity: 85,
        external_urls: { spotify: 'https://open.spotify.com/album/6s84u2TUpR3wdUv4NgKA2j' },
        isRated: false,
        isFallback: true
      }
    ];

    console.log('Using ultimate fallback with recent popular albums');
    return res.json(ultimateFallback);
  }
}
