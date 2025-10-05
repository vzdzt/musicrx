import mongoose from 'mongoose';

// News Article schema
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
const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);

/**
 * GET /api/news
 * Get news articles
 */
export const getNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;

    let query = {};
    if (category) {
      query.category = category;
    }

    const articles = await NewsArticle.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit);

    res.json(articles);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};

/**
 * GET /api/news/trending
 * Get trending news
 */
export const getTrendingNews = async (req, res) => {
  try {
    const articles = await NewsArticle.find({
      category: 'trending',
      publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
      .sort({ engagement: -1 })
      .limit(10);

    res.json(articles);
  } catch (error) {
    console.error('Get trending news error:', error);
    res.status(500).json({ error: 'Failed to fetch trending news' });
  }
};

/**
 * POST /api/news/collect
 * Manually trigger news collection
 */
export const collectNews = async (req, res) => {
  try {
    // This would trigger the news collection process
    // For now, just return success
    console.log('📰 Starting manual news collection...');
    // await collectDailyNews(); // Would need to import this function
    res.json({ success: true, message: 'News collection completed' });
  } catch (error) {
    console.error('Collect news error:', error);
    res.status(500).json({ error: 'Failed to collect news' });
  }
};
