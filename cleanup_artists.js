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
  ugRating: String, // UG (Underground) Rating replaces social sentiment
  recentGrowth: Number,
  lastUpdated: Date
});
const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

// Artists to remove
const artistsToRemove = [
  'talinwya',
  'remember sports',
  'squireel',
  'flower',
  'illuminati hotties',
  'hopalong',
  'hand habits'
];

async function cleanupArtists() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB for artist cleanup');

    let removedCount = 0;

    for (const artistName of artistsToRemove) {
      try {
        // Try different name variations to find the artist
        const nameVariations = [
          artistName,
          artistName.toLowerCase(),
          artistName.replace(/\s+/g, ''),
          artistName.replace(/\s+/g, '-'),
          artistName.replace(/\s+/g, '_')
        ];

        let artist = null;
        for (const nameVar of nameVariations) {
          artist = await UndergroundArtist.findOne({
            $or: [
              { name: new RegExp(`^${nameVar}$`, 'i') },
              { name: new RegExp(`^${nameVar.replace(/[^a-zA-Z0-9]/g, '')}$`, 'i') }
            ]
          });
          if (artist) break;
        }

        if (artist) {
          await UndergroundArtist.findByIdAndDelete(artist._id);
          console.log(`✅ Removed: ${artistName}`);
          removedCount++;
        } else {
          console.log(`❌ Not found: ${artistName}`);
        }
      } catch (err) {
        console.error(`Error removing ${artistName}:`, err.message);
      }
    }

    console.log(`\n🧹 Cleanup Complete:`);
    console.log(`✅ Removed: ${removedCount} artists`);
    console.log(`❌ Not found: ${artistsToRemove.length - removedCount} artists`);

    // Show remaining artist count
    const remainingCount = await UndergroundArtist.countDocuments();
    console.log(`📊 Remaining artists in database: ${remainingCount}`);

  } catch (error) {
    console.error('Error cleaning up artists:', error);
  } finally {
    await mongoose.connection.close();
  }
}

cleanupArtists();
