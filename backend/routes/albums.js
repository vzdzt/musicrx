import { Album } from '../models/index.js';

/**
 * GET /api/albums
 * Get all albums
 */
export const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find();
    res.json(albums);
  } catch (error) {
    console.error('Get albums error:', error);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
};

/**
 * GET /api/album/:id
 * Get album by ID
 */
export const getAlbum = async (req, res) => {
  try {
    let album = await Album.findOne({ albumId: req.params.id });
    if (!album) {
      // Try to fetch from Spotify and create album
      // This would need Spotify integration
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.status === 'enqueued') {
      // Check if ready for review
      // This would need review logic
    }

    res.json(album);
  } catch (error) {
    console.error('Get album error:', error);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
};

/**
 * POST /api/album
 * Create or update album
 */
export const createAlbum = async (req, res) => {
  try {
    const { albumId } = req.body;

    // Check if album exists
    const existingAlbum = await Album.findOne({ albumId });
    if (existingAlbum) {
      return res.json(existingAlbum);
    }

    // Create new album - would need Spotify integration
    res.status(501).json({ error: 'Album creation not implemented' });
  } catch (error) {
    console.error('Create album error:', error);
    res.status(500).json({ error: 'Failed to create album' });
  }
};

/**
 * GET /api/featured-albums
 * Get featured albums
 */
export const getFeaturedAlbums = async (req, res) => {
  try {
    const featuredAlbums = await Album.find({ featured: true }).sort({ ranking: 1 });
    res.json(featuredAlbums);
  } catch (error) {
    console.error('Get featured albums error:', error);
    res.status(500).json({ error: 'Failed to fetch featured albums' });
  }
};

/**
 * GET /api/aoty-contenders
 * Get Album of the Year contenders
 */
export const getAOTYContenders = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const contenders = await Album.find({
      status: 'reviewed',
      releaseDate: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ score: -1 }).limit(10);

    res.json(contenders);
  } catch (error) {
    console.error('Get AOTY contenders error:', error);
    res.status(500).json({ error: 'Failed to fetch album of the year contenders' });
  }
};

/**
 * GET /api/all-2025-albums
 * Get all 2025 albums
 */
export const getAll2025Albums = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const pipeline = [
      {
        $match: {
          status: 'reviewed',
          releaseDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: '$albumId',
          album: { $first: '$$ROOT' },
          maxScore: { $max: '$score' }
        }
      },
      {
        $sort: { maxScore: -1 }
      }
    ];

    const groupedResults = await Album.aggregate(pipeline);
    const allAlbums = groupedResults.map(result => ({
      ...result.album,
      score: result.maxScore
    }));

    res.json(allAlbums);
  } catch (error) {
    console.error('Get all 2025 albums error:', error);
    res.status(500).json({ error: 'Failed to fetch all 2025 albums' });
  }
};

/**
 * GET /api/all-time-rankings
 * Get all-time rankings
 */
export const getAllTimeRankings = async (req, res) => {
  try {
    const allAlbums = await Album.find({ status: 'reviewed' })
      .sort({ score: -1 })
      .limit(500);

    const allTimeRankings = allAlbums.map(album => ({
      albumId: album.albumId,
      title: album.title,
      artist: album.artist,
      score: album.score,
      strengths: album.strengths || [],
      weaknesses: album.weaknesses || [],
      imageUrl: album.imageUrl,
      releaseDate: album.releaseDate
    }));

    res.json(allTimeRankings);
  } catch (error) {
    console.error('Get all-time rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch all-time rankings' });
  }
};
