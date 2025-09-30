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
  lastUpdated: Date,

  // MEGA POWER additional metrics for transparency
  megaMetrics: {
    streamingScore: Number,
    criticalScore: Number,
    metadataScore: Number,
    culturalScore: Number,
    growthScore: Number,
    appleMusicStreams: Number,
    soundcloudEngagement: Number,
    totalApisUsed: Number,
    dataCompleteness: Number
  }
});
const UndergroundArtist = mongoose.model('UndergroundArtist', undergroundArtistSchema);

// Manual data from user (accurate current Spotify monthly listeners)
const manualData = {
  'Ken Carson': 7558777,
  'yeat': 16869308,
  'Destroy Lonely': 4300229,
  '1300SAINT': 298011,
  'che': 1013971,
  'summrs': 1167157,
  'Veeze': 2428678,
  'LUCKI': 6515363,
  'Nine Vicious': 471116,
  'nettspend': 1078222,
  'Molly Santana': 482939,
  'Sk8star': 79444,
  'sixbill': 154763,
  'Protect': 434625,
  'tana': 1004224,
  'jim legacy': 534791,
  'raq baby': 911293,
  'Eem Triplin': 1298636,
  '1900Rugrat': 1769628,
  'Prettifun': 270549,
  'untiljapan': 245256,
  'PlaqueBoyMax': 8521541,
  '2hollis': 4322977,
  'Brennan Jones': 111110,
  'ian': 6269946,
  'skaiwater': 509174,
  'Hardrock': 306968,
  'OsamaSon': 1349300,
  'Glokk40Spaz': 1156619,
  'Pradabagshawty': 386591,
  'Bladee': 1383197,
  'Otoboke Beaver': 62546,
  'Feng': 892392,
  'Quadeca': 583533,
  'Jorjiana': 886504,
  'k3': 62519,
  'benji blue billz': 671752
};

async function updateManualData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB for manual data update');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [artistName, monthlyListeners] of Object.entries(manualData)) {
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
          // Calculate UG rating based on new monthly listeners
          let ugRating = 'Unknown';
          if (monthlyListeners >= 10000000) {
            ugRating = 'Viral';
          } else if (monthlyListeners >= 1000000) {
            ugRating = 'Next Up';
          } else if (monthlyListeners >= 500000) {
            ugRating = 'On The Rise';
          } else if (monthlyListeners >= 100000) {
            ugRating = 'Known';
          }

          // Update the artist with manual data
          await UndergroundArtist.findByIdAndUpdate(artist._id, {
            monthlyListeners: monthlyListeners,
            ugRating: ugRating,
            lastUpdated: new Date()
          });

          console.log(`✅ Updated ${artistName}: ${monthlyListeners.toLocaleString()} listeners (${ugRating})`);
          updatedCount++;
        } else {
          console.log(`❌ Artist not found in database: ${artistName}`);
          notFoundCount++;
        }
      } catch (err) {
        console.error(`Error updating ${artistName}:`, err.message);
      }
    }

    console.log(`\n📊 Manual Data Update Complete:`);
    console.log(`✅ Updated: ${updatedCount} artists`);
    console.log(`❌ Not found: ${notFoundCount} artists`);

    // Show updated top 10
    console.log('\n🏆 Updated Top 10 Rankings:');
    const topArtists = await UndergroundArtist.find({})
      .sort({ monthlyListeners: -1 })
      .limit(10);

    topArtists.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name} - ${artist.monthlyListeners.toLocaleString()} listeners (${artist.ugRating})`);
    });

  } catch (error) {
    console.error('Error updating manual data:', error);
  } finally {
    await mongoose.connection.close();
  }
}

updateManualData();
