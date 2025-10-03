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

async function removeYeat70Popularity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    console.log('🔍 Finding Yeat entries with 70/100 popularity...');

    // Find Yeat entries with popularity 70
    const yeat70Entries = await UndergroundArtist.find({
      name: { $regex: /yeat/i },
      $or: [
        { spotifyPopularity: 70 },
        { popularity: 70 }
      ]
    });

    if (yeat70Entries.length > 0) {
      console.log('Found Yeat entries with 70 popularity:');
      yeat70Entries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.monthlyListeners?.toLocaleString()} listeners, Popularity: ${entry.spotifyPopularity || entry.popularity}/100, ID: ${entry._id}`);
      });

      // Remove the entries
      for (const entry of yeat70Entries) {
        await UndergroundArtist.findByIdAndDelete(entry._id);
        console.log(`  ✗ Removed Yeat with 70 popularity (ID: ${entry._id})`);
      }

      // Update rankings after removal
      console.log('📈 Updating rankings...');
      const allArtists = await UndergroundArtist.find().sort({ monthlyListeners: -1 });
      for (let i = 0; i < allArtists.length; i++) {
        await UndergroundArtist.findByIdAndUpdate(allArtists[i]._id, { ranking: i + 1 });
      }

      console.log('✅ Successfully removed Yeat entries with 70 popularity');
    } else {
      console.log('❌ No Yeat entries with 70 popularity found');
    }

    // Verify remaining Yeat entries
    const remainingYeat = await UndergroundArtist.find({ name: { $regex: /yeat/i } });
    console.log(`\nRemaining Yeat entries: ${remainingYeat.length}`);
    remainingYeat.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.name}: ${entry.monthlyListeners?.toLocaleString()} listeners, Popularity: ${entry.spotifyPopularity || entry.popularity || 'undefined'}/100`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

removeYeat70Popularity();
