import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const undergroundArtistSchema = new mongoose.Schema({
  artistId: String,
  name: String,
  monthlyListeners: Number,
  followers: Number,
  imageUrl: String
});

const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

async function checkProductionChe() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    console.log('🔍 Checking Che entries in production database...');

    const cheEntries = await UndergroundArtist.find({
      name: { $regex: /che/i }
    });

    console.log(`Found ${cheEntries.length} Che-related entries:`);

    cheEntries.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.name}`);
      console.log(`   Artist ID: ${entry.artistId || 'undefined'}`);
      console.log(`   Image URL: ${entry.imageUrl || 'undefined'}`);
      console.log(`   Monthly Listeners: ${entry.monthlyListeners?.toLocaleString()}`);
      console.log(`   Followers: ${entry.followers?.toLocaleString()}`);
      console.log(`   Database ID: ${entry._id}`);
    });

    // Check if Che exists with the expected artistId
    const cheWithCorrectId = await UndergroundArtist.findOne({
      artistId: '5A7T1LAGJg5NXySBoIKUmF'
    });

    if (cheWithCorrectId) {
      console.log('\n✅ Found Che with correct artistId!');
      console.log(`   Current image: ${cheWithCorrectId.imageUrl}`);
    } else {
      console.log('\n❌ Che with correct artistId not found in production database');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error checking production database:', error);
  }
}

checkProductionChe();
