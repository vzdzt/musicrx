import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

// Import our modular components
import { connectDatabase } from './config/database.js';
import {
  securityHeaders,
  sanitizeInput,
  generalRateLimit,
  strictRateLimit,
  requestSizeLimit,
  validateObjectId,
  validateUrl,
  sanitizeString
} from './middleware/security.js';

// Import route handlers
import { getHealth } from './routes/health.js';
// Temporarily disable problematic routes due to model conflicts
// import {
//   getAlbums,
//   getAlbum,
//   createAlbum,
//   getFeaturedAlbums,
//   getAOTYContenders,
//   getAll2025Albums,
//   getAllTimeRankings
// } from './routes/albums.js';
// import {
//   getNews,
//   getTrendingNews,
//   collectNews
// } from './routes/news.js';
// import {
//   getUndergroundRankings,
//   populateUndergroundRankings,
//   updateUndergroundRankings
// } from './routes/underground.js';
// import {
//   getNewReleases,
//   getWorldFirstTrends,
//   getWorldFirstFeatured
// } from './routes/releases.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Security middleware (applied first)
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://musicrx.app', 'https://www.musicrx.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimit);
app.use(sanitizeInput);

// Rate limiting
app.use('/api/', generalRateLimit);
app.use('/api/news/collect', strictRateLimit);
app.use('/api/convert-video', strictRateLimit);
app.use('/api/download-media', strictRateLimit);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Database connection
connectDatabase().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Routes
app.get('/api/health', getHealth);

// Temporarily disable problematic routes due to model conflicts
// Album routes
// app.get('/api/albums', getAlbums);
// app.get('/api/album/:id', getAlbum);
// app.post('/api/album', createAlbum);
// app.get('/api/featured-albums', getFeaturedAlbums);
// app.get('/api/aoty-contenders', getAOTYContenders);
// app.get('/api/all-2025-albums', getAll2025Albums);
// app.get('/api/all-time-rankings', getAllTimeRankings);

// News routes
// app.get('/api/news', getNews);
// app.get('/api/news/trending', getTrendingNews);
// app.post('/api/news/collect', collectNews);

// Underground routes
// app.get('/api/underground-rankings', getUndergroundRankings);
// app.post('/api/populate-underground-rankings', populateUndergroundRankings);
// app.post('/api/update-underground-rankings', updateUndergroundRankings);

// Release routes
// app.get('/api/new-releases', getNewReleases);
// app.get('/api/world-first/trends', getWorldFirstTrends);
// app.get('/api/world-first/featured', getWorldFirstFeatured);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak sensitive information
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const errorResponse = {
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  };

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mongoose.disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MusicRx API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
