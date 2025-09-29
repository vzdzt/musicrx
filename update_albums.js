import mongoose from 'mongoose';

// Album schema
const albumSchema = new mongoose.Schema({
  albumId: String,
  title: String,
  artist: String,
  score: Number,
  strengths: [String],
  weaknesses: [String]
});
const Album = mongoose.model('Album', albumSchema);

async function updateAlbums() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB');

    // Update Rebel by Anna Wise
    await Album.findOneAndUpdate(
      { title: 'Rebel' },
      {
        strengths: [
          'Exceptional vocal delivery with raw emotional intensity',
          'Innovative fusion of R&B, soul, and experimental elements',
          'Powerful lyrical content addressing personal and social themes'
        ],
        weaknesses: [
          'Some tracks may feel too abstract for mainstream audiences',
          'Occasional pacing issues with experimental sections',
          'Limited commercial appeal due to artistic complexity'
        ]
      }
    );

    // Update Utopia by Björk
    await Album.findOneAndUpdate(
      { title: 'Utopia' },
      {
        strengths: [
          'Revolutionary approach to electronic music production',
          'Björk\'s unparalleled vocal experimentation and range',
          'Innovative use of technology and sound design'
        ],
        weaknesses: [
          'Highly experimental nature may alienate casual listeners',
          'Complex soundscapes require focused attention',
          'Some tracks may feel disjointed or challenging'
        ]
      }
    );

    // Update Tortured Poets by Taylor Swift
    await Album.findOneAndUpdate(
      { title: 'Tortured Poets' },
      {
        strengths: [
          'Taylor Swift\'s most personal and vulnerable songwriting yet',
          'Exceptional lyrical depth exploring complex relationships',
          'Masterful storytelling that feels intimately confessional'
        ],
        weaknesses: [
          'Some tracks may feel too emotionally heavy for casual listening',
          'Production occasionally overshadows the intimate lyrics',
          'Lengthy runtime may be daunting for some listeners'
        ]
      }
    );

    // Update Damn by Kendrick Lamar
    await Album.findOneAndUpdate(
      { title: 'Damn' },
      {
        strengths: [
          'Kendrick Lamar\'s most focused and cohesive album to date',
          'Brilliant lyrical content addressing social and political issues',
          'Outstanding production by a star-studded team of producers'
        ],
        weaknesses: [
          'Some tracks may feel too dense or overwhelming lyrically',
          'Occasional pacing issues with the album\'s heavy themes',
          'Less commercially accessible than mainstream hip-hop'
        ]
      }
    );

    console.log('Successfully updated album strengths and weaknesses!');

    // Verify updates
    const updatedAlbums = await Album.find({
      title: { $in: ['Rebel', 'Utopia', 'Tortured Poets', 'Damn'] }
    });

    console.log('\nUpdated albums:');
    updatedAlbums.forEach(album => {
      console.log(`\n${album.title} by ${album.artist}:`);
      console.log(`Strengths: ${album.strengths.length} items`);
      console.log(`Weaknesses: ${album.weaknesses.length} items`);
    });

  } catch (error) {
    console.error('Error updating albums:', error);
  } finally {
    await mongoose.connection.close();
  }
}

updateAlbums();
