import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const undergroundArtistSchema = new mongoose.Schema({
  artistId: String, name: String, genres: [String], spotifyPopularity: Number,
  monthlyListeners: Number, followers: Number, imageUrl: String, score: Number,
  ranking: Number, strengths: [String], weaknesses: [String], ugRating: String,
  recentGrowth: Number, lastUpdated: Date
});
const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

async function updateFinalArtists() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB');

    // Update the final 3 artists
    const updates = [
      { name: 'Glokk40Spaz', listeners: 1156619 },
      { name: 'Benji', listeners: 671752 },
      { name: '1oneam', listeners: 301433 }
    ];

    for (const update of updates) {
      const result = await UndergroundArtist.updateOne(
        { name: update.name },
        {
          monthlyListeners: update.listeners,
          lastUpdated: new Date()
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${update.name} to ${update.listeners.toLocaleString()} listeners`);
      } else {
        console.log(`❌ No artist found with name: ${update.name}`);
      }
    }

    console.log('\n🎯 Final updates completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

updateFinalArtists();
