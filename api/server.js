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
import { TwitterApi } from 'twitter-api-v2';
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
    if (err.statusCode === 401) {
      console.log('Spotify token expired, refreshing...');
      return await authenticateSpotify();
    }
    console.error('Spotify auth check failed:', err.message);
    return false;
  }
}

authenticateSpotify();

// Discogs API setup
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
      }
    });
    const $ = cheerio.load(response.data);
    const reviewLink = $('.result-item a').first().attr('href');
    if (reviewLink) {
      const reviewUrl = `https://pitchfork.com${reviewLink}`;
      const reviewResponse = await axios.get(reviewUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $$ = cheerio.load(reviewResponse.data);
      const scoreText = $$('.score-box .score').text().trim();
      const score = parseFloat(scoreText);
      return isNaN(score) ? null : score;
    }
  } catch (err) {
    console.error('Pitchfork scrape error:', err);
  }
  return null;
}

async function getFantanoReview(title, artist) {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    const response = await youtube.search.list({
      part: 'snippet',
      q: `${title} ${artist} theneedledrop`,
      type: 'video',
      maxResults: 5
    });
    for (const item of response.data.items) {
      const videoTitle = item.snippet.title.toLowerCase();
      if (videoTitle.includes('album review') || videoTitle.includes('review')) {
        const videoId = item.id.videoId;
        const videoResponse = await youtube.videos.list({
          part: 'snippet',
          id: videoId
        });
        const description = videoResponse.data.items[0].snippet.description;
        const scoreMatch = description.match(/(\d+(\.\d+)?)\/10/);
        if (scoreMatch) {
          return parseFloat(scoreMatch[1]);
        }
      }
    }
  } catch (err) {
    console.error('Fantano error:', err);
  }
  return null;
}

async function getBillboardRank(title, artist) {
  // Note: Billboard does not have a free public API. For real implementation, consider paid services like Chartmetric or Billboard API.
  // As a placeholder, using a mock value. Replace with real integration.
  return Math.floor(Math.random() * 200) + 1; // Mock rank 1-200
}

// Fetch and review album
async function reviewAlbum(albumId) {
  try {
    console.log(`Reviewing album: ${albumId}`);

    // First, try to get album from Spotify
    let album;
    try {
      album = await spotifyApi.getAlbum(albumId);
      console.log(`Found album: ${album.body.name} by ${album.body.artists[0].name}`);
    } catch (spotifyErr) {
      console.error('Spotify API error:', spotifyErr.message);
      return { status: 'error', message: `Invalid album ID or Spotify API error: ${spotifyErr.message}` };
    }

    const releaseDate = new Date(album.body.release_date);
    const today = new Date(); // Use real date in production
    const daysSinceRelease = Math.floor((today - releaseDate) / (1000 * 60 * 60 * 24));

    if (daysSinceRelease < 7) {
      return {
        status: 'enqueued',
        readyBy: new Date(releaseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    const popularity = album.body.popularity;
    const streams = Math.round(popularity / 10);

    // Get real data from APIs
    const billboardRank = await getBillboardRank(album.body.name, album.body.artists[0].name) || 100;
    const billboard = Math.max(0, 10 - (billboardRank / 20));
    const sales = billboard * 0.9;

    // Get Pitchfork and Fantano scores
    const pitchforkScore = await scrapePitchfork(album.body.name, album.body.artists[0].name) || 7.5;
    const fantanoScore = await getFantanoReview(album.body.name, album.body.artists[0].name) || 8.0;

    // Get Discogs data
    const discogsData = await getDiscogsData(album.body.name, album.body.artists[0].name);
    const discogsRating = discogsData?.rating ? (discogsData.rating / 5) * 10 : 7.0; // Convert 5-point scale to 10-point

    // Mock sentiment for now
    const normalizedSentiment = 7.0;

    // Calculate weighted score including Discogs
    const avgReview = (pitchforkScore + fantanoScore + discogsRating) / 3;
    const score = (
      0.25 * streams +
      0.2 * sales +
      0.15 * billboard +
      0.25 * avgReview +
      0.15 * normalizedSentiment
    ).toFixed(1);

    const strengths = [];
    const weaknesses = [];

    // Generate more detailed and varied strengths
    if (streams > 8) {
      strengths.push('Exceptional streaming performance with massive daily plays');
      strengths.push('Strong digital presence and audience engagement');
    }
    if (billboard > 7) {
      strengths.push(`Impressive Billboard chart performance (#${billboardRank})`);
      strengths.push('Significant mainstream recognition and commercial success');
    }
    if (popularity > 70) {
      strengths.push('High popularity score indicating broad appeal');
      strengths.push('Widespread cultural impact and fanbase growth');
    }
    if (avgReview > 7) {
      strengths.push('Strong critical reception with positive reviews');
      strengths.push('Quality production and artistic merit recognized by critics');
    }

    // Add album-specific strengths based on release timing
    if (daysSinceRelease < 30) {
      strengths.push('Recent release with fresh, contemporary sound');
    } else if (daysSinceRelease < 180) {
      strengths.push('Established track record with proven staying power');
    }

    // Generate more detailed and varied weaknesses
    if (streams < 5) {
      weaknesses.push('Limited streaming numbers suggest niche appeal');
      weaknesses.push('Could benefit from increased marketing and promotion');
    }
    if (billboard < 5) {
      weaknesses.push('Lower chart performance indicates limited mainstream breakthrough');
    }
    if (popularity < 40) {
      weaknesses.push('Moderate popularity suggests room for broader audience expansion');
    }
    if (avgReview < 6) {
      weaknesses.push('Mixed critical reception with some divisive opinions');
      weaknesses.push('Production or artistic elements may not resonate with all listeners');
    }
    if (sales < 6) {
      weaknesses.push('Physical/digital sales performance could be stronger');
      weaknesses.push('Limited commercial impact despite streaming success');
    }

    // Add variety based on score ranges
    if (score < 6) {
      weaknesses.push('Overall execution falls short of expectations');
      weaknesses.push('Multiple areas need improvement for broader appeal');
    } else if (score > 8) {
      strengths.push('Outstanding overall quality and execution');
      strengths.push('Sets a high standard in multiple musical categories');
    }

    // Ensure we have at least 2-3 points each, but not too many
    const strengthOptions = [
      'Innovative production techniques and sound design',
      'Compelling lyrical content with meaningful themes',
      'Excellent vocal performances and delivery',
      'Cohesive album structure with strong sequencing',
      'Unique artistic vision and creative direction',
      'Strong instrumental arrangements and musicianship',
      'Effective use of modern production tools',
      'Emotional depth and authentic expression'
    ];

    const weaknessOptions = [
      'Some tracks lack the consistency of the best moments',
      'Production choices may not appeal to all listeners',
      'Lyrical content varies in quality and impact',
      'Album length could be more focused',
      'Some songs may not stand out individually',
      'Mix/mastering could be more polished',
      'Artistic risks don\'t always pay off',
      'Limited genre exploration or experimentation'
    ];

    // Add 1-2 random additional points to make it more detailed
    while (strengths.length < 3) {
      const randomStrength = strengthOptions[Math.floor(Math.random() * strengthOptions.length)];
      if (!strengths.includes(randomStrength)) {
        strengths.push(randomStrength);
      }
    }

    while (weaknesses.length < 3) {
      const randomWeakness = weaknessOptions[Math.floor(Math.random() * weaknessOptions.length)];
      if (!weaknesses.includes(randomWeakness)) {
        weaknesses.push(randomWeakness);
      }
    }

    // Limit to 4 points each for readability
    strengths.splice(4);
    weaknesses.splice(4);

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

// All-time rankings endpoint
app.get('/api/all-time-rankings', async (req, res) => {
  try {
    // Group by albumId and get the highest rated version for each album (no duplicates)
    const pipeline = [
      {
        $match: {
          status: 'reviewed'
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
      },
      {
        $limit: 100
      }
    ];

    const groupedResults = await Album.aggregate(pipeline);

    // Format the results
    const allTimeRankings = groupedResults.map(result => ({
      ...result.album,
      score: result.maxScore
    }));

    res.json(allTimeRankings);
  } catch (err) {
    console.error('All-time rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch all-time rankings' });
  }
});

// New releases endpoint (actual new Spotify releases)
app.get('/api/new-releases', async (req, res) => {
  try {
    console.log('Fetching new releases from Spotify...');

    // Ensure Spotify authentication is valid
    const isAuthenticated = await ensureSpotifyAuth();
    if (!isAuthenticated) {
      throw new Error('Failed to authenticate with Spotify');
    }

    // Try Spotify's new releases endpoint first
    try {
      console.log('Trying Spotify new releases endpoint...');
      const newReleasesResponse = await spotifyApi.getNewReleases({
        limit: 20,
        offset: 0,
        country: 'US'
      });

      console.log(`Spotify new releases endpoint returned ${newReleasesResponse.body.albums.items.length} albums`);

      if (newReleasesResponse.body.albums.items.length === 0) {
        throw new Error('No albums returned from new releases endpoint');
      }

      const newReleases = [];
      for (const album of newReleasesResponse.body.albums.items) {
        try {
          console.log(`Getting details for album: ${album.name}`);
          // Get full album details
          const fullAlbum = await spotifyApi.getAlbum(album.id);
          const albumData = fullAlbum.body;

          // Check if album is already in our database
          const existingAlbum = await Album.findOne({ albumId: albumData.id });

          newReleases.push({
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
          console.error(`Error getting album ${album.id}:`, albumErr.message);
          continue;
        }
      }

      // Sort by popularity
      newReleases.sort((a, b) => b.popularity - a.popularity);

      console.log(`Successfully fetched ${newReleases.length} new releases from Spotify`);
      return res.json(newReleases.slice(0, 12));

    } catch (newReleasesErr) {
      console.error('Spotify new releases endpoint failed:', newReleasesErr.message);
      console.error('Full error:', newReleasesErr);
      // Fall back to search approach
    }

    // Fallback: Search for recent popular albums
    console.log('Falling back to search approach...');
    const newReleases = [];
    const currentYear = new Date().getFullYear();

    // Search for popular albums from current year
    const response = await spotifyApi.searchAlbums(`year:${currentYear}`, {
      limit: 50,
      offset: 0,
      market: 'US'
    });

    console.log(`Search returned ${response.body.albums.items.length} albums`);

    for (const album of response.body.albums.items.slice(0, 20)) { // Take first 20
      if (album.album_type === 'album' && album.popularity > 10) {
        try {
          // Get full album details
          const fullAlbum = await spotifyApi.getAlbum(album.id);
          const albumData = fullAlbum.body;

          // Check if album is already in our database
          const existingAlbum = await Album.findOne({ albumId: albumData.id });

          newReleases.push({
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
          if (albumErr.statusCode !== 404) {
            console.error(`Error getting album ${album.id}:`, albumErr.message);
          }
          continue;
        }
      }
    }

    // Sort by popularity
    newReleases.sort((a, b) => b.popularity - a.popularity);

    console.log(`Found ${newReleases.length} albums via search fallback`);
    res.json(newReleases.slice(0, 12));

  } catch (err) {
    console.error('New releases error:', err);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// X/Twitter sharing endpoint
app.post('/api/share/:albumId', async (req, res) => {
  try {
    const albumId = req.params.albumId;

    // Get album data
    const album = await Album.findOne({ albumId });
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Check if image was uploaded
    if (!req.file && !req.body.image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET,
    });

    let mediaId = null;

    // Upload image to Twitter
    if (req.file) {
      // If multer was used
      const mediaData = req.file.buffer;
      const mediaType = req.file.mimetype;

      const mediaUpload = await twitterClient.v1.uploadMedia(mediaData, { mimeType: mediaType });
      mediaId = mediaUpload;
    } else if (req.body.image) {
      // If base64 image data
      const base64Data = req.body.image.replace(/^data:image\/png;base64,/, '');
      const mediaData = Buffer.from(base64Data, 'base64');

      const mediaUpload = await twitterClient.v1.uploadMedia(mediaData, { mimeType: 'image/png' });
      mediaId = mediaUpload;
    }

    if (!mediaId) {
      return res.status(500).json({ error: 'Failed to upload image to Twitter' });
    }

    // Create tweet text
    const tweetText = `I rated "${album.title}" by ${album.artist} a ${album.score}/10 on MusicRx!\n\nHighlights: ${album.strengths.slice(0, 2).join(', ')}\n\n#MusicRx #AlbumReview`;

    // Post tweet with image
    const tweet = await twitterClient.v2.tweet({
      text: tweetText,
      media: {
        media_ids: [mediaId]
      }
    });

    console.log('Tweet posted successfully:', tweet.data.id);

    res.json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/i/status/${tweet.data.id}`
    });

  } catch (error) {
    console.error('Twitter sharing error:', error);
    res.status(500).json({
      error: 'Failed to share to Twitter',
      details: error.message
    });
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`MusicRx backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
