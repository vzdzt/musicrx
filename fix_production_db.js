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

// Reference data - correct monthly listeners from user
const referenceData = {
  'Ken Carson': 7558777,
  'Yeat': 16869308,
  'Destroy Lonely': 4300229,
  '1300Saint': 298011,
  'Che': 1013971,
  'Summrs': 1167157,
  'Veeze': 2428678,
  'LUCKI': 6515363, // Keep the one with more followers
  'Nine Viscous': 471116,
  'Nettspend': 1078222,
  'Molly Santana': 482939,
  'Sk8star': 79444,
  'Sixbill': 154763,
  'Protect': 434625,
  'Tana': 1004224,
  'Jim Legxacy': 534791,
  'Raq baby': 911293,
  'Eem Triplin': 1298636,
  '1900rugrat': 1769628,
  'Prettifun': 270549,
  'Untiljapan': 245256,
  'Plaqueboymax': 8521541,
  '2hollis': 4322977,
  'Brennan Jones': 111110,
  'ian': 6269946,
  'Skaiwater': 509174,
  'Hardrock': 306968,
  'OsamaSon': 1349300,
  'Glokk40Spazz': 1156619,
  'PradaBagShawty': 386591,
  'Bladee': 1383197,
  'Otoboke Beaver': 62546,
  'Feng Suave': 892392,
  'Quadeca': 583533,
  'Jorja Smith': 886504,
  'K3': 62519,
  'Benji Blue Bills': 671752,
  'ApolloRed1': 115976,
  'Bear1Boss': 30503,
  'Ohsxnta': 105323,
  'Rollin Thrax': 185252,
  'Kankan': 755160,
  'Yung Fazo': 448015,
  'Tezzus': 448015,
  'Skrilla': 2891450,
  'NoSaint': 5248,
  'Zukenee': 97691,
  'SouthSideSilhouette': 87367,
  '1oneam': 292436,
  'ThirteenDegrees': 105331,
  'Yung Kayo': 281507,
  'Lade': 70412,
  'Homixide Gang': 1261945,
  'Babystaydown': 35885,
  'Diorvsyou': 79327,
  'Bandanna$aint': 27689,
  'Unitus': 6533
};

async function fixProductionDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');

    console.log('🔧 Fixing production database...');

    // Step 1: Remove duplicate LUCKI (keep the one with more followers)
    const luckiEntries = await UndergroundArtist.find({ name: { $in: ['Lucki', 'LUCKI'] } });
    if (luckiEntries.length > 1) {
      console.log('📝 Removing duplicate LUCKI entries...');
      // Sort by followers descending, keep the first one
      luckiEntries.sort((a, b) => (b.followers || 0) - (a.followers || 0));
      for (let i = 1; i < luckiEntries.length; i++) {
        await UndergroundArtist.findByIdAndDelete(luckiEntries[i]._id);
        console.log(`  ✗ Removed LUCKI with ${luckiEntries[i].followers?.toLocaleString()} followers`);
      }
      console.log(`  ✓ Kept LUCKI with ${luckiEntries[0].followers?.toLocaleString()} followers`);
    }

    // Step 2: Update monthly listeners to match reference data
    console.log('📊 Updating monthly listeners to match reference data...');
    let updated = 0;
    for (const [artistName, correctListeners] of Object.entries(referenceData)) {
      const result = await UndergroundArtist.findOneAndUpdate(
        { name: artistName },
        { monthlyListeners: correctListeners },
        { new: true }
      );

      if (result) {
        console.log(`  ✓ Updated ${result.name}: ${result.monthlyListeners.toLocaleString()} listeners`);
        updated++;
      }
    }

    // Step 3: Verify Yeat is correct
    const yeatEntry = await UndergroundArtist.findOne({ name: 'Yeat' });
    if (yeatEntry) {
      console.log(`\n🎯 Yeat verification: ${yeatEntry.monthlyListeners.toLocaleString()} listeners`);
      if (yeatEntry.monthlyListeners !== 16869308) {
        await UndergroundArtist.findOneAndUpdate(
          { name: 'Yeat' },
          { monthlyListeners: 16869308 },
          { new: true }
        );
        console.log('  ✓ Fixed Yeat monthly listeners');
      }
    }

    // Step 4: Update rankings
    console.log('📈 Updating rankings...');
    const allArtists = await UndergroundArtist.find().sort({ monthlyListeners: -1 });
    for (let i = 0; i < allArtists.length; i++) {
      await UndergroundArtist.findByIdAndUpdate(allArtists[i]._id, { ranking: i + 1 });
    }

    const finalCount = await UndergroundArtist.countDocuments();
    console.log(`\n✅ Production database fixed!`);
    console.log(`   - Updated ${updated} artists`);
    console.log(`   - Total artists: ${finalCount}`);
    console.log(`   - Yeat: ${yeatEntry?.monthlyListeners.toLocaleString()} listeners (rank #1)`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error fixing production database:', error);
  }
}

fixProductionDatabase();
