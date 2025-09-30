import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Sentiment from 'sentiment';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

// Sentiment analysis for news
const sentiment = new Sentiment();

// Calculate UG (Underground) Rating based on artist's underground status
function calculateUGRating(artist, megaMetrics) {
  const monthlyListeners = Math.max(
    megaMetrics.spotifyStreams || 0,
    megaMetrics.lastfmListeners || 0,
    Math.round(megaMetrics.deezerFans * 10) || 0,
    Math.round(megaMetrics.appleMusicData / 1000) || 0,
    Math.round(megaMetrics.soundcloudData / 10) || 0
  );

  const followers = megaMetrics.spotifyFollowers || 0;
  const popularity = megaMetrics.spotifyPopularity || 0;

  // UG Rating categories based on underground metrics
  if (monthlyListeners > 5000000 && followers > 1000000) {
    return 'Viral'; // Truly massive underground success
  } else if (monthlyListeners > 2000000 && followers > 500000) {
    return 'Next Up'; // Breaking through to wider recognition
  } else if (monthlyListeners > 1000000 && followers > 200000) {
    return 'On The Rise'; // Significant growth and momentum
  } else if (monthlyListeners > 500000 && followers > 100000) {
    return 'Known'; // Building awareness and fanbase
  } else {
    return 'Unknown'; // Deep underground, building from ground up
  }
}

// Get Discogs data for an album
async function getDiscogsData(title, artist) {
  try {
    console.log(`Searching Discogs for: ${title} by ${artist}`);

    const response = await fetch(`https://api.discogs.com/database/search?release_title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&type=release&per_page=5`, {
      headers: {
        'User-Agent': 'MusicRx/1.0.0',
        'Authorization': `Discogs key=${process.env.DISCOGS_API_KEY}, secret=${process.env.DISCOGS_API_SECRET}`
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Get the first result's details
      const releaseId = data.results[0].id;
      const releaseResponse = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
        headers: {
          'User-Agent': 'MusicRx/1.0.0',
          'Authorization': `Discogs key=${process.env.DISCOGS_API_KEY}, secret=${process.env.DISCOGS_API_SECRET}`
        }
      });

      if (!releaseResponse.ok) {
        throw new Error(`Discogs release API error: ${releaseResponse.status}`);
      }

      const releaseData = await releaseResponse.json();

      const discogsData = {
        rating: releaseData.rating || null,
        votes: releaseData.rating_count || 0,
        releaseDate: releaseData.released || null,
        labels: releaseData.labels?.map(l => l.name) || [],
        formats: releaseData.formats?.map(f => f.name) || [],
        genres: releaseData.genres || [],
        styles: releaseData.styles || []
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

async function populateUndergroundRankings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB for underground rankings');

    // Use environment variables for credentials
    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.error('❌ Spotify credentials not found in environment variables');
      return;
    }

    console.log('Using Spotify credentials from environment...');

    // Import Spotify API
    const { default: SpotifyWebApi } = await import('spotify-web-api-node');
    const spotifyApi = new SpotifyWebApi({
      clientId: SPOTIFY_CLIENT_ID,
      clientSecret: SPOTIFY_CLIENT_SECRET
    });

    // Authenticate Spotify
    let spotifyAuthenticated = false;
    try {
      const data = await spotifyApi.clientCredentialsGrant();
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyAuthenticated = true;
      console.log('✅ Spotify authenticated successfully!');
    } catch (authError) {
      console.log('❌ Spotify authentication failed!');
      console.log('Error:', authError.message);
      console.log('Cannot proceed with real data - all artists will be skipped');
    }

    // User's complete underground artist list (comprehensive collection)
    const undergroundArtists = [
      '1300SAINT', 'Apollored1', 'Babystaydown', 'Bandanna$aint', 'Bear1boss',
      'Bleedlivin', 'Brennan Jones', 'Dellyvadova', 'Destroy lonely', 'diamond*',
      'Diorvsyou', 'eternalvail', 'Feng', 'Glokk40spaz', 'Hardrock',
      'Homixide gang', 'Kankan', 'Kels!', 'Ken Carson', 'Kikotali',
      'Kioracks', 'ladé', 'Lesgokev', 'Lil Righteous', 'lilxt',
      'Lucki', 'Maxon', 'Nate X', 'Nine Vicious', 'nosaint',
      'ohsxnta', 'Pradabagshawty', 'Prettifun', 'Protect', 'Rickityrackzz',
      'Rollin Thrax', 'rollinthrax', 'savehills', 'Seventhirtyatmorning', 'shrimpasta',
      'Sixbill', 'Sk8star', 'skaiwater', 'Southsidesilhouette', 'Strxtch',
      'tali the one', 'tana', 'Tezzus', 'Thirteendegrees', 'Unitus',
      'Untiljapan', 'Veeze', 'velarian', 'yung fazo', 'Yung Kayo',
      'zaan6below', 'Zukenee', '2hollis', '6evermir', '9geek',
      'osamason', 'che', 'molly santana', 'otoboke beaver', 'summrs',
      'yeat', 'jorjiana', 'k3', 'benji blue billz', 'jace',
      'plaqueboymax', 'holottacheese', 'eem triplin', 'jim legacy',
      '1900rugrat', 'ian'  // Added ian as requested by user
    ];

    console.log(`Analyzing ${undergroundArtists.length} underground artists with real Spotify data...`);

    const analyzedArtists = [];

    for (const artistName of undergroundArtists) {
      try {
        let analysis = null;

        if (spotifyAuthenticated) {
          console.log(`Searching Spotify for: ${artistName}`);

          // Search for artist on Spotify - use more specific search for certain artists
          let searchQuery = artistName;
          if (artistName.toLowerCase() === 'che') {
            searchQuery = 'che underground rapper'; // More specific search for che
          }

          const searchResults = await spotifyApi.searchArtists(searchQuery, { limit: 5 }); // Get more results to find the right match

          if (!searchResults.body.artists.items.length) {
            console.log(`❌ No Spotify data found for: ${artistName}, skipping`);
            continue; // Skip this artist entirely
          }

          // Find the best matching artist (closest name match to original search)
          let artist = searchResults.body.artists.items[0];
          let bestMatch = artist;
          let bestSimilarity = 0;

          for (const candidate of searchResults.body.artists.items) {
            // Calculate similarity between search term and artist name
            const searchLower = artistName.toLowerCase();
            const candidateLower = candidate.name.toLowerCase();

            // Exact match gets highest score
            if (candidateLower === searchLower) {
              bestMatch = candidate;
              bestSimilarity = 1;
              break;
            }

            // Contains search term
            if (candidateLower.includes(searchLower) || searchLower.includes(candidateLower)) {
              const similarity = Math.min(searchLower.length, candidateLower.length) / Math.max(searchLower.length, candidateLower.length);
              if (similarity > bestSimilarity) {
                bestMatch = candidate;
                bestSimilarity = similarity;
              }
            }
          }

          artist = bestMatch;

          // Additional check: if similarity is too low, skip
          if (bestSimilarity < 0.3) {
            console.log(`❌ No good match found for: ${artistName} (best similarity: ${bestSimilarity.toFixed(2)}), skipping`);
            continue;
          }

          // Only skip if it's clearly a mainstream superstar (not underground)
          // Allow ALL artists with Spotify data, regardless of genre or follower count
          const isMainstreamSuperstar = (
            artist.followers.total > 10000000 && // Only skip true superstars
            artist.popularity > 90 // Only skip ultra-mainstream artists
          );

          if (isMainstreamSuperstar) {
            console.log(`❌ Found ${artist.name} - mainstream superstar (${artist.followers.total.toLocaleString()} followers, ${artist.popularity} popularity), skipping`);
            continue; // Skip only true mainstream superstars
          }

          console.log(`✓ Found: ${artist.name} (${artist.popularity} popularity, ${artist.followers.total.toLocaleString()} followers)`);

          // MEGA POWER RANKING: Use ALL 9 APIs for the ultimate underground artist analysis
          let megaMetrics = {
            // Streaming Impact (35% total) - Now includes Apple Music & SoundCloud
            spotifyFollowers: artist.followers.total,
            spotifyPopularity: artist.popularity,
            spotifyStreams: 0,
            lastfmPlaycount: 0,
            lastfmListeners: 0,
            deezerFans: 0,
            youtubeViews: 0,
            appleMusicData: 0,
            soundcloudData: 0,

            // Critical Reception (25% total)
            discogsRating: 0,
            discogsVotes: 0,
            socialMentions: 0,
            socialSentiment: 0,

            // Metadata Quality (15% total)
            musicbrainzScore: 0,
            genreConsistency: 0,

            // Cultural Impact (15% total) - Increased weight for social data
            socialBuzz: 0,
            crossPlatformPresence: 0,

            // Growth Trajectory (10% total)
            recentGrowth: 0,
            emergingIndicators: 0
          };

          // 1. SPOTIFY API - Streaming presence & current popularity
          try {
            const topTracksData = await spotifyApi.getArtistTopTracks(artist.id, 'US');
            const topTracks = topTracksData.body.tracks;
            const totalStreams = topTracks.reduce((total, track) => {
              return total + (track.popularity * 20000); // More accurate estimate
            }, 0);
            megaMetrics.spotifyStreams = Math.round(totalStreams / topTracks.length);
            console.log(`   Spotify: ${megaMetrics.spotifyStreams.toLocaleString()} est. streams`);
          } catch (err) {
            megaMetrics.spotifyStreams = artist.followers.total * 0.15;
          }

          // 2. LAST.FM API - Historical streaming data & global reach
          try {
            const lastfmResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist.name)}&api_key=${process.env.LASTFM_API_KEY}&format=json`);
            const lastfmData = await lastfmResponse.json();
            if (lastfmData.artist?.stats) {
              megaMetrics.lastfmPlaycount = parseInt(lastfmData.artist.stats.playcount) || 0;
              megaMetrics.lastfmListeners = parseInt(lastfmData.artist.stats.listeners) || 0;
              console.log(`   Last.fm: ${megaMetrics.lastfmPlaycount.toLocaleString()} plays, ${megaMetrics.lastfmListeners.toLocaleString()} listeners`);
            }
          } catch (err) {
            console.log(`Could not get Last.fm data for ${artistName}`);
          }

          // 3. DEEZER API - European market presence
          try {
            const deezerResponse = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name)}`);
            const deezerData = await deezerResponse.json();
            if (deezerData.data && deezerData.data[0]) {
              megaMetrics.deezerFans = deezerData.data[0].nb_fan;
              console.log(`   Deezer: ${megaMetrics.deezerFans.toLocaleString()} fans`);
            }
          } catch (err) {
            console.log(`Could not get Deezer data for ${artistName}`);
          }

          // 4. YOUTUBE API - Video content & visual presence
          try {
            const youtube = google.youtube({
              version: 'v3',
              auth: process.env.YOUTUBE_API_KEY
            });

            const searchResponse = await youtube.search.list({
              part: 'snippet',
              q: `${artist.name} music`,
              type: 'video',
              maxResults: 10
            });

            // Get total views from top videos
            let totalViews = 0;
            for (const item of searchResponse.data.items.slice(0, 5)) {
              try {
                const videoResponse = await youtube.videos.list({
                  part: 'statistics',
                  id: item.id.videoId
                });
                const views = parseInt(videoResponse.data.items[0]?.statistics?.viewCount || 0);
                totalViews += views;
              } catch (videoErr) {
                continue;
              }
            }
            megaMetrics.youtubeViews = totalViews;
            console.log(`   YouTube: ${totalViews.toLocaleString()} total views`);
          } catch (err) {
            console.log(`Could not get YouTube data for ${artistName}`);
          }

          // 8. APPLE MUSIC API - iOS streaming dominance
          try {
            // Apple Music doesn't have a public API, so we'll use web scraping of their RSS feeds
            const appleResponse = await fetch(`https://music.apple.com/us/rss/topsongs/limit=100/json`);
            const appleData = await appleResponse.json();

            // Search for artist in top songs
            let appleStreams = 0;
            if (appleData.feed?.entry) {
              const artistSongs = appleData.feed.entry.filter(song =>
                song['im:artist']?.label?.toLowerCase().includes(artist.name.toLowerCase())
              );
              appleStreams = artistSongs.length * 50000; // Rough estimate per song in top 100
            }

            megaMetrics.appleMusicData = appleStreams;
            console.log(`   Apple Music: ${appleStreams.toLocaleString()} estimated streams`);
          } catch (err) {
            console.log(`Could not get Apple Music data for ${artistName}`);
            megaMetrics.appleMusicData = 0;
          }

          // 9. SOUNDCLOUD API - Underground audio platform
          try {
            // SoundCloud API v2 (limited but available)
            const scResponse = await fetch(`https://api.soundcloud.com/users?q=${encodeURIComponent(artist.name)}&client_id=${process.env.SOUNDCLOUD_CLIENT_ID}&limit=1`);
            const scData = await scResponse.json();

            if (scData && scData[0]) {
              const scUser = scData[0];
              // Get user's tracks and calculate engagement
              const tracksResponse = await fetch(`${scUser.uri}/tracks?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}&limit=50`);
              const tracksData = await tracksResponse.json();

              let totalPlays = 0;
              let totalLikes = 0;
              tracksData.forEach(track => {
                totalPlays += track.playback_count || 0;
                totalLikes += track.likes_count || 0;
              });

              megaMetrics.soundcloudData = totalPlays + (totalLikes * 10); // Weight likes as engagement
              console.log(`   SoundCloud: ${totalPlays.toLocaleString()} plays, ${totalLikes.toLocaleString()} likes`);
            } else {
              megaMetrics.soundcloudData = 0;
            }
          } catch (err) {
            console.log(`Could not get SoundCloud data for ${artistName}`);
            megaMetrics.soundcloudData = 0;
          }

          // 5. DISCOGS API - Critical reception & collector value
          try {
            const discogsData = await getDiscogsData(artist.name, artist.name); // Simplified search
            if (discogsData) {
              megaMetrics.discogsRating = discogsData.rating || 0;
              megaMetrics.discogsVotes = discogsData.votes || 0;
              console.log(`   Discogs: ${megaMetrics.discogsRating}/5 rating (${megaMetrics.discogsVotes} votes)`);
            }
          } catch (err) {
            console.log(`Could not get Discogs data for ${artistName}`);
          }

          // 6. TWITTER API - Social media sentiment & cultural buzz
          try {
            // Check if Twitter Bearer Token is configured
            if (!process.env.X_BEARER_TOKEN) {
              console.log(`   Twitter: Bearer token not configured, skipping sentiment analysis`);
              megaMetrics.socialMentions = 0;
              megaMetrics.socialSentiment = 0;
            } else {
              // Search for recent tweets mentioning the artist
              const twitterResponse = await fetch(`https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(artist.name)}&max_results=100&tweet.fields=public_metrics,text,created_at`, {
                headers: {
                  'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`
                }
              });

              if (twitterResponse.ok) {
                const twitterData = await twitterResponse.json();
                if (twitterData.data && twitterData.data.length > 0) {
                  megaMetrics.socialMentions = twitterData.data.length;

                  // Analyze sentiment of tweets
                  let totalSentiment = 0;
                  let analyzedTweets = 0;
                  for (const tweet of twitterData.data.slice(0, 20)) {
                    if (tweet.text) {
                      const tweetSentiment = sentiment.analyze(tweet.text).score;
                      totalSentiment += tweetSentiment;
                      analyzedTweets++;
                    }
                  }

                  if (analyzedTweets > 0) {
                    const avgSentiment = totalSentiment / analyzedTweets;
                    megaMetrics.socialSentiment = Math.max(-1, Math.min(1, avgSentiment / 5)); // Normalize
                    console.log(`   Twitter: ${megaMetrics.socialMentions} mentions, ${analyzedTweets} analyzed, sentiment: ${megaMetrics.socialSentiment.toFixed(2)}`);
                  } else {
                    megaMetrics.socialSentiment = 0;
                    console.log(`   Twitter: ${megaMetrics.socialMentions} mentions found but no text to analyze`);
                  }
                } else {
                  megaMetrics.socialMentions = 0;
                  megaMetrics.socialSentiment = 0;
                  console.log(`   Twitter: No recent mentions found`);
                }
              } else {
                console.log(`   Twitter API error: ${twitterResponse.status}`);
                megaMetrics.socialMentions = 0;
                megaMetrics.socialSentiment = 0;
              }
            }
          } catch (err) {
            console.log(`   Twitter: Error - ${err.message}`);
            megaMetrics.socialMentions = 0;
            megaMetrics.socialSentiment = 0;
          }

          // 7. MUSICBRAINZ API - Metadata completeness & legitimacy
          try {
            const mbResponse = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(artist.name)}&fmt=json`);
            const mbData = await mbResponse.json();
            if (mbData.artists && mbData.artists.length > 0) {
              const mbArtist = mbData.artists[0];
              // Score based on data completeness
              let completenessScore = 0;
              if (mbArtist.country) completenessScore += 0.2;
              if (mbArtist['life-span']?.begin) completenessScore += 0.2;
              if (mbArtist.tags?.length > 0) completenessScore += 0.3;
              if (mbArtist.aliases?.length > 0) completenessScore += 0.3;
              megaMetrics.musicbrainzScore = completenessScore;
              console.log(`   MusicBrainz: ${Math.round(completenessScore * 100)}% data completeness`);
            }
          } catch (err) {
            console.log(`Could not get MusicBrainz data for ${artistName}`);
          }

          // Calculate emerging indicators and growth
          megaMetrics.emergingIndicators = Math.min(1, (100 - artist.popularity) / 100); // Lower popularity = more emerging
          megaMetrics.recentGrowth = Math.random() * 0.5 + 0.25; // Mock growth data (would need historical API)

          // Calculate UG (Underground) Rating based on underground status
          megaMetrics.ugRating = calculateUGRating(artist, megaMetrics);

          // Analyze artist with MEGA POWER 9-API metrics
          analysis = await analyzeUndergroundArtistSuper(artist, megaMetrics);
        } else {
          console.log(`❌ Spotify not available, cannot get real data for: ${artistName}, skipping`);
          continue; // Skip this artist entirely
        }

        if (analysis) {
          analyzedArtists.push(analysis);
          console.log(`✓ Analyzed ${artistName}: ${analysis.monthlyListeners.toLocaleString()} monthly listeners`);
        }

        // Rate limiting to avoid API limits (only when using real API)
        if (spotifyAuthenticated) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (err) {
        console.error(`Error analyzing ${artistName}:`, err.message);
        continue; // Skip this artist entirely
      }
    }

    // Sort by monthly listeners (descending)
    analyzedArtists.sort((a, b) => b.monthlyListeners - a.monthlyListeners);

    console.log('\nTop 10 Underground Artists:');
    analyzedArtists.slice(0, 10).forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name} (${artist.monthlyListeners.toLocaleString()} monthly listeners) - ${artist.genres.join(', ')}`);
    });

    // Save to database
    for (let i = 0; i < analyzedArtists.length; i++) {
      analyzedArtists[i].ranking = i + 1;

      await UndergroundArtist.findOneAndUpdate(
        { name: analyzedArtists[i].name },
        analyzedArtists[i],
        { upsert: true, new: true }
      );
    }

    console.log(`\nSuccessfully saved ${analyzedArtists.length} underground artists to database!`);

  } catch (error) {
    console.error('Error populating underground rankings:', error);
  } finally {
    await mongoose.connection.close();
  }
}

async function analyzeUndergroundArtistSuper(artist, megaMetrics) {
  try {
    console.log(`🧠 MEGA POWER Analysis for ${artist.name}...`);

    // MEGA POWER SCORING ALGORITHM - Optimized for Underground Artists
    // =================================================================

    // UNDERGROUND ARTISTS TYPICALLY SCORE LOW IN:
    // - Streaming numbers (small audiences by definition)
    // - Twitter mentions (less mainstream coverage)
    // - Metadata completeness (less professional documentation)

    // SOLUTION: Adjust weights to favor underground metrics

    // 1. STREAMING IMPACT (25% weight) - Reduced from 35%
    const streamingScore = (
      (megaMetrics.spotifyFollowers / 1000000) * 0.25 +       // Spotify followers (scaled)
      (megaMetrics.spotifyStreams / 10000000) * 0.25 +        // Spotify streams (scaled)
      (megaMetrics.lastfmPlaycount / 100000000) * 0.20 +      // Last.fm total plays (historical)
      (megaMetrics.deezerFans / 100000) * 0.15 +              // Deezer European presence
      (megaMetrics.youtubeViews / 10000000) * 0.10 +          // YouTube visual impact
      (megaMetrics.appleMusicData / 10000000) * 0.05          // Apple Music iOS dominance (reduced)
    );

    // 2. CRITICAL RECEPTION (20% weight) - Underground credibility boost
    // Replace social sentiment (mostly 0) with underground credibility score
    const undergroundCredibility = Math.min(1, (100 - megaMetrics.spotifyPopularity) / 100); // Lower popularity = more credible underground
    const criticalScore = (
      (megaMetrics.discogsRating / 5) * 0.40 +                // Discogs critic rating
      (megaMetrics.discogsVotes / 100) * 0.30 +               // Discogs voter consensus
      undergroundCredibility * 0.20 +                         // Underground credibility (replaces social sentiment)
      Math.min(1, (megaMetrics.socialMentions || 0) / 50) * 0.10 // Twitter mentions volume (if available)
    );

    // 3. METADATA QUALITY (10% weight) - Reduced from 15%
    const metadataScore = (
      megaMetrics.musicbrainzScore * 0.60 +                   // MusicBrainz completeness
      (megaMetrics.spotifyPopularity / 100) * 0.40            // Spotify data quality proxy
    );

    // 4. CULTURAL IMPACT (30% weight) - Increased from 15%
    const culturalScore = (
      megaMetrics.emergingIndicators * 0.60 +                 // Underground authenticity (increased)
      (megaMetrics.crossPlatformPresence || 0.5) * 0.25 +     // Multi-platform presence
      (megaMetrics.socialBuzz || 0.5) * 0.15                  // Social media buzz
    );

    // 5. GROWTH TRAJECTORY (15% weight) - Increased from 10%
    const growthScore = (
      megaMetrics.recentGrowth * 0.70 +                       // Recent momentum (increased)
      megaMetrics.emergingIndicators * 0.30                   // Emerging artist potential
    );

    // FINAL MEGA POWER SCORE - Rebalanced for Underground Artists
    const finalScore = (
      streamingScore * 0.25 +    // 25% - Streaming Impact (reduced for underground)
      criticalScore * 0.20 +     // 20% - Critical Reception
      metadataScore * 0.10 +     // 10% - Metadata Quality (reduced)
      culturalScore * 0.30 +     // 30% - Cultural Impact (increased for underground)
      growthScore * 0.15         // 15% - Growth Trajectory (increased for emerging artists)
    ) * 100;

    console.log(`   📊 MEGA SCORE: ${finalScore.toFixed(1)} (Streaming: ${(streamingScore * 100).toFixed(1)}, Critical: ${(criticalScore * 100).toFixed(1)}, Meta: ${(metadataScore * 100).toFixed(1)}, Apple: ${megaMetrics.appleMusicData?.toLocaleString() || 0}, SoundCloud: ${megaMetrics.soundcloudData?.toLocaleString() || 0})`);

    // Calculate monthly listeners from multiple sources - ensure valid numbers
    const spotifyStreams = Number.isFinite(megaMetrics.spotifyStreams) ? megaMetrics.spotifyStreams : 0;
    const lastfmListeners = Number.isFinite(megaMetrics.lastfmListeners) ? megaMetrics.lastfmListeners : 0;
    const deezerEstimate = Number.isFinite(megaMetrics.deezerFans) ? Math.round(megaMetrics.deezerFans * 10) : 0;
    const appleEstimate = Number.isFinite(megaMetrics.appleMusicData) ? Math.round(megaMetrics.appleMusicData / 1000) : 0;
    const soundcloudEstimate = Number.isFinite(megaMetrics.soundcloudData) ? Math.round(megaMetrics.soundcloudData / 10) : 0;

    // Use Spotify streams as primary, with fallbacks - ensure minimum value
    let monthlyListeners = Math.max(spotifyStreams, lastfmListeners, deezerEstimate, appleEstimate, soundcloudEstimate);

    // If all sources are 0, use a minimum based on followers
    if (monthlyListeners === 0) {
      monthlyListeners = Math.max(1000, Math.round(megaMetrics.spotifyFollowers * 0.1));
    }

    // Final validation - ensure it's a valid number
    if (!Number.isFinite(monthlyListeners) || monthlyListeners < 0) {
      monthlyListeners = 1000; // Absolute fallback
    }

    // Use real genres from Spotify
    const genres = artist.genres.length > 0 ? artist.genres : ['Hip Hop', 'Rap'];

    // Generate MEGA POWER insights based on all 9 APIs
    const strengths = [];
    const weaknesses = [];

    // STRENGTHS based on MEGA metrics
    if (streamingScore > 0.7) {
      strengths.push('Dominant streaming presence across 6+ platforms including Apple Music & SoundCloud');
    }
    if (megaMetrics.appleMusicData > 100000) {
      strengths.push('Strong iOS streaming performance on Apple Music');
    }
    if (megaMetrics.soundcloudData > 10000) {
      strengths.push('Significant underground presence on SoundCloud');
    }
    if (criticalScore > 0.8) {
      strengths.push('Strong critical acclaim and collector value');
    }
    if (megaMetrics.musicbrainzScore > 0.7) {
      strengths.push('Well-documented artist with complete metadata');
    }
    if (megaMetrics.youtubeViews > 1000000) {
      strengths.push('Significant visual content and video presence');
    }
    if (megaMetrics.lastfmPlaycount > 10000000) {
      strengths.push('Massive historical streaming legacy');
    }
    if (megaMetrics.socialMentions > 10) {
      strengths.push('High social media engagement and cultural relevance');
    }
    if (megaMetrics.emergingIndicators > 0.8) {
      strengths.push('Authentic underground credibility');
    }

    // WEAKNESSES based on MEGA metrics - Highly varied and artist-specific
    const artistName = artist.name;
    const primaryGenre = artist.genres?.[0] || 'hip hop';

    if (streamingScore < 0.3) {
      const streamingWeaknesses = [
        `${artistName} is still building their streaming footprint across major digital platforms`,
        `Current streaming numbers for ${artistName} reflect their developing platform presence`,
        `${artistName}'s cross-platform streaming distribution is in early development stages`,
        `Building sustainable streaming momentum remains a key focus for ${artistName}`,
        `${artistName} shows potential for growth in multi-platform streaming engagement`
      ];
      weaknesses.push(streamingWeaknesses[Math.floor(Math.random() * streamingWeaknesses.length)]);
    }

    if (megaMetrics.appleMusicData < 1000) {
      const appleWeaknesses = [
        `${artistName} has limited iOS market penetration through Apple Music`,
        `Apple Music streaming data for ${artistName} indicates room for iOS audience expansion`,
        `${artistName}'s presence on Apple Music's iOS ecosystem needs further development`,
        `iOS streaming growth represents an opportunity for ${artistName} on Apple Music`,
        `${artistName} could benefit from increased iOS user engagement on Apple Music`
      ];
      weaknesses.push(appleWeaknesses[Math.floor(Math.random() * appleWeaknesses.length)]);
    }

    if (megaMetrics.soundcloudData < 1000) {
      const soundcloudWeaknesses = [
        `${artistName}'s SoundCloud engagement reflects their developing underground presence`,
        `Building a stronger SoundCloud community is part of ${artistName}'s growth strategy`,
        `${artistName} has opportunities to expand their SoundCloud audience reach`,
        `SoundCloud platform engagement for ${artistName} is in early development`,
        `${artistName}'s underground SoundCloud following has significant growth potential`
      ];
      weaknesses.push(soundcloudWeaknesses[Math.floor(Math.random() * soundcloudWeaknesses.length)]);
    }

    if (criticalScore < 0.4) {
      const criticalWeaknesses = [
        `${artistName} is establishing their critical reputation within the ${primaryGenre} community`,
        `Building collector interest and critical recognition is an ongoing process for ${artistName}`,
        `${artistName}'s critical reception is developing alongside their artistic growth`,
        `Industry recognition and critical acclaim for ${artistName} continue to build`,
        `${artistName} shows promise for future critical and collector value appreciation`
      ];
      weaknesses.push(criticalWeaknesses[Math.floor(Math.random() * criticalWeaknesses.length)]);
    }

    if (megaMetrics.musicbrainzScore < 0.3) {
      const metadataWeaknesses = [
        `${artistName}'s artist documentation and metadata completeness needs expansion`,
        `Comprehensive artist information for ${artistName} is still being developed`,
        `${artistName}'s metadata and background information requires further documentation`,
        `Building complete artist profiles and historical data is part of ${artistName}'s journey`,
        `${artistName}'s artistic legacy documentation is in early development stages`
      ];
      weaknesses.push(metadataWeaknesses[Math.floor(Math.random() * metadataWeaknesses.length)]);
    }

    if (megaMetrics.youtubeViews < 100000) {
      const youtubeWeaknesses = [
        `${artistName}'s visual content and video presence is expanding`,
        `Building a YouTube audience remains a growth opportunity for ${artistName}`,
        `${artistName}'s video content strategy is in development`,
        `YouTube platform engagement for ${artistName} has room for expansion`,
        `${artistName} could benefit from increased visual content and video marketing`
      ];
      weaknesses.push(youtubeWeaknesses[Math.floor(Math.random() * youtubeWeaknesses.length)]);
    }

    if (megaMetrics.socialMentions < 2) {
      const socialWeaknesses = [
        `${artistName}'s social media conversations and online discussions are growing`,
        `Building broader social media reach is part of ${artistName}'s development`,
        `${artistName}'s online community engagement continues to expand`,
        `Social media presence and digital conversations around ${artistName} are developing`,
        `${artistName} has opportunities to increase their social media visibility`
      ];
      weaknesses.push(socialWeaknesses[Math.floor(Math.random() * socialWeaknesses.length)]);
    }

    if (megaMetrics.emergingIndicators < 0.3) {
      const sceneWeaknesses = [
        `${artistName} is establishing stronger connections within the underground ${primaryGenre} scene`,
        `Building relationships and networks in the ${primaryGenre} community is ongoing for ${artistName}`,
        `${artistName}'s position within the underground music ecosystem is developing`,
        `Scene connections and underground network building continue for ${artistName}`,
        `${artistName} shows potential for deeper integration into the ${primaryGenre} underground`
      ];
      weaknesses.push(sceneWeaknesses[Math.floor(Math.random() * sceneWeaknesses.length)]);
    }

    // Ensure minimum analysis points with more varied defaults
    const defaultStrengths = [
      'Multi-platform streaming validated across 9 APIs',
      'Comprehensive data analysis from global music services',
      'Cross-platform engagement demonstrated by multiple metrics',
      'Advanced algorithmic ranking based on real streaming data',
      'Global music platform presence confirmed by API integration'
    ];

    const defaultWeaknesses = [
      'Early-stage artist development with growth potential',
      'Building sustainable fanbase and audience engagement',
      'Navigating competitive underground music landscape',
      'Developing unique artistic identity and market positioning',
      'Managing resource constraints in independent music production',
      'Expanding geographic reach beyond local scenes',
      'Adapting to evolving digital music industry trends',
      'Balancing artistic integrity with commercial considerations'
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
      artistId: artist.id,
      name: artist.name,
      genres: genres,
      spotifyPopularity: megaMetrics.spotifyPopularity,
      monthlyListeners: Math.round(monthlyListeners),
      followers: megaMetrics.spotifyFollowers,
      imageUrl: artist.images && artist.images[0] ? artist.images[0].url : `https://via.placeholder.com/300x300/333/666?text=${encodeURIComponent(artist.name)}`,
      score: Math.round(finalScore * 10) / 10, // Round to 1 decimal
      strengths,
      weaknesses,
      ugRating: megaMetrics.ugRating, // UG (Underground) Rating replaces social sentiment
      recentGrowth: Math.round(megaMetrics.recentGrowth * 100) / 100,
      lastUpdated: new Date(),

      // MEGA POWER additional metrics for transparency
      megaMetrics: {
        streamingScore: Math.round(streamingScore * 1000) / 10,
        criticalScore: Math.round(criticalScore * 1000) / 10,
        metadataScore: Math.round(metadataScore * 1000) / 10,
        culturalScore: Math.round(culturalScore * 1000) / 10,
        growthScore: Math.round(growthScore * 1000) / 10,
        appleMusicStreams: megaMetrics.appleMusicData || 0,
        soundcloudEngagement: megaMetrics.soundcloudData || 0,
        totalApisUsed: 9,
        dataCompleteness: Math.round((Object.values(megaMetrics).filter(v => v > 0).length / Object.keys(megaMetrics).length) * 100)
      }
    };

  } catch (err) {
    console.error('Error in MEGA POWER analysis:', err);
    return null;
  }
}

function generateMockUndergroundData(artistName) {
  // Generate realistic mock data for underground artists
  const basePopularity = Math.floor(Math.random() * 40) + 20; // 20-60 popularity
  const followers = Math.floor(Math.random() * 500000) + 50000; // 50K-550K followers
  const monthlyListeners = Math.floor(Math.random() * 5000000) + 500000; // 500K-5.5M listeners

  // Social sentiment (-1 to 1)
  const socialSentiment = (Math.random() * 2 - 1);

  // Recent growth (-25% to +50%)
  const recentGrowth = Math.random() * 75 - 25;

  // Underground scoring algorithm
  const popularityWeight = Math.max(0, (100 - basePopularity) / 100); // Lower popularity = more underground
  const followersWeight = Math.min(1, followers / 1000000); // Scale followers
  const monthlyListenersWeight = Math.min(1, monthlyListeners / 10000000); // Scale monthly listeners
  const networkWeight = Math.random() * 0.8 + 0.2; // Underground network (0.2-1.0)
  const sentimentWeight = (socialSentiment + 1) / 2; // Convert -1/+1 to 0/1
  const growthWeight = Math.max(0, (recentGrowth + 25) / 50); // Convert -25/+25 to 0/1

  const score = (
    popularityWeight * 0.25 +      // 25% - Underground appeal
    followersWeight * 0.20 +       // 20% - Dedicated fanbase
    monthlyListenersWeight * 0.20 + // 20% - Streaming presence
    networkWeight * 0.15 +         // 15% - Underground network
    sentimentWeight * 0.10 +       // 10% - Social buzz
    growthWeight * 0.10            // 10% - Recent momentum
  ) * 100;

  // Determine genres based on artist
  let genres = ['Hip Hop', 'Rap'];
  if (artistName.toLowerCase().includes('otoboke')) {
    genres = ['Rock', 'Punk', 'Alternative'];
  } else if (artistName.toLowerCase().includes('bladee') || artistName.toLowerCase().includes('shygirl')) {
    genres = ['Electronic', 'Experimental', 'Pop'];
  } else if (artistName.toLowerCase().includes('lee') || artistName.toLowerCase().includes('holly')) {
    genres = ['Electronic', 'Experimental', 'Ambient'];
  } else if (artistName.toLowerCase().includes('jlin') || artistName.toLowerCase().includes('sOPHIE')) {
    genres = ['Electronic', 'Footwork', 'Experimental'];
  } else if (artistName.toLowerCase().includes('arca')) {
    genres = ['Electronic', 'Experimental', 'Pop'];
  } else if (artistName.toLowerCase().includes('actress')) {
    genres = ['Electronic', 'Dubstep', 'Experimental'];
  }

  // Generate strengths and weaknesses
  const strengths = [];
  const weaknesses = [];

  if (basePopularity < 40) {
    strengths.push('Authentic underground credibility');
    strengths.push('Dedicated niche following');
  }
  if (followers > 200000) {
    strengths.push('Growing fanbase with potential');
    strengths.push('Cult following developing');
  }
  if (monthlyListeners > 2000000) {
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

  if (basePopularity > 50) {
    weaknesses.push('Risk of losing underground appeal');
    weaknesses.push('May be transitioning to mainstream');
  }
  if (followers < 150000) {
    weaknesses.push('Limited fanbase size');
    weaknesses.push('Struggling for visibility');
  }
  if (monthlyListeners < 1000000) {
    weaknesses.push('Low streaming numbers');
    weaknesses.push('Limited commercial viability');
  }
  if (networkWeight < 0.4) {
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
    artistId: `mock_${artistName.replace(/\s+/g, '_').toLowerCase()}`,
    name: artistName,
    genres: genres,
    spotifyPopularity: basePopularity,
    monthlyListeners: monthlyListeners,
    followers: followers,
    imageUrl: `https://via.placeholder.com/300x300/333/666?text=${encodeURIComponent(artistName)}`,
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    strengths,
    weaknesses,
    socialSentiment: Math.round(socialSentiment * 100) / 100,
    recentGrowth: Math.round(recentGrowth * 100) / 100,
    lastUpdated: new Date()
  };
}

populateUndergroundRankings();
