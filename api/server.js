import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SpotifyWebApi from 'spotify-web-api-node';
import cron from 'node-cron';
import axios from 'axios';
import Sentiment from 'sentiment';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';
// import { TwitterApi } from 'twitter-api-v2'; // Temporarily disabled
import Discogs from 'disconnect';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Load environment variables
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory for root routes
app.use(express.static(path.join(__dirname, '../public')));

// Serve React app for /album-reviewer route
app.use('/album-reviewer', express.static(path.join(__dirname, '../frontend/build')));

// Handle React app routing for /album-reviewer
app.get('/album-reviewer/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Album schema
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
const Album = mongoose.model('Album', albumSchema);

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
  socialSentiment: Number,
  recentGrowth: Number,
  lastUpdated: Date
});
const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

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

authenticateSpotify();

const discogsClient = new Discogs.Client({
  consumerKey: process.env.DISCOGS_API_KEY,
  consumerSecret: process.env.DISCOGS_API_SECRET
});

// Get Discogs data for an album
async function getDiscogsData(title, artist) {
  try {
    console.log(`Searching Discogs for: ${title} by ${artist}`);

    const response = await discogsClient.database().search({
      release_title: title,
      artist: artist,
      type: 'release',
      per_page: 5
    });

    if (response.results && response.results.length > 0) {
      // Get the first result's details
      const releaseId = response.results[0].id;
      const releaseResponse = await discogsClient.database().getRelease(releaseId);

      const discogsData = {
        rating: releaseResponse.rating || null,
        votes: releaseResponse.rating_count || 0,
        releaseDate: releaseResponse.released || null,
        labels: releaseResponse.labels?.map(l => l.name) || [],
        formats: releaseResponse.formats?.map(f => f.name) || [],
        genres: releaseResponse.genres || [],
        styles: releaseResponse.styles || []
      };

      console.log(`Discogs data found: ${discogsData.rating}/5 (${discogsData.votes} votes)`);
      return discogsData;
    }

    console.log('No Discogs data found');
    return null;
  } catch (err) {
    console.error('Discogs API error:', err.message);
    return null;
  }
}

// Search Discogs by barcode
async function searchDiscogsByBarcode(barcode) {
  try {
    console.log(`Searching Discogs by barcode: ${barcode}`);

    // First try exact barcode search
    const response = await discogsClient.database().search({
      barcode: barcode,
      type: 'release',
      per_page: 10
    });

    console.log(`Discogs search returned ${response.results?.length || 0} results`);

    if (response.results && response.results.length > 0) {
      // Get the most relevant result (usually the first one)
      const release = response.results[0];
      const releaseId = release.id;

      // Get full release details
      const releaseResponse = await discogsClient.database().getRelease(releaseId);

      // Get marketplace data
      const marketplaceResponse = await discogsClient.marketplace().getPriceSuggestions(releaseId);

      // Calculate rarity based on number of items for sale and have
      const numForSale = releaseResponse.num_for_sale || 0;
      const lowestPrice = releaseResponse.lowest_price || null;

      // Rarity calculation: fewer items = rarer
      let rarity = 'Common';
      if (numForSale <= 1) rarity = 'Very Rare';
      else if (numForSale <= 5) rarity = 'Rare';
      else if (numForSale <= 20) rarity = 'Uncommon';
      else if (numForSale <= 50) rarity = 'Scarce';

      // Get suggested prices
      const priceSuggestions = marketplaceResponse || {};
      const medianPrice = priceSuggestions['Very Good Plus (VG+)']?.value ||
                         priceSuggestions['Very Good (VG)']?.value ||
                         priceSuggestions['Good Plus (G+)']?.value || null;

      const valueData = {
        title: releaseResponse.title,
        artist: releaseResponse.artists?.[0]?.name || 'Unknown Artist',
        releaseId: releaseId,
        imageUrl: releaseResponse.images?.[0]?.uri || null,
        releaseDate: releaseResponse.released,
        labels: releaseResponse.labels?.map(l => l.name) || [],
        formats: releaseResponse.formats?.map(f => f.name) || [],
        genres: releaseResponse.genres || [],
        styles: releaseResponse.styles || [],
        numForSale: numForSale,
        lowestPrice: lowestPrice,
        medianPrice: medianPrice,
        rarity: rarity,
        communityRating: releaseResponse.rating,
        communityVotes: releaseResponse.rating_count,
        marketplaceUrl: `https://www.discogs.com/sell/release/${releaseId}`,
        discogsUrl: `https://www.discogs.com/release/${releaseId}`
      };

      console.log(`Found vinyl: ${valueData.title} by ${valueData.artist} - ${rarity} (${numForSale} for sale)`);
      return valueData;
    }

    console.log('No results found for barcode');
    return null;
  } catch (err) {
    console.error('Discogs barcode search error:', err.message);
    return null;
  }
}

// Search Discogs by title and artist (more reliable than barcode)
async function searchDiscogsByTitleArtist(title, artist) {
  try {
    console.log(`Searching Discogs for "${title}" by ${artist}`);

    const response = await discogsClient.database().search({
      release_title: title,
      artist: artist,
      type: 'release',
      per_page: 5
    });

    if (response.results && response.results.length > 0) {
      // Get the first result's details
      const release = response.results[0];
      const releaseId = release.id;

      // Get full release details
      const releaseResponse = await discogsClient.database().getRelease(releaseId);

      // Get marketplace data
      const marketplaceResponse = await discogsClient.marketplace().getPriceSuggestions(releaseId);

      // Calculate rarity based on number of items for sale and have
      const numForSale = releaseResponse.num_for_sale || 0;
      const lowestPrice = releaseResponse.lowest_price || null;

      // Rarity calculation: fewer items = rarer
      let rarity = 'Common';
      if (numForSale <= 1) rarity = 'Very Rare';
      else if (numForSale <= 5) rarity = 'Rare';
      else if (numForSale <= 20) rarity = 'Uncommon';
      else if (numForSale <= 50) rarity = 'Scarce';

      // Get suggested prices
      const priceSuggestions = marketplaceResponse || {};
      const medianPrice = priceSuggestions['Very Good Plus (VG+)']?.value ||
                         priceSuggestions['Very Good (VG)']?.value ||
                         priceSuggestions['Good Plus (G+)']?.value || null;

      const valueData = {
        title: releaseResponse.title,
        artist: releaseResponse.artists?.[0]?.name || 'Unknown Artist',
        releaseId: releaseId,
        imageUrl: releaseResponse.images?.[0]?.uri || null,
        releaseDate: releaseResponse.released,
        labels: releaseResponse.labels?.map(l => l.name) || [],
        formats: releaseResponse.formats?.map(f => f.name) || [],
        genres: releaseResponse.genres || [],
        styles: releaseResponse.styles || [],
        numForSale: numForSale,
        lowestPrice: lowestPrice,
        medianPrice: medianPrice,
        rarity: rarity,
        communityRating: releaseResponse.rating,
        communityVotes: releaseResponse.rating_count,
        marketplaceUrl: `https://www.discogs.com/sell/release/${releaseId}`,
        discogsUrl: `https://www.discogs.com/release/${releaseId}`
      };

      console.log(`Found vinyl: ${valueData.title} by ${valueData.artist} - ${rarity} (${numForSale} for sale)`);
      return valueData;
    }

    console.log('No results found for title/artist search');
    return null;
  } catch (err) {
    console.error('Discogs title/artist search error:', err.message);
    return null;
  }
}

// Search for albums released on a specific date
async function searchAlbumsByReleaseDate(date) {
  try {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const response = await spotifyApi.searchAlbums(`year:${date.getFullYear()}`, {
      limit: 50,
      offset: 0
    });

    // Filter albums released exactly on the target date
    const targetAlbums = response.body.albums.items.filter(album => {
      const releaseDate = new Date(album.release_date);
      return releaseDate.toISOString().split('T')[0] === dateStr;
    });

    return targetAlbums;
  } catch (err) {
    console.error('Spotify search error:', err);
    return [];
  }
}

// Auto-discover albums released exactly 7 days ago
async function autoDiscoverAlbums() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`Searching for albums released on ${sevenDaysAgo.toISOString().split('T')[0]}`);

    const newReleases = await searchAlbumsByReleaseDate(sevenDaysAgo);

    for (const album of newReleases) {
      // Check if album already exists
      const existingAlbum = await Album.findOne({ albumId: album.id });
      if (!existingAlbum) {
        console.log(`Adding new album: ${album.name} by ${album.artists[0].name}`);

        const review = await reviewAlbum(album.id);
        const newAlbum = new Album({
          albumId: album.id,
          title: album.name,
          artist: album.artists[0].name,
          releaseDate: new Date(album.release_date),
          imageUrl: album.images[0]?.url,
          ...review
        });
        await newAlbum.save();
      }
    }

    console.log(`Auto-discovery complete. Found ${newReleases.length} albums.`);
  } catch (err) {
    console.error('Auto-discovery error:', err);
  }
}

// Sentiment analysis for X posts
const sentiment = new Sentiment();

// yt-dlp path (global installation on VPS)
const ytDlpPath = '/usr/local/bin/yt-dlp';

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Video to MP3 conversion endpoint
app.post('/api/convert-video', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const jobId = Date.now();
  const outputPath = path.join(tempDir, `${jobId}.mp3`);

  try {
    console.log(`Converting video: ${url}`);

    // Make sure yt-dlp is executable
    await new Promise((resolve, reject) => {
      exec(`chmod +x "${ytDlpPath}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // yt-dlp command for audio extraction
    const command = `"${ytDlpPath}" -x --audio-format mp3 --audio-quality 192K -o "${outputPath}" "${url}" --no-playlist`;

    await new Promise((resolve, reject) => {
      exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Conversion error:', error);
          reject(new Error('Failed to convert video'));
        } else {
          console.log('Conversion successful');
          resolve(stdout);
        }
      });
    });

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file not created');
    }

    // Get file info
    const stats = fs.statSync(outputPath);
    const fileName = `converted_audio_${jobId}.mp3`;

    // Set headers for download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream file and cleanup
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Cleanup temp file
      setTimeout(() => {
        try {
          fs.unlinkSync(outputPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Conversion failed:', error);

    // Cleanup on error
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (e) {}

    res.status(500).json({
      error: 'Conversion failed',
      details: error.message
    });
  }
});

// Media download endpoint (videos, images, audio)
app.post('/api/download-media', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Media URL is required' });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const jobId = Date.now();
  const outputTemplate = path.join(tempDir, `${jobId}.%(ext)s`);

  try {
    console.log(`Downloading media: ${url}`);

    // Make sure yt-dlp is executable
    await new Promise((resolve, reject) => {
      exec(`chmod +x "${ytDlpPath}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // yt-dlp command for direct download
    const command = `"${ytDlpPath}" -o "${outputTemplate}" "${url}" --no-playlist --max-filesize 100M --no-check-certificates`;

    await new Promise((resolve, reject) => {
      exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Download error:', error);
          reject(new Error('Failed to download media'));
        } else {
          console.log('Download successful');
          resolve(stdout);
        }
      });
    });

    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const downloadedFile = files.find(f => f.startsWith(`${jobId}.`));

    if (!downloadedFile) {
      throw new Error('Downloaded file not found');
    }

    const filePath = path.join(tempDir, downloadedFile);
    const stats = fs.statSync(filePath);

    // Get appropriate content type
    const ext = path.extname(downloadedFile).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadedFile}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream file and cleanup
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Download failed:', error);

    // Cleanup any temp files
    try {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        if (file.startsWith(`${jobId}.`)) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    } catch (e) {}

    res.status(500).json({
      error: 'Download failed',
      details: error.message
    });
  }
});

// Discogs search by title/artist endpoint (COMMENTED OUT FOR NOW)
/*
app.get('/api/discogs/search', async (req, res) => {
  try {
    const { title, artist } = req.query;

    if (!title || !artist) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Both title and artist parameters are required'
      });
    }

    console.log(`🔍 API request: Searching Discogs for "${title}" by ${artist}`);

    const valueData = await searchDiscogsByTitleArtist(title, artist);

    if (!valueData) {
      return res.status(404).json({
        error: 'Vinyl record not found',
        message: `No Discogs data found for "${title}" by ${artist}`
      });
    }

    res.json({
      success: true,
      data: valueData
    });

  } catch (error) {
    console.error('Discogs search API error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Discogs barcode search endpoint (kept for compatibility)
app.get('/api/discogs/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    console.log(`🔍 API request: Searching Discogs by barcode ${barcode}`);

    const valueData = await searchDiscogsByBarcode(barcode);

    if (!valueData) {
      return res.status(404).json({
        error: 'Vinyl record not found',
        message: `No Discogs data found for barcode: ${barcode}`
      });
    }

    res.json({
      success: true,
      data: valueData
    });

  } catch (error) {
    console.error('Discogs barcode API error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});
*/

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder functions for real implementations
async function scrapePitchfork(title, artist) {
  try {
    const url = `https://pitchfork.com/search/?query=${encodeURIComponent(title + ' ' + artist)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    const $ = cheerio.load(response.data);
    const reviewLink = $('.result-item a').first().attr('href');
    if (reviewLink) {
      const reviewUrl = `https://pitchfork.com${reviewLink}`;
      const reviewResponse = await axios.get(reviewUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000 // 10 second timeout
      });
      const $$ = cheerio.load(reviewResponse.data);
      const scoreText = $$('.score-box .score').text().trim();
      const score = parseFloat(scoreText);
      return isNaN(score) ? null : score;
    }
  } catch (err) {
    console.error('Pitchfork scrape error:', err.message);
  }
  return null;
}

async function getFantanoReview(title, artist) {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    // Add timeout wrapper for YouTube API calls
    const searchWithTimeout = async () => {
      return Promise.race([
        youtube.search.list({
          part: 'snippet',
          q: `${title} ${artist} theneedledrop`,
          type: 'video',
          maxResults: 5
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('YouTube search timeout')), 10000)
        )
      ]);
    };

    const response = await searchWithTimeout();

    for (const item of response.data.items) {
      const videoTitle = item.snippet.title.toLowerCase();
      if (videoTitle.includes('album review') || videoTitle.includes('review')) {
        const videoId = item.id.videoId;

        const videoWithTimeout = async () => {
          return Promise.race([
            youtube.videos.list({
              part: 'snippet',
              id: videoId
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('YouTube video timeout')), 10000)
            )
          ]);
        };

        const videoResponse = await videoWithTimeout();
        const description = videoResponse.data.items[0].snippet.description;
        const scoreMatch = description.match(/(\d+(\.\d+)?)\/10/);
        if (scoreMatch) {
          return parseFloat(scoreMatch[1]);
        }
      }
    }
  } catch (err) {
    console.error('Fantano error:', err.message);
  }
  return null;
}

async function getBillboardRank(title, artist) {
  // Note: Billboard does not have a free public API. For real implementation, consider paid services like Chartmetric or Billboard API.
  // As a placeholder, using a mock value. Replace with real integration.
  return Math.floor(Math.random() * 200) + 1; // Mock rank 1-200
}

// Fetch and review album with comprehensive 7-API data
async function reviewAlbum(albumId) {
  try {
    console.log(`🔍 Reviewing album with 7-API data: ${albumId}`);

    // First, try to get album from Spotify
    let album;
    try {
      album = await spotifyApi.getAlbum(albumId);
      console.log(`✅ Found album: ${album.body.name} by ${album.body.artists[0].name}`);
    } catch (spotifyErr) {
      console.error('❌ Spotify API error:', spotifyErr.message);
      return { status: 'error', message: `Invalid album ID or Spotify API error: ${spotifyErr.message}` };
    }

    const releaseDate = new Date(album.body.release_date);
    const today = new Date();
    const daysSinceRelease = Math.floor((today - releaseDate) / (1000 * 60 * 60 * 24));

    if (daysSinceRelease < 7) {
      return {
        status: 'enqueued',
        readyBy: new Date(releaseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    const artistName = album.body.artists[0].name;
    const albumTitle = album.body.name;

    console.log(`🎵 Gathering data from 7 APIs for: ${albumTitle} by ${artistName}`);

    // 1. SPOTIFY DATA (18% weight)
    const spotifyPopularity = album.body.popularity;
    const spotifyStreams = Math.round(spotifyPopularity / 10); // Estimate streams from popularity
    console.log(`   Spotify: Popularity ${spotifyPopularity}, Estimated streams: ${spotifyStreams}`);

    // 2. DISCOGS DATA (15% weight)
    const discogsData = await getDiscogsData(albumTitle, artistName);
    const discogsRating = discogsData?.rating ? (discogsData.rating / 5) * 10 : 7.0;
    const discogsVotes = discogsData?.votes || 0;
    console.log(`   Discogs: Rating ${discogsRating}/10 (${discogsVotes} votes)`);

    // 3. PITCHFORK SCORE (12% weight)
    const pitchforkScore = await scrapePitchfork(albumTitle, artistName) || 6.0; // Lower default
    console.log(`   Pitchfork: ${pitchforkScore}/10`);

    // 4. LAST.FM DATA (12% weight)
    let lastFmStats = 5.0; // Lower default when no data
    try {
      const lastFmInfo = await fetchLastFmArtistInfo(artistName);
      if (lastFmInfo?.stats) {
        // Convert Last.fm listeners/playcount to a 0-10 score
        const listenersScore = Math.min(10, lastFmInfo.stats.listeners / 1000000); // 1M listeners = 10 points
        const playcountScore = Math.min(10, lastFmInfo.stats.playcount / 100000000); // 100M plays = 10 points
        lastFmStats = (listenersScore + playcountScore) / 2;
        console.log(`   Last.fm: ${lastFmInfo.stats.listeners.toLocaleString()} listeners, ${lastFmInfo.stats.playcount.toLocaleString()} plays`);
      } else {
        console.log(`   Last.fm: No data available, using conservative default`);
      }
    } catch (lastFmErr) {
      console.log(`   Last.fm: API error, using conservative default`);
    }

    // 5. MUSICBRAINZ VERIFICATION (12% weight)
    let musicBrainzScore = 5.0; // Lower default when no verification
    try {
      const mbArtists = await searchMusicBrainzArtist(artistName);
      if (mbArtists.length > 0) {
        const mbReleases = await searchMusicBrainzRelease(albumTitle, artistName);
        // Higher score if we find matching releases in MusicBrainz
        musicBrainzScore = mbReleases.length > 0 ? 8.0 : 6.0; // Lower scores overall
        console.log(`   MusicBrainz: Found ${mbReleases.length} matching releases`);
      } else {
        console.log(`   MusicBrainz: No artist data found`);
      }
    } catch (mbErr) {
      console.log(`   MusicBrainz: API error, using conservative default`);
    }

    // 6. DEEZER CHART DATA (11% weight)
    let deezerScore = 5.0; // Lower default when no data
    try {
      const deezerArtists = await searchDeezerArtist(artistName);
      if (deezerArtists.length > 0) {
        const topArtist = deezerArtists[0];
        // Use Deezer fan count as popularity indicator
        deezerScore = Math.min(10, Math.max(3, topArtist.nb_fan / 100000)); // 100K fans = 10 points, lower minimum
        console.log(`   Deezer: ${topArtist.nb_fan.toLocaleString()} fans`);
      } else {
        console.log(`   Deezer: No artist data found`);
      }
    } catch (deezerErr) {
      console.log(`   Deezer: API error, using conservative default`);
    }

    // 7. NEWS SENTIMENT (10% weight)
    let newsSentiment = 5.0; // Lower default when no news
    try {
      // Search for recent news about this artist/album
      const newsArticles = await NewsArticle.find({
        $or: [
          { title: { $regex: artistName, $options: 'i' } },
          { content: { $regex: artistName, $options: 'i' } }
        ],
        publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).limit(5);

      if (newsArticles.length > 0) {
        // Calculate average sentiment from recent news
        const avgSentiment = newsArticles.reduce((sum, article) => sum + (article.sentiment || 0), 0) / newsArticles.length;
        newsSentiment = Math.max(1, Math.min(10, 6 + (avgSentiment * 2))); // Convert -1/+1 to roughly 4-8, more conservative
        console.log(`   News: ${newsArticles.length} articles, avg sentiment: ${avgSentiment.toFixed(2)}`);
      } else {
        console.log(`   News: No recent articles found`);
      }
    } catch (newsErr) {
      console.log(`   News: Database error, using conservative default`);
    }

    // Calculate comprehensive score with 7-API data
    const score = (
      0.18 * spotifyStreams +      // Spotify streaming data
      0.15 * discogsRating +       // Discogs critic ratings
      0.12 * pitchforkScore +      // Pitchfork professional reviews
      0.12 * lastFmStats +         // Last.fm global listening stats
      0.12 * musicBrainzScore +    // MusicBrainz metadata verification
      0.11 * deezerScore +         // Deezer European charts
      0.10 * newsSentiment         // News sentiment analysis
    ).toFixed(1);

    console.log(`🎯 Final score: ${score}/10 (from 7 APIs)`);

    const strengths = [];
    const weaknesses = [];

    // Generate highly unique, album-specific strengths and weaknesses

    // Create unique identifiers for this album
    const albumHash = (albumTitle + artistName).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    // STRENGTHS - Generate unique text based on actual data and album identity
    const strengthTemplates = [
      `${albumTitle} delivers exceptional sonic clarity with ${spotifyStreams >= 7 ? 'impressive' : 'solid'} streaming momentum`,
      `${artistName}'s masterful production on ${albumTitle} creates an immersive listening experience`,
      `The lyrical depth in ${albumTitle} showcases ${artistName}'s evolved storytelling abilities`,
      `${albumTitle} demonstrates ${artistName}'s innovative approach to ${albumTitle.toLowerCase().includes('hip') || albumTitle.toLowerCase().includes('rap') ? 'lyrical delivery' : 'melodic composition'}`,
      `Critical acclaim for ${albumTitle} reflects ${artistName}'s growing artistic maturity`,
      `${albumTitle} successfully balances commercial appeal with artistic integrity`,
      `The cohesive vision of ${albumTitle} establishes ${artistName} as a distinctive voice in music`,
      `${artistName}'s performance on ${albumTitle} elevates the project's overall impact`,
      `${albumTitle} features innovative sound design that pushes genre boundaries`,
      `The thematic consistency of ${albumTitle} creates a compelling narrative arc`
    ];

    // WEAKNESSES - Generate unique text based on data gaps and album characteristics
    const weaknessTemplates = [
      `${albumTitle} occasionally lacks the consistency that defines ${artistName}'s strongest work`,
      `Some production choices on ${albumTitle} may not resonate with all listeners`,
      `${albumTitle}'s ambitious scope sometimes overshadows individual track quality`,
      `The pacing of ${albumTitle} could benefit from more dynamic transitions`,
      `${artistName}'s experimental elements in ${albumTitle} may alienate casual fans`,
      `${albumTitle} requires multiple listens to fully appreciate its depth`,
      `Certain tracks on ${albumTitle} don't match the album's overall artistic vision`,
      `The mixing of ${albumTitle} occasionally prioritizes atmosphere over clarity`,
      `${albumTitle}'s themes may be too niche for mainstream audiences`,
      `Some lyrical content in ${albumTitle} demands significant listener investment`
    ];

    // Add data-driven strengths
    if (spotifyStreams >= 8) {
      strengths.push(`${albumTitle} achieves remarkable streaming success with ${spotifyStreams}/10 performance metrics`);
    }
    if (discogsRating >= 8.5) {
      strengths.push(`${albumTitle} earns prestigious critical recognition (${discogsRating}/10 Discogs rating)`);
    }
    if (pitchforkScore >= 8.0) {
      strengths.push(`${albumTitle} receives strong professional validation (${pitchforkScore}/10 Pitchfork score)`);
    }
    if (lastFmStats >= 8.0) {
      strengths.push(`${albumTitle} builds substantial global fan engagement (${Math.round(lastFmStats * 100000)}+ Last.fm listeners)`);
    }
    if (deezerScore >= 8.0) {
      strengths.push(`${albumTitle} demonstrates European market strength (${Math.round(deezerScore * 10000)}+ Deezer fans)`);
    }

    // Add data-driven weaknesses
    if (spotifyStreams <= 5) {
      weaknesses.push(`${albumTitle} shows limited streaming traction (${spotifyStreams}/10 performance)`);
    }
    if (discogsRating <= 6.0) {
      weaknesses.push(`${albumTitle} receives moderate critical response (${discogsRating}/10 Discogs rating)`);
    }
    if (pitchforkScore <= 6.5) {
      weaknesses.push(`${albumTitle} gets qualified professional feedback (${pitchforkScore}/10 Pitchfork score)`);
    }
    if (lastFmStats <= 6.0) {
      weaknesses.push(`${albumTitle} has developing global fan presence (${Math.round(lastFmStats * 100000)} Last.fm listeners)`);
    }

    // Generate unique strengths using album hash for deterministic but varied results
    while (strengths.length < 4) {
      const templateIndex = Math.abs(albumHash + strengths.length) % strengthTemplates.length;
      const template = strengthTemplates[templateIndex];
      if (!strengths.includes(template)) {
        strengths.push(template);
      }
    }

    // Generate unique weaknesses using album hash
    while (weaknesses.length < 4) {
      const templateIndex = Math.abs(albumHash + weaknesses.length + 100) % weaknessTemplates.length;
      const template = weaknessTemplates[templateIndex];
      if (!weaknesses.includes(template)) {
        weaknesses.push(template);
      }
    }

    // Ensure maximum of 4 points each, prioritizing data-driven insights
    if (strengths.length > 4) {
      // Keep data-driven strengths first, then unique templates
      const dataDriven = strengths.filter(s => s.includes('(') || s.includes('performance') || s.includes('recognition'));
      const templates = strengths.filter(s => !s.includes('(') && !s.includes('performance') && !s.includes('recognition'));
      strengths = [...dataDriven.slice(0, 2), ...templates.slice(0, 2)];
    }

    if (weaknesses.length > 4) {
      // Keep data-driven weaknesses first, then unique templates
      const dataDriven = weaknesses.filter(w => w.includes('(') || w.includes('performance') || w.includes('response'));
      const templates = weaknesses.filter(w => !w.includes('(') && !w.includes('performance') && !w.includes('response'));
      weaknesses = [...dataDriven.slice(0, 2), ...templates.slice(0, 2)];
    }

    console.log(`Album review complete: ${score}/10`);
    return { status: 'reviewed', score: parseFloat(score), strengths, weaknesses, imageUrl: album.body.images[0]?.url };
  } catch (err) {
    console.error('Review error:', err);
    return { status: 'error', message: err.message || 'Unknown error occurred during album review' };
  }
}

// Update featured albums rankings
async function updateFeaturedAlbums() {
  try {
    // Get recently reviewed albums (reviewed in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAlbums = await Album.find({
      status: 'reviewed',
      updatedAt: { $gte: thirtyDaysAgo }
    }).sort({ score: -1 }).limit(10);

    // Reset all featured flags
    await Album.updateMany({}, { featured: false, ranking: null });

    // Set featured albums with rankings
    for (let i = 0; i < recentAlbums.length; i++) {
      await Album.findOneAndUpdate(
        { albumId: recentAlbums[i].albumId },
        { featured: true, ranking: i + 1 }
      );
    }

    console.log(`Updated featured albums rankings. ${recentAlbums.length} albums featured.`);
  } catch (err) {
    console.error('Featured albums update error:', err);
  }
}

// Cron job: Daily review check and auto-discovery
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily album reviews...');
  const enqueuedAlbums = await Album.find({ status: 'enqueued' });
  for (const album of enqueuedAlbums) {
    const review = await reviewAlbum(album.albumId);
    if (review.status === 'reviewed') {
      await Album.findOneAndUpdate(
        { albumId: album.albumId },
        { status: 'reviewed', score: review.score, strengths: review.strengths, weaknesses: review.weaknesses, imageUrl: review.imageUrl, readyBy: undefined }
      );
    }
  }

  // Auto-discover new albums
  await autoDiscoverAlbums();

  // Update featured albums
  await updateFeaturedAlbums();
});

// Album endpoints
app.get('/api/albums', async (req, res) => {
  const albums = await Album.find();
  res.json(albums);
});

app.get('/api/album/:id', async (req, res) => {
  let album = await Album.findOne({ albumId: req.params.id });
  if (!album) {
    const albumData = await spotifyApi.getAlbum(req.params.id);
    const review = await reviewAlbum(req.params.id);
    album = new Album({
      albumId: req.params.id,
      title: albumData.body.name,
      artist: albumData.body.artists[0].name,
      releaseDate: new Date(albumData.body.release_date),
      imageUrl: albumData.body.images[0]?.url,
      ...review
    });
    await album.save();
  } else if (album.status === 'enqueued') {
    const review = await reviewAlbum(req.params.id);
    if (review.status === 'reviewed') {
      await Album.findOneAndUpdate({ albumId: req.params.id }, { ...review });
      album = { ...album.toObject(), ...review };
    }
  }
  res.json(album);
});

app.post('/api/album', async (req, res) => {
  const { albumId } = req.body;

  // Check if album already exists
  const existingAlbum = await Album.findOne({ albumId });
  if (existingAlbum) {
    // Return existing album if already rated
    if (existingAlbum.status === 'reviewed') {
      return res.json(existingAlbum);
    }
    // If enqueued, return current status
    return res.json(existingAlbum);
  }

  // Rate new album
  const albumData = await spotifyApi.getAlbum(albumId);
  const review = await reviewAlbum(albumId);
  const newAlbum = new Album({
    albumId,
    title: albumData.body.name,
    artist: albumData.body.artists[0].name,
    releaseDate: new Date(albumData.body.release_date),
    imageUrl: albumData.body.images[0]?.url,
    ...review
  });
  await newAlbum.save();
  res.json(newAlbum);
});

// Featured albums endpoint
app.get('/api/featured-albums', async (req, res) => {
  const featuredAlbums = await Album.find({ featured: true }).sort({ ranking: 1 });
  res.json(featuredAlbums);
});

// Album of the Year contenders endpoint
app.get('/api/aoty-contenders', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    console.log(`Fetching AOTY contenders for ${currentYear}`);
    console.log(`Date range: ${startOfYear.toISOString()} to ${endOfYear.toISOString()}`);

    // Get unique albums by albumId (no duplicates)
    const contenders = await Album.find({
      status: 'reviewed',
      releaseDate: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ score: -1 }).limit(10);

    console.log(`Found ${contenders.length} AOTY contenders`);
    if (contenders.length > 0) {
      console.log('Sample contender:', {
        title: contenders[0].title,
        artist: contenders[0].artist,
        score: contenders[0].score,
        releaseDate: contenders[0].releaseDate
      });
    }

    res.json(contenders);
  } catch (err) {
    console.error('AOTY contenders error:', err);
    res.status(500).json({ error: 'Failed to fetch album of the year contenders' });
  }
});

// All 2025 albums endpoint
app.get('/api/all-2025-albums', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // Group by albumId and get the highest rated version for each album (no duplicates)
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

    // Format the results
    const allAlbums = groupedResults.map(result => ({
      ...result.album,
      score: result.maxScore
    }));

    res.json(allAlbums);
  } catch (err) {
    console.error('All 2025 albums error:', err);
    res.status(500).json({ error: 'Failed to fetch all 2025 albums' });
  }
});

// New releases endpoint
app.get('/api/new-releases', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'month'; // 'week', 'month', 'year'

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
});

// All-time rankings endpoint
app.get('/api/all-time-rankings', async (req, res) => {
  try {
    // Get all reviewed albums (no limit for now to show all)
    const allAlbums = await Album.find({ status: 'reviewed' })
      .sort({ score: -1 })
      .limit(500); // Show top 500 instead of 100

    // Format the results
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

    console.log(`Returning ${allTimeRankings.length} albums for all-time rankings`);
    res.json(allTimeRankings);
  } catch (err) {
    console.error('All-time rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch all-time rankings' });
  }
});



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

// X/Twitter sharing endpoint (temporarily disabled)
app.post('/api/share/:albumId', async (req, res) => {
  try {
    const albumId = req.params.albumId;

    // Get album data
    const album = await Album.findOne({ albumId });
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // For now, just return success without actually posting to Twitter
    // TODO: Re-enable when Twitter API is properly configured
    console.log(`Would share album: ${album.title} by ${album.artist} (${album.score}/10)`);

    res.json({
      success: true,
      message: 'Sharing temporarily disabled - Twitter API needs configuration',
      album: {
        title: album.title,
        artist: album.artist,
        score: album.score
      }
    });

  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({
      error: 'Failed to share',
      details: error.message
    });
  }
});

// Analyze underground artist
async function analyzeUndergroundArtist(artistId) {
  try {
    console.log(`Analyzing underground artist: ${artistId}`);

    // Get artist data from Spotify
    const artistData = await spotifyApi.getArtist(artistId);
    const artist = artistData.body;

    // Get top tracks for monthly listeners estimate
    const topTracksData = await spotifyApi.getArtistTopTracks(artistId, 'US');
    const topTracks = topTracksData.body.tracks;

    // Estimate monthly listeners (rough calculation)
    const monthlyListeners = topTracks.reduce((total, track) => {
      return total + (track.popularity * 10000); // Rough estimate
    }, 0) / topTracks.length;

    // Get related artists for network analysis
    const relatedData = await spotifyApi.getArtistRelatedArtists(artistId);
    const relatedArtists = relatedData.body.artists.slice(0, 5);

    // Mock social sentiment analysis (would need real social media API)
    const socialSentiment = Math.random() * 2 - 1; // -1 to 1 scale

    // Calculate recent growth (mock for now)
    const recentGrowth = Math.random() * 50 - 25; // -25% to +25%

    // Underground scoring algorithm
    // Weight factors for underground artists
    const popularityWeight = Math.max(0, (100 - artist.popularity) / 100); // Lower popularity = more underground
    const followersWeight = Math.min(1, artist.followers.total / 1000000); // Scale followers
    const monthlyListenersWeight = Math.min(1, monthlyListeners / 10000000); // Scale monthly listeners
    const networkWeight = relatedArtists.filter(a => a.popularity < 50).length / 5; // Underground network
    const sentimentWeight = (socialSentiment + 1) / 2; // Convert -1/+1 to 0/1
    const growthWeight = Math.max(0, (recentGrowth + 25) / 50); // Convert -25/+25 to 0/1

    const score = (
      popularityWeight * 0.25 +      // 25% - Underground appeal
      followersWeight * 0.20 +       // 20% - Dedicated fanbase
      monthlyListenersWeight * 0.20 + // 20% - Streaming presence
      networkWeight * 0.15 +         // 15% - Underground network
      sentimentWeight * 0.10 +       // 10% - Social buzz
      growthWeight * 0.10            // 10% - Recent momentum
    ) * 100; // Scale to 0-100

    // Generate strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    if (artist.popularity < 30) {
      strengths.push('Authentic underground credibility');
      strengths.push('Dedicated niche following');
    }
    if (artist.followers.total > 100000) {
      strengths.push('Growing fanbase with potential');
      strengths.push('Cult following developing');
    }
    if (monthlyListeners > 1000000) {
      strengths.push('Significant streaming presence');
      strengths.push('Breaking through to wider audience');
    }
    if (networkWeight > 0.6) {
      strengths.push('Strong underground network connections');
      strengths.push('Part of emerging music scene');
    }
    if (socialSentiment > 0.2) {
      strengths.push('Positive social media buzz');
      strengths.push('Growing online presence');
    }

    if (artist.popularity > 60) {
      weaknesses.push('Risk of losing underground appeal');
      weaknesses.push('May be transitioning to mainstream');
    }
    if (artist.followers.total < 50000) {
      weaknesses.push('Limited fanbase size');
      weaknesses.push('Struggling for visibility');
    }
    if (monthlyListeners < 500000) {
      weaknesses.push('Low streaming numbers');
      weaknesses.push('Limited commercial viability');
    }
    if (networkWeight < 0.3) {
      weaknesses.push('Weak underground connections');
      weaknesses.push('Isolated from music scenes');
    }
    if (socialSentiment < -0.2) {
      weaknesses.push('Negative social sentiment');
      weaknesses.push('Controversial or divisive reputation');
    }

    // Ensure minimum analysis points
    const defaultStrengths = [
      'Unique artistic vision',
      'Innovative approach to music',
      'Authentic expression',
      'Growing potential',
      'Scene influence'
    ];

    const defaultWeaknesses = [
      'Limited mainstream appeal',
      'Smaller audience reach',
      'Resource constraints',
      'Visibility challenges',
      'Commercial limitations'
    ];

    while (strengths.length < 3) {
      const randomStrength = defaultStrengths[Math.floor(Math.random() * defaultStrengths.length)];
      if (!strengths.includes(randomStrength)) {
        strengths.push(randomStrength);
      }
    }

    while (weaknesses.length < 3) {
      const randomWeakness = defaultWeaknesses[Math.floor(Math.random() * defaultWeaknesses.length)];
      if (!weaknesses.includes(randomWeakness)) {
        weaknesses.push(randomWeakness);
      }
    }

    // Limit to 4 points each
    strengths.splice(4);
    weaknesses.splice(4);

    return {
      artistId,
      name: artist.name,
      genres: artist.genres,
      spotifyPopularity: artist.popularity,
      monthlyListeners: Math.round(monthlyListeners),
      followers: artist.followers.total,
      imageUrl: artist.images[0]?.url,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      strengths,
      weaknesses,
      socialSentiment: Math.round(socialSentiment * 100) / 100,
      recentGrowth: Math.round(recentGrowth * 100) / 100,
      lastUpdated: new Date()
    };

  } catch (err) {
    console.error('Underground artist analysis error:', err);
    return null;
  }
}

// Update underground rankings - now populates database if empty
async function updateUndergroundRankings() {
  try {
    console.log('🔄 Updating underground artist rankings...');

    // Check if database is empty
    const existingCount = await UndergroundArtist.countDocuments();
    console.log(`📊 Found ${existingCount} existing underground artists`);

    // If database is empty, populate with known good underground artists
    if (existingCount === 0) {
      console.log('📝 Database is empty, populating with verified underground artists...');

      // Simplified approach: Use artist names and search for them dynamically
      const artistNames = [
        'Bladee', 'Yung Lean', 'SOPHIE', 'Shygirl', 'Big Thief',
        'Squirrel Flower', 'Hand Habits', 'Illuminati Hotties', 'Speedy Ortiz',
        'Mannequin Pussy', 'Diet Cig', 'Bully', 'Hop Along', 'Adult Mom',
        'Charly Bliss', 'Remember Sports', 'Feng Suave', 'Talinwya'
      ];

      console.log(`🎯 Processing ${artistNames.length} underground artists by name...`);

    for (const artistName of artistNames) {
      try {
        console.log(`🔍 Searching for underground artist: ${artistName}...`);

        // Search for artist on Spotify by name
        const searchResults = await spotifyApi.searchArtists(artistName, { limit: 1 });
        const artist = searchResults.body.artists.items[0];

        if (artist) {
          console.log(`✅ Found ${artist.name} on Spotify (ID: ${artist.id})`);

          // Create basic artist data
          const basicData = {
            artistId: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            spotifyPopularity: artist.popularity,
            followers: artist.followers.total,
            imageUrl: artist.images?.[0]?.url || null,
            monthlyListeners: Math.round(artist.popularity * 10000), // Rough estimate
            score: Math.round((artist.popularity / 100) * 50 + 25), // Basic score
            strengths: ['Underground credibility', 'Unique artistic vision'],
            weaknesses: ['Limited mainstream appeal', 'Niche audience'],
            socialSentiment: 0,
            recentGrowth: 0,
            lastUpdated: new Date()
          };

          await UndergroundArtist.findOneAndUpdate(
            { artistId: artist.id },
            basicData,
            { upsert: true, new: true }
          );

          console.log(`💾 Added ${artist.name} to database`);
        } else {
          console.log(`❌ No Spotify data found for ${artistName}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`❌ Error processing ${artistName}:`, err.message);
      }
    }
    }

    // Now update existing artists with fresh data
    console.log('🔄 Updating existing artists with fresh API data...');

    const existingArtists = await UndergroundArtist.find();
    console.log(`📊 Updating ${existingArtists.length} existing artists...`);

    for (const artist of existingArtists) {
      try {
        console.log(`🔄 Updating ${artist.name}...`);

        // Get fresh data from all APIs
        let spotifyData = null;
        try {
          const artistData = await spotifyApi.getArtist(artist.artistId);
          const spotifyArtist = artistData.body;

          const topTracksData = await spotifyApi.getArtistTopTracks(artist.artistId, 'US');
          const topTracks = topTracksData.body.tracks;

          const monthlyListeners = topTracks.reduce((total, track) => {
            return total + (track.popularity * 10000);
          }, 0) / topTracks.length;

          spotifyData = {
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            genres: spotifyArtist.genres,
            imageUrl: spotifyArtist.images?.[0]?.url || artist.imageUrl,
            monthlyListeners: Math.round(monthlyListeners)
          };
        } catch (spotifyErr) {
          console.warn(`   Spotify data unavailable for ${artist.name}`);
        }

        // Update artist with fresh data
        const updateData = {
          ...artist.toObject(),
          ...(spotifyData && {
            spotifyPopularity: spotifyData.popularity,
            monthlyListeners: spotifyData.monthlyListeners,
            followers: spotifyData.followers,
            imageUrl: spotifyData.imageUrl,
            genres: spotifyData.genres
          }),
          lastUpdated: new Date()
        };

        await UndergroundArtist.findOneAndUpdate(
          { artistId: artist.artistId },
          updateData,
          { new: true }
        );

        console.log(`✅ Updated ${artist.name}`);

      } catch (updateErr) {
        console.error(`❌ Error updating ${artist.name}:`, updateErr.message);
      }
    }

    // Sort all artists by monthly listeners and assign rankings
    const allArtists = await UndergroundArtist.find();
    allArtists.sort((a, b) => (b.monthlyListeners || 0) - (a.monthlyListeners || 0));

    for (let i = 0; i < allArtists.length; i++) {
      await UndergroundArtist.findOneAndUpdate(
        { artistId: allArtists[i].artistId },
        { ranking: i + 1 },
        { new: true }
      );
    }

    const finalCount = await UndergroundArtist.countDocuments();
    console.log(`✅ Underground rankings update complete: ${finalCount} artists in database`);

  } catch (err) {
    console.error('❌ Underground rankings update error:', err);
  }
}

// Underground rankings endpoint - with fresh API data and underground filter
app.get('/api/underground-rankings', async (req, res) => {
  try {
    console.log('🔍 Fetching underground rankings with fresh API data...');

    // Get all artists first, then apply underground filter
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

    // Sort by monthly listeners and limit to top 50 underground artists
    undergroundArtists.sort((a, b) => (b.monthlyListeners || 0) - (a.monthlyListeners || 0));
    const topUnderground = undergroundArtists.slice(0, 50);

    // Update each artist with fresh data from all APIs
    const updatedArtists = await Promise.all(undergroundArtists.map(async (artist, index) => {
      try {
        console.log(`📊 Updating ${artist.name} with fresh API data...`);

        // 1. SPOTIFY DATA - Fresh artist info
        let spotifyData = null;
        try {
          const artistData = await spotifyApi.getArtist(artist.artistId);
          const spotifyArtist = artistData.body;

          // Get top tracks for monthly listeners
          const topTracksData = await spotifyApi.getArtistTopTracks(artist.artistId, 'US');
          const topTracks = topTracksData.body.tracks;

          // Estimate monthly listeners
          const monthlyListeners = topTracks.reduce((total, track) => {
            return total + (track.popularity * 10000);
          }, 0) / topTracks.length;

          spotifyData = {
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            genres: spotifyArtist.genres,
            imageUrl: spotifyArtist.images?.[0]?.url || artist.imageUrl,
            monthlyListeners: Math.round(monthlyListeners)
          };

          console.log(`   Spotify: ${spotifyData.followers.toLocaleString()} followers, ${spotifyData.monthlyListeners.toLocaleString()} monthly listeners`);
        } catch (spotifyErr) {
          console.warn(`   Spotify data unavailable for ${artist.name}`);
        }

        // 2. LAST.FM DATA - Listening statistics
        let lastFmData = null;
        try {
          const lastFmInfo = await fetchLastFmArtistInfo(artist.name);
          if (lastFmInfo?.stats) {
            lastFmData = {
              listeners: lastFmInfo.stats.listeners,
              playcount: lastFmInfo.stats.playcount,
              tags: lastFmInfo.tags,
              bio: lastFmInfo.bio
            };
            console.log(`   Last.fm: ${lastFmInfo.stats.listeners.toLocaleString()} listeners`);
          }
        } catch (lastFmErr) {
          console.warn(`   Last.fm data unavailable for ${artist.name}`);
        }

        // 3. DEEZER DATA - European popularity
        let deezerData = null;
        try {
          const deezerArtists = await searchDeezerArtist(artist.name);
          if (deezerArtists.length > 0) {
            const topArtist = deezerArtists[0];
            deezerData = {
              fans: topArtist.nb_fan,
              link: topArtist.link
            };
            console.log(`   Deezer: ${topArtist.nb_fan.toLocaleString()} fans`);
          }
        } catch (deezerErr) {
          console.warn(`   Deezer data unavailable for ${artist.name}`);
        }

        // Update artist with fresh data, but preserve manually set monthly listeners
        const updatedArtist = {
          ...artist.toObject(),
          // Use real Spotify data if available
          spotifyPopularity: spotifyData?.popularity || artist.spotifyPopularity,
          // Preserve manually set monthly listeners - don't override with API data
          monthlyListeners: artist.monthlyListeners, // Keep the manually set value
          followers: spotifyData?.followers || artist.followers,
          imageUrl: spotifyData?.imageUrl || artist.imageUrl,
          genres: spotifyData?.genres || artist.genres,
          // Add new API data
          lastFmListeners: lastFmData?.listeners || 0,
          lastFmPlaycount: lastFmData?.playcount || 0,
          deezerFans: deezerData?.fans || 0,
          lastUpdated: new Date()
        };

        // Update in database
        await UndergroundArtist.findOneAndUpdate(
          { artistId: artist.artistId },
          updatedArtist,
          { new: true }
        );

        console.log(`✅ Updated ${artist.name} with fresh API data`);
        return updatedArtist;

      } catch (updateErr) {
        console.error(`❌ Error updating ${artist.name}:`, updateErr.message);
        return artist; // Return original data if update fails
      }
    }));

    // Sort by updated monthly listeners
    updatedArtists.sort((a, b) => (b.monthlyListeners || 0) - (a.monthlyListeners || 0));

    console.log(`🎯 Returned ${updatedArtists.length} underground artists with fresh API data`);
    res.json(updatedArtists);
  } catch (err) {
    console.error('Underground rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch underground rankings' });
  }
});

// Update underground rankings endpoint
app.post('/api/update-underground-rankings', async (req, res) => {
  try {
    await updateUndergroundRankings();
    res.json({ success: true, message: 'Underground rankings updated' });
  } catch (err) {
    console.error('Update underground rankings error:', err);
    res.status(500).json({ error: 'Failed to update underground rankings' });
  }
});

// Update all albums to reviewed status
app.post('/api/update-all-reviewed', async (req, res) => {
  try {
    console.log('Updating all albums to reviewed status...');

    const result = await Album.updateMany(
      { status: { $ne: 'reviewed' } },
      { status: 'reviewed' }
    );

    console.log(`Updated ${result.modifiedCount} albums to reviewed status`);

    const totalReviewed = await Album.countDocuments({ status: 'reviewed' });
    console.log(`Total reviewed albums: ${totalReviewed}`);

    res.json({
      success: true,
      updated: result.modifiedCount,
      totalReviewed,
      message: `Updated ${result.modifiedCount} albums to reviewed status`
    });

  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update albums', details: err.message });
  }
});

// Fix inflated 2025 album scores manually
app.post('/api/fix-2025-scores', async (req, res) => {
  try {
    console.log('🔧 API: Fixing inflated 2025 album scores...');

    // Albums that need score adjustments (currently showing 10/10)
    const scoreAdjustments = [
      // K-pop soundtrack - should be lower
      {
        title: 'KPop Demon Hunters (Soundtrack from the Netflix Film)',
        artist: 'KPop Demon Hunters Cast',
        newScore: 7.2,
        newStrengths: [
          'Catchy soundtrack with memorable melodies',
          'Good production quality for a TV soundtrack',
          'Features popular K-pop artists'
        ],
        newWeaknesses: [
          'Limited replay value outside the show',
          'Some tracks feel generic',
          'Not a cohesive album experience'
        ]
      },
      // Bad Bunny album - should be high but not perfect
      {
        title: 'DeBÍ TiRAR MáS FOToS',
        artist: 'Bad Bunny',
        newScore: 8.7,
        newStrengths: [
          'Innovative reggaeton production',
          'Strong lyrical content and storytelling',
          'Excellent vocal performance',
          'Cultural impact and mainstream success'
        ],
        newWeaknesses: [
          'Some tracks could be stronger',
          'Album length could be optimized'
        ]
      },
      // Sabrina Carpenter album - should be solid but not perfect
      {
        title: 'Man\'s Best Friend',
        artist: 'Sabrina Carpenter',
        newScore: 8.1,
        newStrengths: [
          'Strong pop production',
          'Good vocal performance',
          'Catchy melodies and hooks',
          'Consistent songwriting quality'
        ],
        newWeaknesses: [
          'Some tracks blend together',
          'Limited genre exploration',
          'Could benefit from more experimentation'
        ]
      },
      // Justin Bieber albums - should be high but realistic
      {
        title: 'SWAG',
        artist: 'Justin Bieber',
        newScore: 8.4,
        newStrengths: [
          'Massive commercial success',
          'Strong streaming performance',
          'Consistent pop production',
          'Global fanbase appeal'
        ],
        newWeaknesses: [
          'Some tracks feel formulaic',
          'Limited artistic growth',
          'Heavy reliance on proven formulas'
        ]
      },
      {
        title: 'SWAG II',
        artist: 'Justin Bieber',
        newScore: 7.9,
        newStrengths: [
          'Strong commercial performance',
          'Consistent with artist\'s style',
          'Good production values',
          'Broad audience appeal'
        ],
        newWeaknesses: [
          'Lacks innovation',
          'Some tracks are forgettable',
          'Formulaic approach'
        ]
      },
      // Morgan Wallen - should be high for country
      {
        title: 'I\'m The Problem',
        artist: 'Morgan Wallen',
        newScore: 8.8,
        newStrengths: [
          'Excellent country music craftsmanship',
          'Strong vocal performance',
          'Authentic storytelling',
          'Massive commercial success',
          'Dominates country charts'
        ],
        newWeaknesses: [
          'Limited genre exploration',
          'Some songs follow familiar patterns'
        ]
      },
      // Fuerza Regida - should be solid for regional Mexican
      {
        title: '111XPANTIA',
        artist: 'Fuerza Regida',
        newScore: 8.2,
        newStrengths: [
          'Strong regional Mexican performance',
          'Good production for the genre',
          'Popular with target audience',
          'Consistent quality'
        ],
        newWeaknesses: [
          'Limited crossover appeal',
          'Some tracks could be more innovative'
        ]
      },
      // Karol G - should be high for Latin
      {
        title: 'Tropicoqueta',
        artist: 'KAROL G',
        newScore: 8.5,
        newStrengths: [
          'Excellent reggaeton and Latin production',
          'Strong vocal performance',
          'Cultural impact in Latin music',
          'International crossover success'
        ],
        newWeaknesses: [
          'Some tracks could be stronger',
          'Album could be more cohesive'
        ]
      },
      // Beéle - should be solid for Latin trap
      {
        title: 'BORONDO',
        artist: 'Beéle',
        newScore: 7.8,
        newStrengths: [
          'Good Latin trap production',
          'Solid vocal performance',
          'Growing popularity',
          'Modern sound'
        ],
        newWeaknesses: [
          'Still developing as an artist',
          'Some tracks lack distinction',
          'Limited global recognition yet'
        ]
      },
      // sombr - should be lower for indie
      {
        title: 'I Barely Know Her',
        artist: 'sombr',
        newScore: 7.1,
        newStrengths: [
          'Unique indie sound',
          'Good production quality',
          'Authentic artistic vision',
          'Growing underground following'
        ],
        newWeaknesses: [
          'Limited mainstream appeal',
          'Some songs require multiple listens',
          'Smaller audience reach'
        ]
      }
    ];

    let updatedCount = 0;

    for (const adjustment of scoreAdjustments) {
      try {
        const result = await Album.findOneAndUpdate(
          {
            title: adjustment.title,
            artist: adjustment.artist
          },
          {
            score: adjustment.newScore,
            strengths: adjustment.newStrengths,
            weaknesses: adjustment.newWeaknesses
          },
          { new: true }
        );

        if (result) {
          console.log(`✅ Updated ${adjustment.title} by ${adjustment.artist}: ${result.score}/10`);
          updatedCount++;
        } else {
          console.log(`❌ Album not found: ${adjustment.title} by ${adjustment.artist}`);
        }
      } catch (updateErr) {
        console.error(`❌ Error updating ${adjustment.title}:`, updateErr.message);
      }
    }

    // Update featured albums rankings after score changes
    await updateFeaturedAlbums();

    console.log(`🎯 Score fix complete! Updated ${updatedCount} albums with more realistic scores.`);

    res.json({
      success: true,
      updated: updatedCount,
      message: `Updated ${updatedCount} albums with more realistic scores`
    });

  } catch (error) {
    console.error('❌ Error fixing scores:', error);
    res.status(500).json({ error: 'Failed to fix scores', details: error.message });
  }
});

// Rescore all albums with updated algorithm (including Discogs)
app.post('/api/rescore-all', async (req, res) => {
  try {
    console.log('Starting rescore of all albums...');

    const albums = await Album.find({ status: 'reviewed' });
    console.log(`Found ${albums.length} albums to rescore`);

    let successCount = 0;
    let errorCount = 0;

    for (const album of albums) {
      try {
        console.log(`Rescoring: ${album.title} by ${album.artist}`);

        // Re-run the review algorithm with all APIs including Discogs
        const review = await reviewAlbum(album.albumId);

        if (review.status === 'reviewed') {
          await Album.findOneAndUpdate(
            { albumId: album.albumId },
            {
              score: review.score,
              strengths: review.strengths,
              weaknesses: review.weaknesses
            }
          );
          successCount++;
          console.log(`✓ Rescored ${album.title}: ${review.score}/10`);
        } else {
          console.log(`⚠ Skipped ${album.title}: ${review.status}`);
        }

        // Rate limiting between albums
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      } catch (albumErr) {
        console.error(`Error rescoring ${album.title}:`, albumErr.message);
        errorCount++;
      }
    }

    // Update featured albums rankings after rescoring
    await updateFeaturedAlbums();

    console.log(`Rescoring complete: ${successCount} success, ${errorCount} errors`);

    res.json({
      success: true,
      total: albums.length,
      successCount,
      errorCount,
      message: `Rescored ${successCount} albums with updated algorithm including Discogs data`
    });

  } catch (err) {
    console.error('Rescore error:', err);
    res.status(500).json({ error: 'Failed to rescore albums', details: err.message });
  }
});

// Update all albums to reviewed status
app.post('/api/update-all-reviewed', async (req, res) => {
  try {
    console.log('Updating all albums to reviewed status...');

    const result = await Album.updateMany(
      { status: { $ne: 'reviewed' } },
      { status: 'reviewed' }
    );

    console.log(`Updated ${result.modifiedCount} albums to reviewed status`);

    const totalReviewed = await Album.countDocuments({ status: 'reviewed' });
    console.log(`Total reviewed albums: ${totalReviewed}`);

    res.json({
      success: true,
      updated: result.modifiedCount,
      totalReviewed,
      message: `Updated ${result.modifiedCount} albums to reviewed status`
    });

  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update albums', details: err.message });
  }
});

// Deezer API Integration (Direct API - No authentication required)
async function authenticateDeezer() {
  console.log('Deezer API ready (no authentication required)');
  return true;
}

// Call authenticateDeezer after it's defined
authenticateDeezer();

async function searchDeezerArtist(artistName) {
  try {
    const response = await axios.get('https://api.deezer.com/search/artist', {
      params: {
        q: artistName,
        limit: 5
      },
      timeout: 10000
    });
    return response.data.data || [];
  } catch (error) {
    console.warn('Deezer artist search error:', error.message);
    return [];
  }
}

async function getDeezerArtist(artistId) {
  try {
    const response = await axios.get(`https://api.deezer.com/artist/${artistId}`, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.warn('Deezer artist fetch error:', error.message);
    return null;
  }
}

async function getDeezerCharts() {
  try {
    const response = await axios.get('https://api.deezer.com/chart', {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.warn('Deezer charts fetch error:', error.message);
    return null;
  }
}

async function getDeezerPlaylists(limit = 10) {
  try {
    const response = await axios.get('https://api.deezer.com/chart/0/playlists', {
      params: { limit },
      timeout: 10000
    });
    return response.data.data || [];
  } catch (error) {
    console.warn('Deezer playlists fetch error:', error.message);
    return [];
  }
}

async function getDeezerEditorial() {
  try {
    const response = await axios.get('https://api.deezer.com/editorial/0', {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.warn('Deezer editorial fetch error:', error.message);
    return null;
  }
}

async function getDeezerGenres() {
  try {
    const response = await axios.get('https://api.deezer.com/genre', {
      timeout: 10000
    });
    return response.data.data || [];
  } catch (error) {
    console.warn('Deezer genres fetch error:', error.message);
    return [];
  }
}

// MusicBrainz API Integration
async function searchMusicBrainzArtist(artistName) {
  try {
    const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'MusicRx/1.0.0 (test@example.com)';

    const response = await axios.get('https://musicbrainz.org/ws/2/artist/', {
      params: {
        query: artistName,
        limit: 5,
        fmt: 'json'
      },
      headers: {
        'User-Agent': userAgent
      },
      timeout: 10000
    });

    return response.data.artists || [];
  } catch (error) {
    console.warn('MusicBrainz artist search error:', error.message);
    return [];
  }
}

async function getMusicBrainzArtist(artistId) {
  try {
    const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'MusicRx/1.0.0 (test@example.com)';

    const response = await axios.get(`https://musicbrainz.org/ws/2/artist/${artistId}`, {
      params: {
        inc: 'aliases+tags+ratings+release-groups',
        fmt: 'json'
      },
      headers: {
        'User-Agent': userAgent
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.warn('MusicBrainz artist fetch error:', error.message);
    return null;
  }
}

async function searchMusicBrainzRelease(title, artist) {
  try {
    const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'MusicRx/1.0.0 (test@example.com)';
    const query = `release:"${title}" AND artist:"${artist}"`;

    const response = await axios.get('https://musicbrainz.org/ws/2/release/', {
      params: {
        query: query,
        limit: 5,
        fmt: 'json'
      },
      headers: {
        'User-Agent': userAgent
      },
      timeout: 10000
    });

    return response.data.releases || [];
  } catch (error) {
    console.warn('MusicBrainz release search error:', error.message);
    return [];
  }
}

// Last.fm API Integration
async function fetchLastFmCharts(country = 'united states') {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) {
      console.log('Last.fm API key not configured, skipping...');
      return [];
    }

    // Fetch top artists chart for specific country
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'geo.gettopartists',
        country: country,
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: 20
      },
      timeout: 10000
    });

    return response.data.topartists.artist.map(artist => ({
      name: artist.name,
      playcount: parseInt(artist.playcount),
      listeners: parseInt(artist.listeners),
      url: artist.url,
      imageUrl: artist.image?.[2]?.['#text'] || null, // Medium image
      rank: parseInt(artist['@attr']?.rank) || 0,
      country: country
    }));
  } catch (error) {
    console.error('Last.fm charts fetch error:', error.message);
    return [];
  }
}

async function fetchLastFmUSTracks() {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) return [];

    // Fetch top tracks in the US
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'geo.gettoptracks',
        country: 'united states',
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: 20
      },
      timeout: 10000
    });

    return response.data.tracks.track || [];
  } catch (error) {
    console.error('Last.fm US tracks fetch error:', error.message);
    return [];
  }
}

async function fetchLastFmArtistInfo(artistName) {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) return null;

    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'artist.getinfo',
        artist: artistName,
        api_key: LASTFM_API_KEY,
        format: 'json'
      },
      timeout: 10000
    });

    const artist = response.data.artist;
    return {
      name: artist.name,
      bio: artist.bio?.summary,
      tags: artist.tags?.tag?.map(t => t.name) || [],
      similar: artist.similar?.artist?.slice(0, 5).map(a => a.name) || [],
      stats: {
        listeners: parseInt(artist.stats?.listeners) || 0,
        playcount: parseInt(artist.stats?.playcount) || 0
      }
    };
  } catch (error) {
    console.warn(`Last.fm artist info fetch error for ${artistName}:`, error.message);
    return null;
  }
}

// Twitter/X API Integration
async function fetchTwitterUserTweets(username, maxResults = 10) {
  try {
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      console.log('Twitter bearer token not configured, skipping...');
      return [];
    }

    // First get user ID from username
    const userResponse = await axios.get('https://api.twitter.com/2/users/by/username/' + username, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      },
      timeout: 10000
    });

    const userId = userResponse.data.data.id;

    // Then get recent tweets
    const tweetsResponse = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      },
      params: {
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics,text,entities',
        'user.fields': 'username,name,profile_image_url,verified',
        exclude: 'replies' // Only get original tweets, not replies
      },
      timeout: 10000
    });

    return tweetsResponse.data.data.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      username: username,
      user: userResponse.data.data,
      metrics: tweet.public_metrics,
      entities: tweet.entities,
      url: `https://twitter.com/${username}/status/${tweet.id}`,
      source: 'Twitter',
      category: 'music',
      tags: ['twitter', 'music', username.toLowerCase()],
      sentiment: 0, // Could add sentiment analysis later
      engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
    }));

  } catch (error) {
    console.warn(`Twitter fetch error for @${username}:`, error.message);
    return [];
  }
}

// Fetch personal tweets using OAuth 1.0a
async function fetchPersonalTweets(maxResults = 10) {
  try {
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const consumerKey = 'bvJVVvtVd8FDLn0TxRGbRdfiY';
    const consumerSecret = 'mrM2Xsn7Tw81Mv675JLBFol9UnCEHoWlV9eAIe3rQCDcOKtKpR';

    if (!accessToken || !accessTokenSecret) {
      console.log('Personal Twitter tokens not configured');
      return [];
    }

    // Get user ID first
    const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
      },
      timeout: 10000
    });

    const userId = userResponse.data.data.id;
    const username = userResponse.data.data.username;

    // Get personal tweets
    const tweetsResponse = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
      headers: {
        'Authorization': `Bearer ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
      },
      params: {
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics,text,entities',
        'user.fields': 'username,name,profile_image_url,verified',
        exclude: 'replies'
      },
      timeout: 10000
    });

    return tweetsResponse.data.data.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      username: username,
      user: userResponse.data.data,
      metrics: tweet.public_metrics,
      entities: tweet.entities,
      url: `https://twitter.com/${username}/status/${tweet.id}`,
      source: 'Personal Twitter',
      category: 'personal',
      tags: ['twitter', 'personal', username.toLowerCase()],
      sentiment: 0,
      engagement: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count
    }));

  } catch (error) {
    console.warn('Personal Twitter fetch error:', error.message);
    return [];
  }
}

// Fetch music news from Twitter accounts
async function fetchTwitterMusicNews() {
  try {
    console.log('🐦 Fetching music news from Twitter...');

    // Prioritized accounts - fetch more posts from these first
    const priorityAccounts = [
      'kurrco',           // Music news updates - PRIORITY
      'raptv',            // Rap news & culture - PRIORITY
      'akademiks',        // Hip-hop culture & news - PRIORITY
    ];

    // Other major music news accounts
    const otherMusicNewsAccounts = [
      // Major Publications (Millions of followers)
      'billboard',        // 4.8M - Charts & industry leader
      'RollingStone',     // 2.1M - Rock & culture legacy
      'NME',              // 1.5M - UK/Global music news
      'Pitchfork',        // 1.2M - Indie/alternative authority
      'ComplexMusic',     // 1.8M - Hip-hop/R&B focus
      'TheNeedleDrop',    // 1.1M - Hip-hop reviews & commentary

      // Established Music Media (100K-800K followers)
      'Stereogum',        // 400K - Indie rock/alternative
      'FADER',            // 800K - Culture & music trends
      'Spin',             // 200K - Alternative music
      'DIYmag',           // 150K - Indie/alt coverage
      'QMagazine',        // 100K - Rock music authority
      'Uncut',            // 80K - Classic rock reviews
      'Mojo',             // 70K - Rock music magazine
      'KerrangMag',       // 200K - Metal/rock
      'MetalHammer',      // 150K - Metal music
      'RockSound',        // 100K - Rock/alternative
      'PlanetRockRadio',  // 50K - Rock radio

      // Additional Hip-Hop & Rap Focused (High engagement)
      'HipHopDX',         // 300K - Hip-hop news
      'AllHipHop',        // 200K - Hip-hop culture
      'RapRadar',         // 150K - Rap industry news
      '2DOPEBOYZ',        // 100K - Hip-hop media
      'MassAppeal',       // 80K - Hip-hop culture
      'NoiseyMusic',      // 150K - Music culture

      // Music Business & Industry
      'MusicBusinessUK',  // 50K - UK music industry
      'MusicBizGlobal',   // 30K - Global music business
      'MusicTechNews',    // 25K - Music technology
      'MusicLawyer',      // 15K - Music industry law

      // Festival & Live Music
      'Coachella',        // 1.2M - Major festival
      'Glastonbury',      // 800K - Legendary festival
      'ReadingFestival',  // 200K - Major UK festival
      'DownloadFest',     // 50K - Metal festival

      // Record Labels & Distributors
      'UMG',              // 500K - Universal Music Group
      'SonyMusic',        // 800K - Sony Music Entertainment
      'WarnerRecords',    // 300K - Warner Music
      'AtlanticRecords',  // 200K - Atlantic Records
      'DefJamRecords',    // 150K - Def Jam
      'RocNation',        // 300K - Roc Nation
      'Interscope',       // 100K - Interscope Records

      // Music Streaming & Tech
      'Spotify',          // 8M - Major streaming platform
      'AppleMusic',       // 2M - Apple Music
      'TIDAL',            // 500K - High-fidelity streaming
      'SoundCloud',       // 2M - Music sharing platform
      'Bandcamp',         // 300K - Independent music

      // Music Production & Gear
      'Ableton',          // 200K - Music production software
      'NativeInstruments', // 150K - Music gear
      'Focusrite',        // 50K - Audio interfaces
      'KRKsystems',       // 20K - Studio monitors

      // Music Education & Culture
      'BerkleeOnline',    // 50K - Music education
      'NAMM',             // 100K - Music industry association
      'ASCAP',            // 50K - Music licensing
      'BMI_music',        // 30K - Music licensing
    ];

    const allTweets = [];

    // First, fetch more posts from priority accounts (5 tweets each)
    console.log('🎯 Fetching priority accounts: kurrco, rapTV, akademiks');
    for (const account of priorityAccounts) {
      try {
        console.log(`📱 Fetching ${5} tweets from @${account} (PRIORITY)`);
        const tweets = await fetchTwitterUserTweets(account, 5); // 5 tweets per priority account
        allTweets.push(...tweets);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (accountError) {
        console.warn(`Failed to fetch tweets for priority account @${account}:`, accountError.message);
      }
    }

    // Then fetch from other accounts (limit to avoid rate limits)
    const remainingSlots = Math.max(0, 8 - priorityAccounts.length); // Adjust based on priority accounts
    for (const account of otherMusicNewsAccounts.slice(0, remainingSlots)) {
      try {
        console.log(`📱 Fetching ${3} tweets from @${account}`);
        const tweets = await fetchTwitterUserTweets(account, 3); // 3 tweets per regular account
        allTweets.push(...tweets);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (accountError) {
        console.warn(`Failed to fetch tweets for @${account}:`, accountError.message);
      }
    }

    // Sort by creation date (newest first) - priority accounts will naturally appear first due to more recent fetches
    allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ Fetched ${allTweets.length} tweets from music news accounts (${priorityAccounts.length} priority accounts)`);
    return allTweets;

  } catch (error) {
    console.error('Twitter music news fetch error:', error.message);
    return [];
  }
}

// Automated News Collection Functions

// Fetch news from NewsAPI (requires API key)
async function fetchNewsAPI() {
  try {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    if (!NEWS_API_KEY) {
      console.log('NewsAPI key not configured, skipping...');
      return [];
    }

    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: {
        q: 'music OR album OR artist OR hip-hop OR rap OR pop OR rock',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20,
        apiKey: NEWS_API_KEY
      },
      timeout: 10000
    });

    return response.data.articles.map(article => ({
      title: article.title,
      content: article.description || article.content?.substring(0, 500) + '...',
      summary: article.description,
      source: article.source.name,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: new Date(article.publishedAt),
      category: 'music',
      tags: ['news', 'music'],
      sentiment: 0, // Would need NLP analysis
      engagement: Math.floor(Math.random() * 1000) + 100
    }));
  } catch (error) {
    console.error('NewsAPI fetch error:', error.message);
    return [];
  }
}

// Scrape music news from RSS feeds
async function fetchRSSNews() {
  try {
    const rssFeeds = [
      'https://pitchfork.com/rss/news/',
      'https://www.billboard.com/feed/',
      'https://www.rollingstone.com/music/feed/',
      'https://www.spin.com/feed/',
      'https://www.stereogum.com/feed/'
    ];

    const allArticles = [];

    for (const feedUrl of rssFeeds) {
      try {
        const response = await axios.get(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });

        $('item').each((i, item) => {
          if (i >= 5) return; // Limit to 5 articles per feed

          const title = $(item).find('title').text();
          const link = $(item).find('link').text();
          const description = $(item).find('description').text();
          const pubDate = $(item).find('pubDate').text();

          // Clean HTML from description
          const cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 300) + '...';

          allArticles.push({
            title: title,
            content: cleanDescription,
            summary: cleanDescription,
            source: feedUrl.includes('pitchfork') ? 'Pitchfork' :
                   feedUrl.includes('billboard') ? 'Billboard' :
                   feedUrl.includes('rollingstone') ? 'Rolling Stone' :
                   feedUrl.includes('spin') ? 'Spin' : 'Stereogum',
            url: link,
            imageUrl: null, // Would need additional scraping for images
            publishedAt: new Date(pubDate),
            category: 'music',
            tags: ['news', 'music', 'rss'],
            sentiment: 0,
            engagement: Math.floor(Math.random() * 500) + 50
          });
        });
      } catch (feedError) {
        console.warn(`Failed to fetch RSS feed ${feedUrl}:`, feedError.message);
      }
    }

    return allArticles;
  } catch (error) {
    console.error('RSS fetch error:', error.message);
    return [];
  }
}

// Generate trending music news from Spotify data
async function generateTrendingNews() {
  try {
    // Get trending artists from Spotify
    const trendingResponse = await spotifyApi.getArtists(['4q3ewBCX7sLwd24euuV69X', '1Xyo4u8uXC1ZmMpatF05PJ', '06HL4z0CvFAxyc27GXpf02']); // Example popular artists
    const artists = trendingResponse.body.artists;

    const trendingArticles = [];

    for (const artist of artists) {
      if (!artist) continue;

      // Generate synthetic news based on real artist data
      const newsTemplates = [
        `${artist.name} announces surprise collaboration with upcoming artist`,
        `${artist.name} breaks streaming record with latest single`,
        `${artist.name} reveals new album artwork and release date`,
        `Behind the scenes: ${artist.name}'s creative process revealed`,
        `${artist.name} dominates charts with viral performance`,
        `Fan reactions: ${artist.name}'s latest work divides opinions`,
        `${artist.name} shares personal story behind hit song`,
        `Industry buzz: ${artist.name} signs major label deal`,
        `${artist.name} teases upcoming world tour dates`,
        `${artist.name} wins award for outstanding musical achievement`
      ];

      const randomTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
      const engagement = Math.floor(Math.random() * 2000) + 500;

      trendingArticles.push({
        title: randomTemplate,
        content: `Latest updates on ${artist.name}'s music career and upcoming projects. Fans are excited about what this artist has in store for the coming months.`,
        summary: `Breaking news about ${artist.name} and their latest musical endeavors.`,
        source: 'MusicRx Trending',
        url: `https://musicrx.app/artist/${artist.id}`,
        imageUrl: artist.images?.[0]?.url,
        publishedAt: new Date(),
        category: 'trending',
        tags: ['trending', 'artist', artist.name.toLowerCase()],
        sentiment: Math.random() * 0.4 + 0.3, // Positive sentiment
        engagement: engagement,
        isAutomated: true
      });
    }

    return trendingArticles;
  } catch (error) {
    console.error('Trending news generation error:', error.message);
    return [];
  }
}

// Collect and store fresh news - prioritizing articles from today and yesterday
async function collectDailyNews() {
  try {
    console.log('📰 Collecting daily music news (prioritizing today & yesterday)...');

    const [newsApiArticles, rssArticles, trendingArticles, twitterArticles] = await Promise.all([
      fetchNewsAPI(),
      fetchRSSNews(),
      generateTrendingNews(),
      fetchTwitterMusicNews()
    ]);

    const allArticles = [...newsApiArticles, ...rssArticles, ...trendingArticles, ...twitterArticles];

    console.log(`📊 Collected ${allArticles.length} articles (${newsApiArticles.length} NewsAPI, ${rssArticles.length} RSS, ${trendingArticles.length} trending, ${twitterArticles.length} Twitter)`);

    // Get date boundaries for today and yesterday only
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter articles to ONLY include those from today and yesterday
    const recentArticles = allArticles.filter(article => {
      if (!article.publishedAt) return false;
      const articleDate = new Date(article.publishedAt);
      const articleDay = new Date(articleDate.getFullYear(), articleDate.getMonth(), articleDate.getDate());
      return articleDay >= yesterday; // Today or yesterday only
    });

    const finalArticles = recentArticles;

    console.log(`📅 Filtered to ${finalArticles.length} articles from today and yesterday only`);

    // Filter and deduplicate articles with improved logic
    const uniqueArticles = [];
    const seenTitles = new Set();
    const seenUrls = new Set();

    for (const article of finalArticles) {
      // Skip if we've seen this exact URL before
      if (seenUrls.has(article.url)) {
        continue;
      }

      // Normalize title for comparison (remove extra spaces, convert to lowercase)
      const normalizedTitle = article.title.toLowerCase().replace(/\s+/g, ' ').trim();

      // Skip if we've seen a very similar title (basic fuzzy matching)
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        // Check if titles are very similar (80%+ overlap)
        const words1 = new Set(normalizedTitle.split(' '));
        const words2 = new Set(seenTitle.split(' '));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const similarity = intersection.size / union.size;

        if (similarity > 0.8 && intersection.size >= 3) { // At least 80% similar and 3+ common words
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueArticles.push(article);
        seenTitles.add(normalizedTitle);
        seenUrls.add(article.url);
      }
    }

    // Store new articles (avoid duplicates)
    let storedCount = 0;
    for (const article of uniqueArticles.slice(0, 20)) { // Limit to 20 articles per collection
      try {
        // Check if article already exists
        const existing = await NewsArticle.findOne({
          title: article.title,
          source: article.source,
          publishedAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          }
        });

        if (!existing) {
          await NewsArticle.create(article);
          storedCount++;
        }
      } catch (dbError) {
        console.warn('Error storing article:', dbError.message);
      }
    }

    // Clean up old articles (keep only last 7 days to focus on recent news)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deletedCount = await NewsArticle.deleteMany({
      publishedAt: { $lt: sevenDaysAgo }
    });

    console.log(`✅ Stored ${storedCount} new articles, cleaned up ${deletedCount.deletedCount} old articles`);

  } catch (error) {
    console.error('❌ Daily news collection error:', error.message);
  }
}

// News endpoints
app.get('/api/news', async (req, res) => {
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
    console.error('News fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Tweets endpoint
app.get('/api/tweets', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const tweets = await NewsArticle.find({
      tags: { $in: ['twitter'] }
    })
      .sort({ publishedAt: -1 })
      .limit(limit);

    res.json(tweets);
  } catch (error) {
    console.error('Tweets fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
});

// Personal tweets endpoint
app.get('/api/personal-tweets', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const personalTweets = await fetchPersonalTweets(limit);
    res.json(personalTweets);
  } catch (error) {
    console.error('Personal tweets fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch personal tweets' });
  }
});

app.get('/api/news/trending', async (req, res) => {
  try {
    const articles = await NewsArticle.find({
      category: 'trending',
      publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
      .sort({ engagement: -1 })
      .limit(10);

    res.json(articles);
  } catch (error) {
    console.error('Trending news fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trending news' });
  }
});

app.post('/api/news/collect', async (req, res) => {
  try {
    console.log('📰 Starting manual news collection...');
    await collectDailyNews();
    res.json({ success: true, message: 'News collection completed' });
  } catch (error) {
    console.error('Manual news collection error:', error.message);
    res.status(500).json({ error: 'Failed to collect news' });
  }
});

// Last.fm Charts endpoint
app.get('/api/charts/lastfm', async (req, res) => {
  try {
    const country = req.query.country || 'united states';
    const charts = await fetchLastFmCharts(country);
    res.json(charts);
  } catch (error) {
    console.error('Last.fm charts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm charts' });
  }
});

// Last.fm US Charts endpoint
app.get('/api/charts/lastfm/us', async (req, res) => {
  try {
    const charts = await fetchLastFmCharts('united states');
    res.json(charts);
  } catch (error) {
    console.error('Last.fm US charts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm US charts' });
  }
});

// Last.fm UK Charts endpoint
app.get('/api/charts/lastfm/uk', async (req, res) => {
  try {
    const charts = await fetchLastFmCharts('united kingdom');
    res.json(charts);
  } catch (error) {
    console.error('Last.fm UK charts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm UK charts' });
  }
});

// Last.fm Global Charts endpoint
app.get('/api/charts/lastfm/global', async (req, res) => {
  try {
    // For global, we'll use the default method which gets worldwide charts
    const charts = await fetchLastFmCharts();
    res.json(charts);
  } catch (error) {
    console.error('Last.fm global charts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm global charts' });
  }
});

// Last.fm US Tracks endpoint
app.get('/api/charts/lastfm/us/tracks', async (req, res) => {
  try {
    const tracks = await fetchLastFmUSTracks();
    res.json(tracks);
  } catch (error) {
    console.error('Last.fm US tracks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm US tracks' });
  }
});

// Last.fm UK Tracks endpoint
app.get('/api/charts/lastfm/uk/tracks', async (req, res) => {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) return res.status(500).json({ error: 'Last.fm API key not configured' });

    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'geo.gettoptracks',
        country: 'united kingdom',
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: 20
      },
      timeout: 10000
    });

    res.json(response.data.tracks.track || []);
  } catch (error) {
    console.error('Last.fm UK tracks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Last.fm UK tracks' });
  }
});

// Last.fm Artist Info endpoint
app.get('/api/artist/lastfm/:artistName', async (req, res) => {
  try {
    const artistName = req.params.artistName;
    const artistInfo = await fetchLastFmArtistInfo(artistName);

    if (!artistInfo) {
      return res.status(404).json({ error: 'Artist not found on Last.fm' });
    }

    res.json(artistInfo);
  } catch (error) {
    console.error('Last.fm artist info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch artist info' });
  }
});

// Helper functions for Last.fm API
async function fetchLastFmGeoTopTracks(country, limit = 50) {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) {
      console.log('Last.fm API key not configured');
      return [];
    }

    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'geo.gettoptracks',
        country: country,
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: limit
      },
      timeout: 10000
    });

    return response.data.tracks.track || [];
  } catch (error) {
    console.error(`Last.fm geo tracks error for ${country}:`, error.message);
    return [];
  }
}

async function fetchLastFmUserRecentTracks(username, limit = 20) {
  try {
    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    if (!LASTFM_API_KEY) {
      console.log('Last.fm API key not configured');
      return [];
    }

    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'user.getrecenttracks',
        user: username,
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: limit
      },
      timeout: 10000
    });

    return response.data.recenttracks.track || [];
  } catch (error) {
    console.error(`Last.fm user recent tracks error for ${username}:`, error.message);
    return [];
  }
}

async function getSpotifyTrackMood(trackName, artistName) {
  try {
    // Search for the track on Spotify
    const searchQuery = `track:${trackName} artist:${artistName}`;
    const searchResponse = await spotifyApi.searchTracks(searchQuery, { limit: 1 });

    if (!searchResponse.body.tracks.items.length) {
      console.log(`Track not found on Spotify: ${trackName} by ${artistName}`);
      return getFallbackMood(trackName, artistName);
    }

    const track = searchResponse.body.tracks.items[0];

    // Get audio features - this may fail with 403 for free tier
    try {
      const featuresResponse = await spotifyApi.getAudioFeaturesForTrack(track.id);
      const features = featuresResponse.body;

      if (!features) {
        console.log(`No audio features available for: ${trackName} by ${artistName}`);
        return getFallbackMood(trackName, artistName);
      }

      // Analyze mood based on audio features
      const valence = features.valence; // 0-1 (sad to happy)
      const energy = features.energy;   // 0-1 (calm to energetic)
      const danceability = features.danceability; // 0-1

      let mood = 'neutral';
      let moodDescription = 'Balanced mood';

      if (valence > 0.7 && energy > 0.6) {
        mood = 'happy-energetic';
        moodDescription = 'Happy & energetic vibes';
      } else if (valence > 0.7 && energy < 0.4) {
        mood = 'happy-calm';
        moodDescription = 'Happy & relaxed vibes';
      } else if (valence < 0.3 && energy > 0.6) {
        mood = 'sad-energetic';
        moodDescription = 'Intense & melancholic vibes';
      } else if (valence < 0.3 && energy < 0.4) {
        mood = 'sad-calm';
        moodDescription = 'Sad & introspective vibes';
      } else if (energy > 0.7) {
        mood = 'high-energy';
        moodDescription = 'High energy vibes';
      } else if (danceability > 0.7) {
        mood = 'danceable';
        moodDescription = 'Danceable & upbeat vibes';
      }

      return {
        valence: Math.round(valence * 100) / 100,
        energy: Math.round(energy * 100) / 100,
        danceability: Math.round(danceability * 100) / 100,
        mood: mood,
        description: moodDescription
      };

    } catch (featuresError) {
      console.log(`Audio features unavailable (likely API restrictions): ${trackName} by ${artistName}`);
      return getFallbackMood(trackName, artistName);
    }

  } catch (error) {
    console.error('Spotify mood analysis error:', error.message);
    return getFallbackMood(trackName, artistName);
  }
}

// Fallback mood analysis when Spotify audio features are unavailable
function getFallbackMood(trackName, artistName) {
  // Simple heuristic-based mood analysis based on track/artist name patterns
  const trackLower = trackName.toLowerCase();
  const artistLower = artistName.toLowerCase();

  // Happy/positive keywords
  const happyKeywords = ['love', 'happy', 'joy', 'sunshine', 'smile', 'dance', 'party', 'fun', 'bright', 'good'];
  // Sad/negative keywords
  const sadKeywords = ['sad', 'cry', 'heartbreak', 'lonely', 'dark', 'pain', 'broken', 'tears', 'lost', 'alone'];
  // Energetic keywords
  const energeticKeywords = ['energy', 'power', 'fire', 'wild', 'crazy', 'intense', 'hard', 'beat', 'bass', 'drop'];
  // Calm keywords
  const calmKeywords = ['calm', 'peace', 'quiet', 'soft', 'gentle', 'slow', 'relax', 'dream', 'sleep', 'breathe'];

  let valence = 0.5; // neutral
  let energy = 0.5;  // neutral

  // Analyze valence (emotional positivity)
  const happyScore = happyKeywords.reduce((score, keyword) => {
    return score + (trackLower.includes(keyword) ? 0.1 : 0) + (artistLower.includes(keyword) ? 0.05 : 0);
  }, 0);

  const sadScore = sadKeywords.reduce((score, keyword) => {
    return score + (trackLower.includes(keyword) ? 0.1 : 0) + (artistLower.includes(keyword) ? 0.05 : 0);
  }, 0);

  valence = Math.max(0.1, Math.min(0.9, 0.5 + happyScore - sadScore));

  // Analyze energy
  const energeticScore = energeticKeywords.reduce((score, keyword) => {
    return score + (trackLower.includes(keyword) ? 0.1 : 0) + (artistLower.includes(keyword) ? 0.05 : 0);
  }, 0);

  const calmScore = calmKeywords.reduce((score, keyword) => {
    return score + (trackLower.includes(keyword) ? 0.1 : 0) + (artistLower.includes(keyword) ? 0.05 : 0);
  }, 0);

  energy = Math.max(0.1, Math.min(0.9, 0.5 + energeticScore - calmScore));

  // Determine mood category
  let mood = 'neutral';
  let moodDescription = 'Balanced mood';

  if (valence > 0.7 && energy > 0.6) {
    mood = 'happy-energetic';
    moodDescription = 'Happy & energetic vibes';
  } else if (valence > 0.7 && energy < 0.4) {
    mood = 'happy-calm';
    moodDescription = 'Happy & relaxed vibes';
  } else if (valence < 0.3 && energy > 0.6) {
    mood = 'sad-energetic';
    moodDescription = 'Intense & melancholic vibes';
  } else if (valence < 0.3 && energy < 0.4) {
    mood = 'sad-calm';
    moodDescription = 'Sad & introspective vibes';
  } else if (energy > 0.7) {
    mood = 'high-energy';
    moodDescription = 'High energy vibes';
  } else if (energy < 0.3) {
    mood = 'calm';
    moodDescription = 'Calm & soothing vibes';
  }

  return {
    valence: Math.round(valence * 100) / 100,
    energy: Math.round(energy * 100) / 100,
    danceability: 0.5, // neutral fallback
    mood: mood,
    description: moodDescription + ' (estimated)',
    fallback: true
  };
}

// Last.fm Geo Top Tracks endpoint
app.get('/api/lastfm/geo/toptracks/:country', async (req, res) => {
  try {
    const country = req.params.country;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`Fetching Last.fm geo top tracks for ${country}, limit: ${limit}`);

    const tracks = await fetchLastFmGeoTopTracks(country, limit);
    res.json(tracks);
  } catch (error) {
    console.error('Last.fm geo tracks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch geo top tracks' });
  }
});

// Last.fm User Recent Tracks endpoint
app.get('/api/lastfm/user/recent/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const limit = parseInt(req.query.limit) || 20;

    console.log(`Fetching Last.fm recent tracks for user ${username}, limit: ${limit}`);

    const recentTracks = await fetchLastFmUserRecentTracks(username, limit);
    res.json(recentTracks);
  } catch (error) {
    console.error('Last.fm user recent tracks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user recent tracks' });
  }
});

// Last.fm Listener Pulse endpoint (combines geo data with Spotify mood analysis)
app.get('/api/listener-pulse/:artistName', async (req, res) => {
  try {
    const artistName = req.params.artistName;

    // Use ALL countries that have Last.fm geo data - comprehensive global coverage
    const countries = [
      // North America
      'United States', 'Canada', 'Mexico',

      // Central America & Caribbean
      'Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Nicaragua', 'Panama',
      'Bahamas', 'Barbados', 'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago',

      // South America
      'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru',
      'Suriname', 'Uruguay', 'Venezuela',

      // Europe
      'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria',
      'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Faroe Islands', 'Finland', 'France',
      'Germany', 'Gibraltar', 'Greece', 'Greenland', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo',
      'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro',
      'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino',
      'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom',
      'Vatican City',

      // Africa
      'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Cape Verde',
      'Central African Republic', 'Chad', 'Comoros', 'Democratic Republic of the Congo', 'Republic of the Congo',
      'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana',
      'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
      'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
      'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa',
      'South Sudan', 'Sudan', 'Swaziland', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Western Sahara',
      'Zambia', 'Zimbabwe',

      // Asia
      'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia',
      'China', 'Georgia', 'Hong Kong', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan',
      'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Macau', 'Malaysia', 'Maldives', 'Mongolia',
      'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine', 'Philippines', 'Qatar', 'Russia',
      'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand',
      'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',

      // Oceania
      'American Samoa', 'Australia', 'Cook Islands', 'Fiji', 'French Polynesia', 'Guam', 'Kiribati',
      'Marshall Islands', 'Micronesia', 'Nauru', 'New Caledonia', 'New Zealand', 'Niue', 'Northern Mariana Islands',
      'Palau', 'Papua New Guinea', 'Pitcairn Islands', 'Samoa', 'Solomon Islands', 'Tokelau', 'Tonga',
      'Tuvalu', 'Vanuatu', 'Wallis and Futuna'
    ];

    console.log(`Generating listener pulse for ${artistName} across ${countries.length} countries`);

    const pulseData = {
      artist: artistName,
      lastUpdated: new Date(),
      cities: []
    };

    // Get geo data for countries
    for (const country of countries) {
      try {
        const geoTracks = await fetchLastFmGeoTopTracks(country, 50); // Get more tracks

        // More flexible artist name matching
        const artistTracks = geoTracks.filter(track => {
          const trackArtist = track.artist.name.toLowerCase();
          const searchArtist = artistName.toLowerCase();

          // Exact match
          if (trackArtist === searchArtist) return true;

          // Contains match (either direction)
          if (trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist)) return true;

          // Common variations (e.g., "The Weeknd" vs "Weeknd")
          const normalizedTrack = trackArtist.replace(/^(the\s+)/i, '');
          const normalizedSearch = searchArtist.replace(/^(the\s+)/i, '');

          if (normalizedTrack.includes(normalizedSearch) || normalizedSearch.includes(normalizedTrack)) return true;

          return false;
        });

        if (artistTracks.length > 0) {
          // Use the track with most listeners
          const topTrack = artistTracks.reduce((best, current) =>
            parseInt(current.listeners) > parseInt(best.listeners) ? current : best
          );

          pulseData.cities.push({
            country: country,
            track: {
              name: topTrack.name,
              artist: topTrack.artist.name,
              playcount: topTrack.playcount || 0,
              listeners: topTrack.listeners || 0
            },
            popularity: Math.min(100, Math.max(10, (parseInt(topTrack.listeners) / 1000))) // Scale to 10-100
          });
        }
      } catch (countryError) {
        console.warn(`Failed to get data for ${country}:`, countryError.message);
      }
    }

    // If no cities found, try global top tracks as fallback
    if (pulseData.cities.length === 0) {
      console.log('No geo data found, trying global tracks as fallback...');

      try {
        // Get global top tracks
        const globalTracks = await fetchLastFmGeoTopTracks('united states', 100); // Use US as global proxy

        const artistTracks = globalTracks.filter(track => {
          const trackArtist = track.artist.name.toLowerCase();
          const searchArtist = artistName.toLowerCase();

          if (trackArtist === searchArtist) return true;
          if (trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist)) return true;

          const normalizedTrack = trackArtist.replace(/^(the\s+)/i, '');
          const normalizedSearch = searchArtist.replace(/^(the\s+)/i, '');

          if (normalizedTrack.includes(normalizedSearch) || normalizedSearch.includes(normalizedTrack)) return true;

          return false;
        });

        if (artistTracks.length > 0) {
          // Create mock cities based on global popularity
          const mockCities = [
            { name: 'New York', country: 'United States', coords: [40.7128, -74.0060] },
            { name: 'London', country: 'United Kingdom', coords: [51.5074, -0.1278] },
            { name: 'Berlin', country: 'Germany', coords: [52.5200, 13.4050] },
            { name: 'Paris', country: 'France', coords: [48.8566, 2.3522] },
            { name: 'Toronto', country: 'Canada', coords: [43.6532, -79.3832] }
          ];

          const topTrack = artistTracks[0];
          const moodData = await getSpotifyTrackMood(topTrack.name, topTrack.artist.name);

          // Create entries for major cities
          mockCities.forEach((city, index) => {
            pulseData.cities.push({
              country: city.country,
              track: {
                name: topTrack.name,
                artist: topTrack.artist.name,
                playcount: topTrack.playcount || Math.floor(Math.random() * 1000000),
                listeners: topTrack.listeners || Math.floor(Math.random() * 100000) + 50000
              },
              popularity: Math.max(20, 100 - (index * 15)) // Decreasing popularity
            });
          });
        }
      } catch (fallbackError) {
        console.warn('Global fallback also failed:', fallbackError.message);
      }
    }

    // Sort by popularity
    pulseData.cities.sort((a, b) => b.popularity - a.popularity);

    console.log(`Generated listener pulse with ${pulseData.cities.length} cities`);
    res.json(pulseData);

  } catch (error) {
    console.error('Listener pulse error:', error.message);
    res.status(500).json({ error: 'Failed to generate listener pulse' });
  }
});

// MusicBrainz Artist Search endpoint
app.get('/api/musicbrainz/artist/search', async (req, res) => {
  try {
    const { q: artistName } = req.query;
    if (!artistName) {
      return res.status(400).json({ error: 'Artist name query parameter required' });
    }

    const artists = await searchMusicBrainzArtist(artistName);
    res.json(artists);
  } catch (error) {
    console.error('MusicBrainz artist search error:', error.message);
    res.status(500).json({ error: 'Failed to search MusicBrainz artists' });
  }
});

// MusicBrainz Artist Info endpoint
app.get('/api/musicbrainz/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artistInfo = await getMusicBrainzArtist(artistId);

    if (!artistInfo) {
      return res.status(404).json({ error: 'Artist not found on MusicBrainz' });
    }

    res.json(artistInfo);
  } catch (error) {
    console.error('MusicBrainz artist info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch artist info' });
  }
});

// MusicBrainz Release Search endpoint
app.get('/api/musicbrainz/release/search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist query parameters required' });
    }

    const releases = await searchMusicBrainzRelease(title, artist);
    res.json(releases);
  } catch (error) {
    console.error('MusicBrainz release search error:', error.message);
    res.status(500).json({ error: 'Failed to search MusicBrainz releases' });
  }
});

// Deezer Charts endpoint
app.get('/api/charts/deezer', async (req, res) => {
  try {
    const charts = await getDeezerCharts();
    if (!charts) {
      return res.status(404).json({ error: 'Deezer charts not available' });
    }
    res.json(charts);
  } catch (error) {
    console.error('Deezer charts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer charts' });
  }
});

// Deezer Artist Search endpoint
app.get('/api/deezer/artist/search', async (req, res) => {
  try {
    const { q: artistName } = req.query;
    if (!artistName) {
      return res.status(400).json({ error: 'Artist name query parameter required' });
    }

    const artists = await searchDeezerArtist(artistName);
    res.json(artists);
  } catch (error) {
    console.error('Deezer artist search error:', error.message);
    res.status(500).json({ error: 'Failed to search Deezer artists' });
  }
});

// Deezer Artist Info endpoint
app.get('/api/deezer/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artistInfo = await getDeezerArtist(artistId);

    if (!artistInfo) {
      return res.status(404).json({ error: 'Artist not found on Deezer' });
    }

    res.json(artistInfo);
  } catch (error) {
    console.error('Deezer artist info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch artist info' });
  }
});

// Deezer Playlists endpoint
app.get('/api/deezer/playlists', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const playlists = await getDeezerPlaylists(limit);
    res.json(playlists);
  } catch (error) {
    console.error('Deezer playlists error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer playlists' });
  }
});

// Deezer Editorial endpoint
app.get('/api/deezer/editorial', async (req, res) => {
  try {
    const editorial = await getDeezerEditorial();
    if (!editorial) {
      return res.status(404).json({ error: 'Deezer editorial not available' });
    }
    res.json(editorial);
  } catch (error) {
    console.error('Deezer editorial error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer editorial' });
  }
});

// Deezer Genres endpoint
app.get('/api/deezer/genres', async (req, res) => {
  try {
    const genres = await getDeezerGenres();
    res.json(genres);
  } catch (error) {
    console.error('Deezer genres error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Deezer genres' });
  }
});

// World First Underground Trends - Find artists popular on Deezer but emerging on Spotify
async function getWorldFirstTrends() {
  try {
    console.log('🌍 Analyzing World First underground trends...');

    // Get global Deezer charts
    const deezerCharts = await getDeezerCharts();
    if (!deezerCharts || !deezerCharts.tracks || !deezerCharts.tracks.data) {
      console.log('No Deezer global charts available');
      return [];
    }

    const worldFirstTrends = [];
    const processedArtists = new Set(); // Avoid duplicates

    // Analyze top tracks for underground potential
    for (const track of deezerCharts.tracks.data.slice(0, 50)) { // Top 50 tracks
      try {
        const artist = track.artist;
        const trackInfo = track;

        // Skip if we already processed this artist
        if (processedArtists.has(artist.id)) continue;
        processedArtists.add(artist.id);

        console.log(`🔍 Analyzing ${artist.name}...`);

        // Check if this artist exists on Spotify
        const spotifySearch = await spotifyApi.searchArtists(artist.name, { limit: 1 });
        const spotifyArtist = spotifySearch.body.artists.items[0];

        // Calculate "trending score" - artists gaining global traction on Deezer
        let trendingScore = 0;
        let spotifyPresence = 'unknown';
        let regionFocus = 'global';

        if (spotifyArtist) {
          const spotifyFollowers = spotifyArtist.followers.total;
          const spotifyPopularity = spotifyArtist.popularity;

          // Scoring based on global trending potential - higher scores for artists with strong global presence
          if (spotifyFollowers > 5000000 && spotifyPopularity > 80) {
            trendingScore = 10; // Superstar level
            spotifyPresence = 'global superstar';
          } else if (spotifyFollowers > 1000000 && spotifyPopularity > 70) {
            trendingScore = 8; // Major artist
            spotifyPresence = 'major artist';
          } else if (spotifyFollowers > 500000 && spotifyPopularity > 60) {
            trendingScore = 6; // Established artist
            spotifyPresence = 'established';
          } else if (spotifyFollowers > 100000 && spotifyPopularity > 50) {
            trendingScore = 4; // Rising artist
            spotifyPresence = 'rising';
          } else {
            trendingScore = 2; // Emerging artist
            spotifyPresence = 'emerging';
          }

          // Determine regional focus based on artist origin/name patterns
          const artistName = artist.name.toLowerCase();

          // More comprehensive regional detection
          if (artistName.includes('afro') || artistName.includes('afrobeat') || artistName.includes('burna') || artistName.includes('davido') || artistName.includes('wizkid')) {
            regionFocus = 'Africa';
          } else if (artistName.includes('reggae') || artistName.includes('dancehall') || artistName.includes('bob marley') || artistName.includes('chronixx')) {
            regionFocus = 'Caribbean';
          } else if (artistName.includes('k-pop') || artistName.includes('kpop') || artistName.includes('bts') || artistName.includes('blackpink') || artistName.includes('twice')) {
            regionFocus = 'Asia';
          } else if (artistName.includes('latin') || artistName.includes('reggaeton') || artistName.includes('bad bunny') || artistName.includes('j balvin') || artistName.includes('karol g')) {
            regionFocus = 'Latin America';
          } else if (artistName.includes('flamenco') || artistName.includes('rumba') || artistName.includes('rosalia')) {
            regionFocus = 'Spain';
          } else if (artistName.includes('bossa') || artistName.includes('samba') || artistName.includes('anitta')) {
            regionFocus = 'Brazil';
          } else if (artistName.includes('justin') || artistName.includes('bieber') || artistName.includes('taylor') || artistName.includes('swift')) {
            regionFocus = 'North America';
          } else if (artistName.includes('adele') || artistName.includes('ed sheeran') || artistName.includes('dua lipa')) {
            regionFocus = 'Europe';
          } else if (artistName.includes('olivia') || artistName.includes('rodrigo') || artistName.includes('billie') || artistName.includes('eilish')) {
            regionFocus = 'North America';
          } else {
            // Randomly assign to different regions for variety
            const regions = ['North America', 'Europe', 'Asia', 'Latin America', 'Africa', 'Caribbean', 'Australia'];
            regionFocus = regions[Math.floor(Math.random() * regions.length)];
          }

        } else {
          // Not on Spotify at all = emerging global artist
          trendingScore = 3;
          spotifyPresence = 'not_on_spotify';
          regionFocus = 'emerging markets';
        }

        // Include all tracks with trending potential (score >= 1)
        if (trendingScore >= 1) {
          // Get track preview URL
          const previewUrl = trackInfo.preview;

          // Get artist image
          const artistImage = artist.picture_medium || artist.picture || null;

          worldFirstTrends.push({
            id: `global_${trackInfo.id}`,
            country: regionFocus,
            countryCode: 'GLOBAL',
            genre: 'various', // Will be determined by artist analysis
            track: {
              id: trackInfo.id,
              title: trackInfo.title,
              previewUrl: previewUrl,
              duration: trackInfo.duration,
              rank: trackInfo.rank || worldFirstTrends.length + 1
            },
            artist: {
              id: artist.id,
              name: artist.name,
              imageUrl: artistImage,
              deezerUrl: artist.link
            },
            trendingScore: trendingScore,
            spotifyPresence: spotifyPresence,
            trendStrength: Math.floor(Math.random() * 30) + 70, // Mock trend strength 70-100%
            discoveredAt: new Date(),
            lastUpdated: new Date()
          });

          console.log(`🎯 Found underground gem: ${artist.name} - "${trackInfo.title}" (${regionFocus}) - Score: ${trendingScore}/10`);
        }

      } catch (trackError) {
        console.warn(`Error processing track ${track.id}:`, trackError.message);
      }
    }

    // Sort by trending score (highest first) and limit to top 20
    worldFirstTrends.sort((a, b) => b.trendingScore - a.trendingScore);
    const topTrends = worldFirstTrends.slice(0, 20);

    console.log(`✅ Found ${topTrends.length} World First underground trends`);
    return topTrends;

  } catch (error) {
    console.error('World First trends analysis error:', error.message);
    return [];
  }
}

// Get Deezer charts for specific country
async function getDeezerCountryCharts(countryCode) {
  try {
    // Deezer API uses 2-letter country codes, try the correct endpoint
    const response = await axios.get(`https://api.deezer.com/chart`, {
      timeout: 10000
    });

    // For now, return global charts since country-specific charts may not be available
    // The World First feature will work with global data
    console.log(`Using global Deezer charts for ${countryCode} (country-specific charts not available)`);
    return response.data;

  } catch (error) {
    console.warn(`Deezer country charts error for ${countryCode}:`, error.message);
    return null;
  }
}

// World First Trends endpoint
app.get('/api/world-first/trends', async (req, res) => {
  try {
    console.log('🌍 Fetching World First underground trends...');

    // Check cache first (cache for 6 hours)
    const cacheKey = 'world_first_trends';
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      console.log('📋 Returning cached World First trends');
      return res.json(cachedData);
    }

    // Generate fresh data
    const trends = await getWorldFirstTrends();

    // Cache the results
    await setCache(cacheKey, trends, 6 * 60 * 60 * 1000); // 6 hours

    console.log(`🎯 Returning ${trends.length} fresh World First trends`);
    res.json(trends);

  } catch (error) {
    console.error('World First trends endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch World First trends' });
  }
});

// World First by Country endpoint
app.get('/api/world-first/country/:countryCode', async (req, res) => {
  try {
    const countryCode = req.params.countryCode.toUpperCase();
    console.log(`🌍 Fetching World First trends for country: ${countryCode}`);

    const allTrends = await getWorldFirstTrends();
    const countryTrends = allTrends.filter(trend => trend.countryCode === countryCode);

    res.json(countryTrends);

  } catch (error) {
    console.error('World First country endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch country trends' });
  }
});

// World First Featured endpoint (top 5 for homepage)
app.get('/api/world-first/featured', async (req, res) => {
  try {
    console.log('🌟 Fetching featured World First trends (top 5)...');

    const allTrends = await getWorldFirstTrends();
    const featured = allTrends.slice(0, 5);

    res.json(featured);

  } catch (error) {
    console.error('World First featured endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch featured trends' });
  }
});

// Spotify Artist endpoint - Get fresh artist data from Spotify API
app.get('/api/spotify/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;

    console.log(`🎵 Fetching fresh Spotify data for artist ID: ${artistId}`);

    // Ensure Spotify auth
    if (!(await ensureSpotifyAuth())) {
      return res.status(500).json({ error: 'Spotify authentication failed' });
    }

    // Get artist data from Spotify
    const artistResponse = await spotifyApi.getArtist(artistId);
    const artist = artistResponse.body;

    // Get top tracks for monthly listeners estimate
    const topTracksResponse = await spotifyApi.getArtistTopTracks(artistId, 'US');
    const topTracks = topTracksResponse.body.tracks;

    // Estimate monthly listeners (rough calculation based on track popularity)
    const monthlyListeners = topTracks.reduce((total, track) => {
      return total + (track.popularity * 10000); // Rough estimate
    }, 0) / topTracks.length;

    // Return fresh Spotify data
    const artistData = {
      id: artist.id,
      name: artist.name,
      images: artist.images,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      external_urls: artist.external_urls,
      monthlyListeners: Math.round(monthlyListeners)
    };

    console.log(`✅ Fresh Spotify data for ${artist.name}: ${artist.followers.total.toLocaleString()} followers, ${Math.round(monthlyListeners).toLocaleString()} monthly listeners`);
    res.json(artistData);

  } catch (error) {
    console.error('Spotify artist endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch artist data from Spotify' });
  }
});

// Simple caching system
const cache = new Map();

async function getCache(key) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

async function setCache(key, data, ttlMs) {
  cache.set(key, {
    data: data,
    expires: Date.now() + ttlMs
  });
}

// Update cron job to include news collection
cron.schedule('0 */2 * * *', async () => { // Every 2 hours
  console.log('Running scheduled news collection...');
  await collectDailyNews();
});

// Weekly underground rankings update (every Sunday at 2 AM)
cron.schedule('0 2 * * 0', async () => {
  console.log('Running weekly underground rankings update...');
  try {
    // Import and run the underground populate script
    const { exec } = require('child_process');
    const path = require('path');

    exec('node underground_populate.js', {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer for output
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('Weekly underground update failed:', error);
        return;
      }
      console.log('Weekly underground update completed successfully');
      console.log('Output:', stdout);
      if (stderr) console.log('Stderr:', stderr);
    });
  } catch (err) {
    console.error('Error running weekly underground update:', err);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`MusicRx backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
