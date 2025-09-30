import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

    // User's specified list of underground rappers
    const undergroundArtists = [
      '1300SAINT', 'Apollored1', 'Babystaydown', 'Bandanna$aint', 'banhoes',
      'Bear1boss', 'Bleedlivin', 'Brennan Jones', 'Dellyvadova', 'Destroy lonely',
      'diamond*', 'Diorvsyou', 'eternalvail', 'Feng', 'Glokk40spaz',
      'Hardrock', 'Homixide gang', 'Kankan', 'Kels!', 'Ken Carson',
      'Kikotali', 'Kioracks', 'ladé', 'Lesgokev', 'Lil Righteous',
      'lilxt', 'Lucki', 'Maxon', 'Nate X', 'Nine Vicious',
      'nosaint', 'ohsxnta', 'Pradabagshawty', 'Prettifun', 'Protect',
      'Rickityrackzz', 'Rollin Thrax', 'rollinthrax', 'savehills', 'Seventhirtyatmorning',
      'shrimpasta', 'Sixbill', 'Sk8star', 'skaiwater', 'Southsidesilhouette',
      'Strxtch', 'tali the one', 'tana', 'Tezzus', 'Thirteendegrees',
      'Unitus', 'Untiljapan', 'Veeze', 'velarian', 'yung fazo',
      'Yung Kayo', 'zaan6below', 'Zukenee', '2hollis', '6evermir', '9geek',
      'osamason', 'che', 'otoboke beaver', 'molly santana', 'nettspend',
      'jace', 'plaqueboymax', 'k3', 'jorjiana', '1900rugrat'
    ];

    console.log(`Analyzing ${undergroundArtists.length} underground artists with real Spotify data...`);

    const analyzedArtists = [];

    for (const artistName of undergroundArtists) {
      try {
        let analysis = null;

        if (spotifyAuthenticated) {
          console.log(`Searching Spotify for: ${artistName}`);

          // Search for artist on Spotify
          const searchResults = await spotifyApi.searchArtists(artistName, { limit: 1 });

          if (!searchResults.body.artists.items.length) {
            console.log(`❌ No Spotify data found for: ${artistName}, skipping`);
            continue; // Skip this artist entirely
          }

          const artist = searchResults.body.artists.items[0];
          console.log(`✓ Found: ${artist.name} (${artist.popularity} popularity, ${artist.followers.total.toLocaleString()} followers)`);

          // Get top tracks for monthly listeners estimate
          let monthlyListeners = 0;
          try {
            const topTracksData = await spotifyApi.getArtistTopTracks(artist.id, 'US');
            const topTracks = topTracksData.body.tracks;

            // Estimate monthly listeners from top tracks
            monthlyListeners = topTracks.reduce((total, track) => {
              return total + (track.popularity * 15000); // Rough estimate based on popularity
            }, 0) / topTracks.length;
          } catch (err) {
            console.log(`Could not get top tracks for ${artistName}, using follower-based estimate`);
            monthlyListeners = artist.followers.total * 0.1; // Rough estimate
          }

          // Analyze artist with real data
          analysis = await analyzeUndergroundArtist(artist, monthlyListeners);
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

async function analyzeUndergroundArtist(artist, monthlyListeners) {
  try {
    const basePopularity = artist.popularity;
    const followers = artist.followers.total;

    // Social sentiment mock (would need real social media API)
    const socialSentiment = (Math.random() * 2 - 1);

    // Recent growth mock (would need historical data)
    const recentGrowth = Math.random() * 75 - 25;

    // Underground scoring algorithm with real data
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

    // Use real genres from Spotify
    const genres = artist.genres.length > 0 ? artist.genres : ['Hip Hop', 'Rap'];

    // Generate strengths and weaknesses based on real data
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

    if (basePopularity > 60) {
      weaknesses.push('Risk of losing underground appeal');
      weaknesses.push('May be transitioning to mainstream');
    }
    if (followers < 100000) {
      weaknesses.push('Limited fanbase size');
      weaknesses.push('Struggling for visibility');
    }
    if (monthlyListeners < 500000) {
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
      artistId: artist.id,
      name: artist.name,
      genres: genres,
      spotifyPopularity: basePopularity,
      monthlyListeners: Math.round(monthlyListeners),
      followers: followers,
      imageUrl: artist.images && artist.images[0] ? artist.images[0].url : `https://via.placeholder.com/300x300/333/666?text=${encodeURIComponent(artist.name)}`,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      strengths,
      weaknesses,
      socialSentiment: Math.round(socialSentiment * 100) / 100,
      recentGrowth: Math.round(recentGrowth * 100) / 100,
      lastUpdated: new Date()
    };

  } catch (err) {
    console.error('Error analyzing underground artist:', err);
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
