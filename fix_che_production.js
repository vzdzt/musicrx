import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

async function fixCheProduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    console.log('🔧 Fixing Che entry in production database...');

    // The correct Che data
    const correctCheData = {
      artistId: '5A7T1LAGJg5NXySBoIKUmF', // Correct Spotify artist ID
      name: 'Che',
      monthlyListeners: 1013971, // From reference data
      followers: 303858, // Current followers from Spotify
      imageUrl: 'https://i.scdn.co/image/ab6761610000e5ebefc665aaf840aff546d743c2', // Correct image
      lastUpdated: new Date()
    };

    console.log('Correct Che data:');
    console.log(`   Artist ID: ${correctCheData.artistId}`);
    console.log(`   Followers: ${correctCheData.followers.toLocaleString()}`);
    console.log(`   Monthly Listeners: ${correctCheData.monthlyListeners.toLocaleString()}`);
    console.log(`   Image URL: ${correctCheData.imageUrl}`);

    // Find and update Che by name (since the artistId is wrong in production)
    const result = await UndergroundArtist.findOneAndUpdate(
      { name: 'Che' }, // Find by name since artistId is wrong
      correctCheData,
      { new: true }
    );

    if (result) {
      console.log('✅ Successfully updated Che in production:');
      console.log(`   Name: ${result.name}`);
      console.log(`   Artist ID: ${result.artistId}`);
      console.log(`   Followers: ${result.followers.toLocaleString()}`);
      console.log(`   Monthly Listeners: ${result.monthlyListeners.toLocaleString()}`);
      console.log(`   Image URL: ${result.imageUrl}`);
      console.log(`   Updated at: ${result.lastUpdated}`);
    } else {
      console.log('❌ Failed to find and update Che entry');
    }

    // Update rankings after the change
    console.log('📈 Updating rankings...');
    const allArtists = await UndergroundArtist.find().sort({ monthlyListeners: -1 });
    for (let i = 0; i < allArtists.length; i++) {
      await UndergroundArtist.findByIdAndUpdate(allArtists[i]._id, { ranking: i + 1 });
    }

    console.log('🎯 Che production fix complete!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error fixing Che in production:', error);
  }
}

fixCheProduction();
