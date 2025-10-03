import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import SpotifyWebApi from 'spotify-web-api-node';

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
  ugRating: String,
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

async function updateCheData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    // Authenticate with Spotify
    if (!(await authenticateSpotify())) {
      console.error('Failed to authenticate with Spotify');
      return;
    }

    const correctArtistId = '5A7T1LAGJg5NXySBoIKUmF'; // From user's Spotify link

    console.log('🔍 Fetching fresh data for Che from Spotify...');

    // Get artist data from Spotify
    const artistResponse = await spotifyApi.getArtist(correctArtistId);
    const artist = artistResponse.body;

    console.log('✅ Found Che on Spotify:');
    console.log(`   Name: ${artist.name}`);
    console.log(`   Followers: ${artist.followers.total.toLocaleString()}`);
    console.log(`   Popularity: ${artist.popularity}/100`);
    console.log(`   Genres: ${artist.genres.join(', ')}`);

    // Get top tracks for monthly listeners estimate
    const topTracksResponse = await spotifyApi.getArtistTopTracks(correctArtistId, 'US');
    const topTracks = topTracksResponse.body.tracks;

    const monthlyListeners = topTracks.reduce((total, track) => {
      return total + (track.popularity * 10000);
    }, 0) / topTracks.length;

    console.log(`   Estimated Monthly Listeners: ${Math.round(monthlyListeners).toLocaleString()}`);

    // Update the Che entry in database
    const updateData = {
      artistId: correctArtistId,
      name: artist.name,
      genres: artist.genres,
      spotifyPopularity: artist.popularity,
      followers: artist.followers.total,
      monthlyListeners: Math.round(monthlyListeners),
      imageUrl: artist.images?.[0]?.url || null,
      lastUpdated: new Date()
    };

    const result = await UndergroundArtist.findOneAndUpdate(
      { name: 'Che' },
      updateData,
      { new: true }
    );

    if (result) {
      console.log('✅ Successfully updated Che with fresh Spotify data:');
      console.log(`   Followers: ${result.followers.toLocaleString()}`);
      console.log(`   Monthly Listeners: ${result.monthlyListeners.toLocaleString()}`);
      console.log(`   Popularity: ${result.spotifyPopularity}/100`);
    } else {
      console.log('❌ Failed to update Che entry');
    }

    // Update rankings
    console.log('📈 Updating rankings...');
    const allArtists = await UndergroundArtist.find().sort({ monthlyListeners: -1 });
    for (let i = 0; i < allArtists.length; i++) {
      await UndergroundArtist.findByIdAndUpdate(allArtists[i]._id, { ranking: i + 1 });
    }

    console.log('🎯 Che data update complete!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error updating Che data:', error);
  }
}

updateCheData();
