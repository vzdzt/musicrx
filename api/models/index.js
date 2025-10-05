import mongoose from 'mongoose';

// Define schemas once
const albumSchema = new mongoose.Schema({
  albumId: String,
  title: String,
  artist: String,
  releaseDate: Date,
  status: String, // 'enqueued' or 'reviewed'
  score: Number,
  strengths: [String],
  weaknesses: [String],
  readyBy: Date,
  imageUrl: String,
  featured: { type: Boolean, default: false },
  ranking: Number
});

const newsArticleSchema = new mongoose.Schema({
  title: String,
  content: String,
  summary: String,
  source: String,
  url: String,
  imageUrl: String,
  publishedAt: Date,
  category: String, // 'music', 'artist', 'album', 'industry', 'trending'
  tags: [String],
  sentiment: Number, // -1 to 1 (negative to positive)
  engagement: Number, // popularity/engagement score
  isAutomated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

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

// Clear any existing models to avoid conflicts
if (mongoose.models.Album) {
  delete mongoose.models.Album;
}
if (mongoose.models.NewsArticle) {
  delete mongoose.models.NewsArticle;
}
if (mongoose.models.UndergroundArtist) {
  delete mongoose.models.UndergroundArtist;
}

// Export models
export const Album = mongoose.model('Album', albumSchema);
export const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);
export const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);
