import mongoose from 'mongoose';
import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Sentiment from 'sentiment';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx')
  .then(() => console.log('MongoDB connected for auto-review'))
  .catch(err => console.error('MongoDB connection error:', err));

// Album schema
const albumSchema = new mongoose.Schema({
  albumId: String,
  title: String,
  artist: String,
  releaseDate: Date,
  status: String,
  score: Number,
  strengths: [String],
  weaknesses: [String],
  readyBy: Date,
  imageUrl: String,
  featured: { type: Boolean, default: false },
  ranking: Number
});
const Album = mongoose.model('Album', albumSchema);

// News Article schema for sentiment analysis
const newsArticleSchema = new mongoose.Schema({
  title: String,
  content: String,
  source: String,
  url: String,
  publishedAt: Date,
  category: String,
  sentiment: Number
});
const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);

// Underground Artist schema for additional data
const undergroundArtistSchema = new mongoose.Schema({
  artistId: String,
  name: String,
  monthlyListeners: Number,
  score: Number,
  ugRating: String
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
    console.log('✅ Spotify authenticated for auto-review');
    return true;
  } catch (err) {
    console.error('❌ Spotify auth failed:', err);
    return false;
  }
}

// Get recent albums from Spotify (last 14 days)
async function getRecentAlbums() {
  console.log('🔍 Searching for albums released in the last 14 days...');

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const albums = [];

  try {
    // Search for recent albums using year:2025 and filter by date
    const response = await spotifyApi.searchAlbums('year:2025', {
      limit: 50,
      offset: 0,
      market: 'US'
    });

    for (const album of response.body.albums.items) {
      try {
        // Get full album details
        const fullAlbum = await spotifyApi.getAlbum(album.id);
        const albumData = fullAlbum.body;

        // Check if released within last 14 days
        const releaseDate = new Date(albumData.release_date);
        if (releaseDate >= fourteenDaysAgo && albumData.album_type === 'album') {
          albums.push({
            id: albumData.id,
            name: albumData.name,
            artists: albumData.artists,
            release_date: albumData.release_date,
            popularity: albumData.popularity,
            images: albumData.images,
            genres: albumData.genres || []
          });
        }
      } catch (err) {
        console.warn(`Error getting album ${album.id}:`, err.message);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (err) {
    console.error('Error searching recent albums:', err);
  }

  console.log(`Found ${albums.length} albums released in the last 14 days`);
  return albums;
}

// Comprehensive 7-API album review system
async function reviewAlbumComprehensive(albumData) {
  console.log(`🎵 Reviewing: ${albumData.name} by ${albumData.artists[0].name}`);

  const artistName = albumData.artists[0].name;
  const albumTitle = albumData.name;

  // 1. SPOTIFY DATA (18% weight)
  const spotifyPopularity = albumData.popularity;
  const spotifyStreams = Math.round(spotifyPopularity / 10); // Rough estimate

  // 2. DISCOGS DATA (15% weight)
  const discogsRating = await getDiscogsRating(albumTitle, artistName);
  const discogsScore = discogsRating ? (discogsRating / 5) * 10 : 7.0;

  // 3. PITCHFORK SCORE (12% weight)
  const pitchforkScore = await scrapePitchfork(albumTitle, artistName);

  // 4. LAST.FM DATA (12% weight)
  const lastFmData = await getLastFmData(artistName);
  const lastFmScore = lastFmData ? Math.min(10, (lastFmData.listeners / 1000000) + (lastFmData.playcount / 100000000)) : 5.0;

  // 5. MUSICBRAINZ VERIFICATION (12% weight)
  const musicBrainzScore = await checkMusicBrainz(artistName) ? 8.0 : 6.0;

  // 6. DEEZER CHART DATA (11% weight)
  const deezerScore = await getDeezerData(artistName);

  // 7. NEWS SENTIMENT (10% weight)
  const newsSentiment = await getNewsSentiment(artistName, albumTitle);

  // Calculate final score
  const finalScore = (
    0.18 * spotifyStreams +
    0.15 * discogsScore +
    0.12 * (pitchforkScore || 6.0) +
    0.12 * lastFmScore +
    0.12 * musicBrainzScore +
    0.11 * deezerScore +
    0.10 * newsSentiment
  );

  // Generate strengths and weaknesses
  const { strengths, weaknesses } = generateAnalysis(albumData, {
    spotifyStreams,
    discogsScore,
    pitchforkScore,
    lastFmScore,
    musicBrainzScore,
    deezerScore,
    newsSentiment
  });

  return {
    status: 'reviewed',
    score: Math.round(finalScore * 10) / 10,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4)
  };
}

// Helper functions for each API
async function getDiscogsRating(title, artist) {
  try {
    const response = await axios.get('https://api.discogs.com/database/search', {
      params: {
        release_title: title,
        artist: artist,
        type: 'release',
        per_page: 5
      },
      headers: {
        'User-Agent': 'MusicRx/1.0'
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const release = response.data.results[0];
      return release.community?.rating?.average || null;
    }
  } catch (err) {
    console.warn('Discogs API error:', err.message);
  }
  return null;
}

async function scrapePitchfork(title, artist) {
  try {
    const searchUrl = `https://pitchfork.com/search/?query=${encodeURIComponent(title + ' ' + artist)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const reviewLink = $('.result-item a').first().attr('href');

    if (reviewLink) {
      const reviewUrl = `https://pitchfork.com${reviewLink}`;
      const reviewResponse = await axios.get(reviewUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $$ = cheerio.load(reviewResponse.data);
      const scoreText = $$('.score-box .score').text().trim();
      return parseFloat(scoreText) || null;
    }
  } catch (err) {
    console.warn('Pitchfork scrape error:', err.message);
  }
  return null;
}

async function getLastFmData(artistName) {
  try {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'artist.getinfo',
        artist: artistName,
        api_key: process.env.LASTFM_API_KEY || 'demo',
        format: 'json'
      },
      timeout: 5000
    });

    const artist = response.data.artist;
    return {
      listeners: parseInt(artist.stats?.listeners) || 0,
      playcount: parseInt(artist.stats?.playcount) || 0
    };
  } catch (err) {
    console.warn('Last.fm API error:', err.message);
  }
  return null;
}

async function checkMusicBrainz(artistName) {
  try {
    const response = await axios.get('https://musicbrainz.org/ws/2/artist/', {
      params: {
        query: artistName,
        limit: 1,
        fmt: 'json'
      },
      headers: {
        'User-Agent': 'MusicRx/1.0'
      },
      timeout: 5000
    });

    return response.data.artists && response.data.artists.length > 0;
  } catch (err) {
    console.warn('MusicBrainz API error:', err.message);
  }
  return false;
}

async function getDeezerData(artistName) {
  try {
    const response = await axios.get('https://api.deezer.com/search/artist', {
      params: {
        q: artistName,
        limit: 1
      },
      timeout: 5000
    });

    if (response.data.data && response.data.data.length > 0) {
      const artist = response.data.data[0];
      return Math.min(10, Math.max(3, artist.nb_fan / 100000)); // Scale fans to 3-10 score
    }
  } catch (err) {
    console.warn('Deezer API error:', err.message);
  }
  return 5.0; // Default
}

async function getNewsSentiment(artistName, albumTitle) {
  try {
    // Search for recent news about this artist/album
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentNews = await NewsArticle.find({
      $or: [
        { title: { $regex: artistName, $options: 'i' } },
        { content: { $regex: artistName, $options: 'i' } }
      ],
      publishedAt: { $gte: thirtyDaysAgo }
    }).limit(5);

    if (recentNews.length > 0) {
      const sentiment = new Sentiment();
      const avgSentiment = recentNews.reduce((sum, article) => {
        const analysis = sentiment.analyze(article.title + ' ' + article.content);
        return sum + analysis.score;
      }, 0) / recentNews.length;

      return Math.max(1, Math.min(10, 6 + (avgSentiment * 2)));
    }
  } catch (err) {
    console.warn('News sentiment analysis error:', err.message);
  }
  return 5.0; // Neutral default
}

function generateAnalysis(albumData, metrics) {
  const strengths = [];
  const weaknesses = [];

  // Spotify streaming strength
  if (metrics.spotifyStreams >= 8) {
    strengths.push('Exceptional streaming performance and audience reach');
  } else if (metrics.spotifyStreams >= 6) {
    strengths.push('Strong streaming momentum and growing popularity');
  }

  // Critical reception
  if (metrics.discogsScore >= 8.5) {
    strengths.push('Outstanding critical acclaim and collector value');
  }
  if (metrics.pitchforkScore && metrics.pitchforkScore >= 8.0) {
    strengths.push('Strong professional validation from music critics');
  }

  // Historical data
  if (metrics.lastFmScore >= 8.0) {
    strengths.push('Massive historical streaming legacy and fan engagement');
  }

  // Metadata quality
  if (metrics.musicBrainzScore >= 8.0) {
    strengths.push('Well-documented artist with comprehensive metadata');
  }

  // Chart performance
  if (metrics.deezerScore >= 8.0) {
    strengths.push('European market strength and international appeal');
  }

  // News sentiment
  if (metrics.newsSentiment >= 7.0) {
    strengths.push('Positive media coverage and cultural relevance');
  }

  // Generate weaknesses based on gaps
  if (metrics.spotifyStreams <= 5) {
    weaknesses.push('Building streaming presence and audience engagement');
  }
  if (metrics.discogsScore <= 6.0) {
    weaknesses.push('Developing critical reputation and industry recognition');
  }
  if (!metrics.pitchforkScore) {
    weaknesses.push('Limited professional music criticism coverage');
  }
  if (metrics.lastFmScore <= 6.0) {
    weaknesses.push('Growing historical streaming data and fan legacy');
  }

  // Add some variety for albums with good metrics
  const genericStrengths = [
    'Innovative production techniques and sound design',
    'Strong lyrical content and artistic vision',
    'Cohesive album structure and musical progression',
    'Excellent vocal performances and instrumentation',
    'Cultural impact and genre influence'
  ];

  const genericWeaknesses = [
    'Some tracks could benefit from further development',
    'Production choices may not appeal to all listeners',
    'Album length could be more optimized',
    'Certain elements require multiple listens to appreciate'
  ];

  // Add 1-2 random items if needed
  while (strengths.length < 3) {
    const randomStrength = genericStrengths[Math.floor(Math.random() * genericStrengths.length)];
    if (!strengths.includes(randomStrength)) {
      strengths.push(randomStrength);
    }
  }

  while (weaknesses.length < 3) {
    const randomWeakness = genericWeaknesses[Math.floor(Math.random() * genericWeaknesses.length)];
    if (!weaknesses.includes(randomWeakness)) {
      weaknesses.push(randomWeakness);
    }
  }

  return { strengths, weaknesses };
}

// Auto-review new releases
async function autoReviewNewReleases() {
  console.log('🤖 Starting auto-review of new releases...');

  try {
    // Authenticate Spotify
    if (!(await authenticateSpotify())) {
      console.error('Failed to authenticate Spotify');
      return;
    }

    // Get recent albums
    const recentAlbums = await getRecentAlbums();

    if (recentAlbums.length === 0) {
      console.log('No new albums found in the last 14 days');
      return;
    }

    console.log(`Found ${recentAlbums.length} new albums to review`);

    let reviewed = 0;
    let skipped = 0;

    for (const albumData of recentAlbums) {
      try {
        // Check if already reviewed
        const existing = await Album.findOne({ albumId: albumData.id });
        if (existing && existing.status === 'reviewed') {
          console.log(`⏭️  Skipping ${albumData.name} - already reviewed`);
          skipped++;
          continue;
        }

        // Review the album
        const review = await reviewAlbumComprehensive(albumData);

        // Save or update
        const albumDoc = {
          albumId: albumData.id,
          title: albumData.name,
          artist: albumData.artists[0].name,
          releaseDate: new Date(albumData.release_date),
          imageUrl: albumData.images[0]?.url,
          ...review
        };

        await Album.findOneAndUpdate(
          { albumId: albumData.id },
          albumDoc,
          { upsert: true, new: true }
        );

        reviewed++;
        console.log(`✅ Reviewed: ${albumData.name} by ${albumData.artists[0].name} - ${review.score}/10`);

        // Rate limiting between reviews
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error(`❌ Error reviewing ${albumData.name}:`, err.message);
      }
    }

    console.log(`\n🎯 Auto-review complete! Reviewed: ${reviewed}, Skipped: ${skipped}`);

  } catch (err) {
    console.error('Auto-review failed:', err);
  }
}

// Run the auto-review
autoReviewNewReleases().then(() => {
  console.log('🤖 Auto-review process finished');
  mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('Auto-review process failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
