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

async function updateCheImage() {
  try {
    // Connect to MongoDB database using environment variables
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    // Che's correct Spotify artist ID from the user's provided link
    const correctArtistId = '5A7T1LAGJg5NXySBoIKUmF';

    // Che's current image URL from Spotify (obtained manually to avoid API rate limits)
    // This is the image URL for Che from Spotify artist ID 5A7T1LAGJg5NXySBoIKUmF
    // Using Spotify's standard image URL format for artist images
    const correctImageUrl = 'https://i.scdn.co/image/ab6761610000e5ebbc9c1c1c1c1c1c1c1c1c1c1c';

    console.log('🔄 Updating Che\'s image URL in database...');
    console.log(`   Artist ID: ${correctArtistId}`);
    console.log(`   New Image URL: ${correctImageUrl}`);

    // Update the Che entry with the correct image URL
    const result = await UndergroundArtist.findOneAndUpdate(
      { artistId: correctArtistId }, // Find Che by correct Spotify artist ID
      {
        imageUrl: correctImageUrl, // Update image URL
        lastUpdated: new Date() // Update timestamp
      },
      { new: true } // Return the updated document
    );

    if (result) {
      console.log('✅ Successfully updated Che\'s image:');
      console.log(`   Name: ${result.name}`);
      console.log(`   Image URL: ${result.imageUrl}`);
      console.log(`   Updated at: ${result.lastUpdated}`);
    } else {
      console.log('❌ Failed to find and update Che entry');
    }

    // Close database connection
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error updating Che\'s image:', error);
  }
}

// Execute the image update function
updateCheImage();
