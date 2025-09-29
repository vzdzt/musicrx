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

    // Get top 8 albums to identify which ones to update
    const topAlbums = await Album.find()
      .sort({ score: -1 })
      .limit(8);

    console.log('Top 8 albums:');
    topAlbums.forEach((album, index) => {
      console.log(`${index + 1}. ${album.title} by ${album.artist} (${album.score}/10)`);
    });

    // Update albums ranked 1, 2, 3, 4, and 8 with expanded analysis
    const albumsToUpdate = [0, 1, 2, 3, 7]; // Indices for ranks 1, 2, 3, 4, 8

    for (const index of albumsToUpdate) {
      if (topAlbums[index]) {
        const album = topAlbums[index];
        console.log(`\nUpdating ${album.title} by ${album.artist} (Rank ${index + 1})`);

        // Generate expanded strengths and weaknesses based on album
        let strengths = [];
        let weaknesses = [];

        // Customize based on album
        if (album.title.toLowerCase().includes('damn') && album.artist.toLowerCase().includes('kendrick')) {
          strengths = [
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
          ];
          weaknesses = [
            'Some tracks may feel too dense or overwhelming lyrically',
            'Occasional pacing issues with the album\'s heavy themes',
            'Less commercially accessible than mainstream hip-hop',
            'Requires multiple listens to unpack complex lyrical content',
            'Some production choices may not appeal to all listeners',
            'Heavy subject matter may be emotionally taxing'
          ];
        } else if (album.title.toLowerCase().includes('tortured') && album.artist.toLowerCase().includes('swift')) {
          strengths = [
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
          ];
          weaknesses = [
            'Some tracks may feel too emotionally heavy for casual listening',
            'Production occasionally overshadows the intimate lyrics',
            'Lengthy runtime may be daunting for some listeners',
            'Certain songs require emotional investment to fully appreciate',
            'Less radio-friendly than Swift\'s previous pop-oriented work',
            'May polarize fans expecting more upbeat content'
          ];
        } else if (album.title.toLowerCase().includes('utopia') && album.artist.toLowerCase().includes('björk')) {
          strengths = [
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
          ];
          weaknesses = [
            'Highly experimental nature may alienate casual listeners',
            'Complex soundscapes require focused attention',
            'Some tracks may feel disjointed or challenging',
            'Heavy reliance on technology might date the production',
            'Less emphasis on traditional song structures',
            'May be overwhelming for those seeking simpler musical experiences'
          ];
        } else if (album.title.toLowerCase().includes('rebel') && album.artist.toLowerCase().includes('wise')) {
          strengths = [
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
          ];
          weaknesses = [
            'Some tracks may feel too abstract for mainstream audiences',
            'Occasional pacing issues with experimental sections',
            'Limited commercial appeal due to artistic complexity',
            'Requires multiple listens to fully appreciate depth',
            'Some production choices may polarize listeners',
            'Less accessible than more conventional R&B albums'
          ];
        } else {
          // Generic expansion for other albums
          strengths = [
            'Outstanding musical craftsmanship and production quality',
            'Innovative approach to genre conventions and expectations',
            'Exceptional artistic vision and creative direction',
            'Powerful emotional impact and listener engagement',
            'Technical proficiency and musical excellence',
            'Cultural significance and lasting influence',
            'Seamless integration of various musical elements',
            'Compelling narrative or thematic consistency',
            'Memorable compositions and arrangements',
            'Critical acclaim and industry recognition'
          ];
          weaknesses = [
            'May require multiple listens to fully appreciate',
            'Some elements may not appeal to all audiences',
            'Occasional pacing or structural inconsistencies',
            'Complex themes may be challenging for some listeners',
            'Less accessible than more commercial releases',
            'Certain production choices may polarize opinions'
          ];
        }

        // Limit to 3-4 items each as requested
        strengths = strengths.slice(0, 4);
        weaknesses = weaknesses.slice(0, 4);

        await Album.findOneAndUpdate(
          { _id: album._id },
          { strengths, weaknesses }
        );

        console.log(`Updated with ${strengths.length} strengths and ${weaknesses.length} weaknesses`);
      }
    }

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
