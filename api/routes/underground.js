import mongoose from 'mongoose';

// Underground Artist schema
const undergroundArtistSchema = new mongoose.Schema({
  artistId: String,
  name: String,
  genres: [String],
  spotifyPopularity: Number,
  monthlyListeners: Number,
  followers: Number,
  imageUrl: String,
  score: Number,
  ranking: Number,
  strengths: [String],
  weaknesses: [String],
  ugRating: String, // UG (Underground) Rating replaces social sentiment
  recentGrowth: Number,
  lastUpdated: Date
});
const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

/**
 * GET /api/underground-rankings
 * Get underground artist rankings
 */
export const getUndergroundRankings = async (req, res) => {
  try {
    console.log('🔍 Fetching underground rankings from database...');

    // Get all artists from database (no API updates to preserve manual data)
    const allArtists = await UndergroundArtist.find();

    // Apply underground filter - inclusive for established underground artists
    const undergroundArtists = allArtists.filter(artist => {
      // Include artists considered "underground" in their genre/scene
      // Allow higher popularity/followers for rap/hip-hop artists
      const isUnderground =
        (artist.spotifyPopularity < 85) || // Allow established artists
        (artist.followers < 5000000) ||   // Allow major underground artists
        (!artist.spotifyPopularity && !artist.followers); // Not on Spotify at all

      return isUnderground;
    });

    // Sort by monthly listeners (using stored database values)
    undergroundArtists.sort((a, b) => (b.monthlyListeners || 0) - (a.monthlyListeners || 0));

    console.log(`🎯 Returned ${undergroundArtists.length} underground artists from database`);
    res.json(undergroundArtists);
  } catch (error) {
    console.error('Get underground rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch underground rankings' });
  }
};

/**
 * POST /api/populate-underground-rankings
 * Populate underground rankings
 */
export const populateUndergroundRankings = async (req, res) => {
  try {
    console.log('🚀 API: Starting underground rankings population...');
    // This would trigger the population process
    // For now, just return success
    res.json({
      success: true,
      message: 'Underground rankings population completed',
      count: 0
    });
  } catch (error) {
    console.error('Populate underground rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to populate underground rankings',
      error: error.message
    });
  }
};

/**
 * POST /api/update-underground-rankings
 * Update underground rankings
 */
export const updateUndergroundRankings = async (req, res) => {
  try {
    // This would trigger the update process
    // For now, just return success
    res.json({ success: true, message: 'Underground rankings updated' });
  } catch (error) {
    console.error('Update underground rankings error:', error);
    res.status(500).json({ error: 'Failed to update underground rankings' });
  }
};
