const mongoose = require('mongoose');

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
          'Powerful lyrical content addressing personal and social themes',
          'Outstanding production with atmospheric soundscapes',
          'Anna Wise\'s versatile range showcased throughout',
          'Thought-provoking exploration of identity and rebellion',
          'Seamless blending of acoustic and electronic elements',
          'Compelling storytelling that resonates deeply',
          'Unique artistic vision that pushes genre boundaries',
          'Memorable melodies that linger long after listening'
        ],
        weaknesses: [
          'Some tracks may feel too abstract for mainstream audiences',
          'Occasional pacing issues with experimental sections',
          'Limited commercial appeal due to artistic complexity',
          'Requires multiple listens to fully appreciate depth',
          'Some production choices may polarize listeners',
          'Less accessible than more conventional R&B albums'
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
          'Innovative use of technology and sound design',
          'Deep exploration of themes of utopia and human connection',
          'Collaborations with cutting-edge producers and artists',
          'Visually stunning accompanying app and multimedia elements',
          'Pushing boundaries of what\'s possible in modern music',
          'Complex layering of sounds creating immersive experiences',
          'Philosophical lyrics about technology and human evolution',
          'Masterful fusion of organic and synthetic elements'
        ],
        weaknesses: [
          'Highly experimental nature may alienate casual listeners',
          'Complex soundscapes require focused attention',
          'Some tracks may feel disjointed or challenging',
          'Heavy reliance on technology might date the production',
          'Less emphasis on traditional song structures',
          'May be overwhelming for those seeking simpler musical experiences'
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
          'Masterful storytelling that feels intimately confessional',
          'Outstanding vocal performances showcasing emotional range',
          'Innovative production blending folk, pop, and alternative elements',
          'Themes of heartbreak, healing, and self-discovery resonate universally',
          'Collaborations with producers like Jack Antonoff elevate the sound',
          'Careful sequencing creates a cohesive emotional journey',
          'Raw honesty that connects deeply with listeners\' experiences',
          'Musical evolution while maintaining Swift\'s signature style'
        ],
        weaknesses: [
          'Some tracks may feel too emotionally heavy for casual listening',
          'Production occasionally overshadows the intimate lyrics',
          'Lengthy runtime may be daunting for some listeners',
          'Certain songs require emotional investment to fully appreciate',
          'Less radio-friendly than Swift\'s previous pop-oriented work',
          'May polarize fans expecting more upbeat content'
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
          'Outstanding production by a star-studded team of producers',
          'Powerful exploration of fame, race, and American culture',
          'Innovative sampling and musical arrangements',
          'Seamless flow between tracks creating a unified narrative',
          'Kendrick\'s rapid-fire delivery and wordplay at peak performance',
          'Thought-provoking themes that spark important conversations',
          'Musical diversity while maintaining artistic integrity',
          'Cultural impact and critical acclaim upon release'
        ],
        weaknesses: [
          'Some tracks may feel too dense or overwhelming lyrically',
          'Occasional pacing issues with the album\'s heavy themes',
          'Less commercially accessible than mainstream hip-hop',
          'Requires multiple listens to unpack complex lyrical content',
          'Some production choices may not appeal to all listeners',
          'Heavy subject matter may be emotionally taxing'
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
