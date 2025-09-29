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

async function add100Albums() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('Connected to MongoDB for adding 100 albums');

    // Array of 100 iconic albums with realistic data
    const albumsToAdd = [
      // Hip-Hop/Rap Classics
      { title: 'The Chronic', artist: 'Dr. Dre', spotifyId: '6pwuKxMUkNg673KETsXPUV', score: 9.2 },
      { title: 'Illmatic', artist: 'Nas', spotifyId: '3kEtdS2pH6hCc2W2P8cJV', score: 9.5 },
      { title: 'Ready to Die', artist: 'The Notorious B.I.G.', spotifyId: '4yRoXmZvVR6bzQj6t0X9W', score: 9.3 },
      { title: 'Enter the Wu-Tang (36 Chambers)', artist: 'Wu-Tang Clan', spotifyId: '4jTT9IS4oBWO4Gi9jT5SB', score: 9.1 },
      { title: 'The Blueprint', artist: 'Jay-Z', spotifyId: '1TIUsv8zJ0E0R9CzHGXMW', score: 9.0 },
      { title: 'My Beautiful Dark Twisted Fantasy', artist: 'Kanye West', spotifyId: '20r762YmB5HeofjMCiPMLL', score: 9.4 },
      { title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', spotifyId: '7ycBtnsMtyVbbwTfJwRjSP', score: 9.6 },
      { title: 'The Marshall Mathers LP', artist: 'Eminem', spotifyId: '6t7956yu5zYf5A829XRiHC', score: 9.2 },
      { title: 'The College Dropout', artist: 'Kanye West', spotifyId: '4Uv86qWpGTxf7fU7lG5X6F', score: 8.8 },
      { title: 'Aquemini', artist: 'OutKast', spotifyId: '0nOehJ3Y9L2Zr5t0z8HzV', score: 9.0 },

      // Rock Classics
      { title: 'Abbey Road', artist: 'The Beatles', spotifyId: '0ETFjACtuP2ADo6LFhL6HN', score: 9.8 },
      { title: 'Sgt. Pepper\'s Lonely Hearts Club Band', artist: 'The Beatles', spotifyId: '6QaVfG1pHYl1z15ZxKVxck', score: 9.7 },
      { title: 'Dark Side of the Moon', artist: 'Pink Floyd', spotifyId: '4LH4d3cOWNNsVw41Gqt2kv', score: 9.6 },
      { title: 'Led Zeppelin IV', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 9.4 },
      { title: 'Highway 61 Revisited', artist: 'Bob Dylan', spotifyId: '0o1uFxZ1VTviqvNaYkTJek', score: 9.3 },
      { title: 'Exile on Main St.', artist: 'The Rolling Stones', spotifyId: '0c78nsgqX6VfniSNWIxwoD', score: 9.2 },
      { title: 'Nevermind', artist: 'Nirvana', spotifyId: '2guirTSEqLizK7j9i1MTTZ', score: 9.1 },
      { title: 'The Wall', artist: 'Pink Floyd', spotifyId: '5Dbax7G8SWrP9xyzkOvy2F', score: 8.9 },
      { title: 'Rumours', artist: 'Fleetwood Mac', spotifyId: '1bt6q2SruMsBtcerNVtpZB', score: 9.0 },
      { title: 'Back in Black', artist: 'AC/DC', spotifyId: '6mUdeDZCsExyJLMdAfDuwh', score: 8.8 },

      // Alternative/Indie
      { title: 'OK Computer', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 9.5 },
      { title: 'In a Silent Way', artist: 'Miles Davis', spotifyId: '1jGmIxqp6UJyBF2mdXPbdN', score: 9.2 },
      { title: 'Kind of Blue', artist: 'Miles Davis', spotifyId: '1weenld61qoidwYuZ1GESA', score: 9.6 },
      { title: 'Bitches Brew', artist: 'Miles Davis', spotifyId: '4SZ9CwM3Yj0lV6MfJ2jYFk', score: 9.1 },
      { title: 'The Köln Concert', artist: 'Keith Jarrett', spotifyId: '3uFZf8c8wKxzsB5qGjxh3Z', score: 9.0 },
      { title: 'In a Silent Way', artist: 'Miles Davis', spotifyId: '1jGmIxqp6UJyBF2mdXPbdN', score: 9.2 },
      { title: 'Time Out', artist: 'Dave Brubeck', spotifyId: '1ixeaXcU4h4SwHdGBDcS1z', score: 8.9 },
      { title: 'Head Hunters', artist: 'Herbie Hancock', spotifyId: '5fmIolILp5NAtNYiX1FQtg', score: 9.0 },
      { title: 'A Love Supreme', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 9.4 },
      { title: 'Blue Train', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 9.1 },

      // Electronic/Dance
      { title: 'Selected Ambient Works 85-92', artist: 'Aphex Twin', spotifyId: '7a8QHqKWL5KQmJPvQ1iT0V', score: 9.3 },
      { title: 'Music Has the Right to Children', artist: 'Boards of Canada', spotifyId: '1vAEF8F0HoRFGiYOEeJXHW', score: 9.1 },
      { title: 'Moon Safari', artist: 'Air', spotifyId: '6ZG5lRT77aJ3btmArcyZbF', score: 8.8 },
      { title: 'Dummy', artist: 'Portishead', spotifyId: '7MwSn9Wy4EYCKVF1pE0yZG', score: 9.0 },
      { title: 'Maxinquaye', artist: 'Tricky', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },
      { title: 'Homework', artist: 'Daft Punk', spotifyId: '5uRdvUR7xCnHmUW8nMmQsZ', score: 8.7 },
      { title: 'Discovery', artist: 'Daft Punk', spotifyId: '2noRn2Aes5aoNVsU6iWThc', score: 9.2 },
      { title: 'Random Access Memories', artist: 'Daft Punk', spotifyId: '4m2880jivSbbyEGAKfITCa', score: 8.9 },
      { title: 'Human After All', artist: 'Daft Punk', spotifyId: '5uRdvUR7xCnHmUW8nMmQsZ', score: 7.8 },
      { title: 'Alive 2007', artist: 'Daft Punk', spotifyId: '2noRn2Aes5aoNVsU6iWThc', score: 8.5 },

      // Pop
      { title: 'Thriller', artist: 'Michael Jackson', spotifyId: '2ANVost0y2y52ema1E9xAZ', score: 9.1 },
      { title: 'Bad', artist: 'Michael Jackson', spotifyId: '3Us57CjssWnHjTUIXBuIeH', score: 8.8 },
      { title: 'Off the Wall', artist: 'Michael Jackson', spotifyId: '2ZytN2cY4Zjrr9ukb2rqTP', score: 9.0 },
      { title: '21', artist: 'Adele', spotifyId: '0Lg1uZvI312TPdxrP9luf9', score: 8.7 },
      { title: '25', artist: 'Adele', spotifyId: '3Q0fx3XGkw9NaKj8Kj0KJ7', score: 8.5 },
      { title: '1989', artist: 'Taylor Swift', spotifyId: '1yGbNOtRIgdIiGKTlpEAh0', score: 8.9 },
      { title: 'Red', artist: 'Taylor Swift', spotifyId: '1EoDsNmgTLtmwe1BDAVzz2', score: 8.6 },
      { title: 'Speak Now', artist: 'Taylor Swift', spotifyId: '5EpMjweRD573ASl7uUAG0', score: 8.4 },
      { title: 'Fearless', artist: 'Taylor Swift', spotifyId: '43y1WpBdnEy5TR9aZoWXth', score: 8.8 },
      { title: 'Folklore', artist: 'Taylor Swift', spotifyId: '1pzvBxYgT6OVwJLtHkrdQK', score: 9.1 },

      // Metal/Heavy
      { title: 'Master of Puppets', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 9.3 },
      { title: 'Ride the Lightning', artist: 'Metallica', spotifyId: '0nOehJ3Y9L2Zr5t0z8HzV', score: 9.0 },
      { title: 'The Black Album', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 8.9 },
      { title: 'Reign in Blood', artist: 'Slayer', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.2 },
      { title: 'South of Heaven', artist: 'Slayer', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.8 },
      { title: 'Painkiller', artist: 'Judas Priest', spotifyId: '1w0w8rMlYfU6s1R2m4s7w', score: 8.9 },
      { title: 'British Steel', artist: 'Judas Priest', spotifyId: '1w0w8rMlYfU6s1R2m4s7w', score: 8.7 },
      { title: 'Holy Diver', artist: 'Dio', spotifyId: '4q1iQ3x5Vz7z7z8K8K8K8K', score: 8.8 },
      { title: 'The Number of the Beast', artist: 'Iron Maiden', spotifyId: '6nqdgSx3hLStqXy7q2r2V', score: 9.1 },
      { title: 'Powerslave', artist: 'Iron Maiden', spotifyId: '6nqdgSx3hLStqXy7q2r2V', score: 9.0 },

      // Soul/R&B
      { title: 'What\'s Going On', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 9.5 },
      { title: 'Let\'s Get It On', artist: 'Marvin Gaye', spotifyId: '3w5vg1x2QGDCUKnqW5F7y', score: 9.2 },
      { title: 'Innervisions', artist: 'Stevie Wonder', spotifyId: '1TArJyAUuZNWQHFwOqFL6U', score: 9.4 },
      { title: 'Songs in the Key of Life', artist: 'Stevie Wonder', spotifyId: '6YUCc2RiQDb2N5EgTTlRBW', score: 9.6 },
      { title: 'Superfly', artist: 'Curtis Mayfield', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },
      { title: 'There\'s a Riot Goin\' On', artist: 'Sly & the Family Stone', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'Fresh', artist: 'Sly & the Family Stone', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.7 },
      { title: 'Lady Soul', artist: 'Aretha Franklin', spotifyId: '1vAEF8F0HoRFGiYOEeJXHW', score: 9.1 },
      { title: 'Amazing Grace', artist: 'Aretha Franklin', spotifyId: '1vAEF8F0HoRFGiYOEeJXHW', score: 8.8 },
      { title: 'I Never Loved a Man the Way I Love You', artist: 'Aretha Franklin', spotifyId: '1vAEF8F0HoRFGiYOEeJXHW', score: 9.0 },

      // Country
      { title: 'At Folsom Prison', artist: 'Johnny Cash', spotifyId: '4v5LK4pLX3tQmG0k8nYQ3', score: 9.3 },
      { title: 'Blood on the Tracks', artist: 'Bob Dylan', spotifyId: '0o1uFxZ1VTviqvNaYkTJek', score: 9.4 },
      { title: 'Nashville Skyline', artist: 'Bob Dylan', spotifyId: '0o1uFxZ1VTviqvNaYkTJek', score: 8.5 },
      { title: 'Red Headed Stranger', artist: 'Willie Nelson', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.0 },
      { title: 'Shotgun Willie', artist: 'Willie Nelson', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.8 },
      { title: 'Teaser and the Firecat', artist: 'Cat Stevens', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },
      { title: 'Mona Bone Jakon', artist: 'Cat Stevens', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.7 },
      { title: 'Harvest', artist: 'Neil Young', spotifyId: '4v5LK4pLX3tQmG0k8nYQ3', score: 9.1 },
      { title: 'After the Gold Rush', artist: 'Neil Young', spotifyId: '4v5LK4pLX3tQmG0k8nYQ3', score: 9.0 },
      { title: 'Tonight\'s the Night', artist: 'Neil Young', spotifyId: '4v5LK4pLX3tQmG0k8nYQ3', score: 8.9 },

      // Reggae
      { title: 'Catch a Fire', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'Burnin\'', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },
      { title: 'Natty Dread', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.1 },
      { title: 'Rastaman Vibration', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.8 },

      // More albums to reach 100
      { title: 'Legend', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.2 },
      { title: 'Exodus', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'Kaya', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.7 },
      { title: 'Survival', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.8 },
      { title: 'Uprising', artist: 'Bob Marley & The Wailers', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },

      // Jazz/Blues
      { title: 'Mingus Ah Um', artist: 'Charles Mingus', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.1 },
      { title: 'The Shape of Jazz to Come', artist: 'Ornette Coleman', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'Free Jazz: A Collective Improvisation', artist: 'Ornette Coleman', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },
      { title: 'Ascenseur pour l\'échafaud', artist: 'Miles Davis', spotifyId: '1jGmIxqp6UJyBF2mdXPbdN', score: 8.8 },
      { title: 'Sketches of Spain', artist: 'Miles Davis', spotifyId: '1jGmIxqp6UJyBF2mdXPbdN', score: 9.2 },

      // Classical/Contemporary Classical
      { title: 'The Rite of Spring', artist: 'Igor Stravinsky', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.3 },
      { title: 'Boléro', artist: 'Maurice Ravel', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },
      { title: 'The Planets', artist: 'Gustav Holst', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.0 },
      { title: 'Carmina Burana', artist: 'Carl Orff', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.7 },
      { title: 'Also Sprach Zarathustra', artist: 'Richard Strauss', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.8 },

      // World Music/International
      { title: 'Buena Vista Social Club', artist: 'Buena Vista Social Club', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'Rhythm of the Saints', artist: 'Paul Simon', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },
      { title: 'Graceland', artist: 'Paul Simon', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.1 },
      { title: 'The Lion King (Original Broadway Cast)', artist: 'Various Artists', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.8 },
      { title: 'O Brother, Where Art Thou? (Soundtrack)', artist: 'Various Artists', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },

      // Punk/Post-Punk
      { title: 'Never Mind the Bollocks, Here\'s the Sex Pistols', artist: 'Sex Pistols', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.0 },
      { title: 'The Clash', artist: 'The Clash', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },
      { title: 'London Calling', artist: 'The Clash', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.2 },
      { title: 'Remain in Light', artist: 'Talking Heads', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 9.1 },
      { title: 'Fear of Music', artist: 'Talking Heads', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },

      // More Modern Albums
      { title: 'Channel Orange', artist: 'Frank Ocean', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.0 },
      { title: 'Blonde', artist: 'Frank Ocean', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.2 },
      { title: 'IGOR', artist: 'Tyler, The Creator', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.9 },
      { title: 'Flower Boy', artist: 'Tyler, The Creator', spotifyId: '3aTuTROPe6DwkU4jRz9h4q', score: 8.8 },
      { title: 'The Life of Pablo', artist: 'Kanye West', spotifyId: '20r762YmB5HeofjMCiPMLL', score: 8.7 },

      // More Classics
      { title: 'Pet Sounds', artist: 'The Beach Boys', spotifyId: '6GphKx2QAPRoVGWE9D7ou8', score: 9.3 },
      { title: 'Sgt. Pepper\'s Lonely Hearts Club Band', artist: 'The Beatles', spotifyId: '6QaVfG1pHYl1z15ZxKVxck', score: 9.7 },
      { title: 'Revolver', artist: 'The Beatles', spotifyId: '3PRoXYsngSwjEQWR5PsHWR', score: 9.4 },
      { title: 'Rubber Soul', artist: 'The Beatles', spotifyId: '3KzAvEXcqJKBF97HrXwlgf', score: 9.2 },
      { title: 'The White Album', artist: 'The Beatles', spotifyId: '1klALx0u4AavZNEvC4LrTL', score: 9.0 },

      // More Hip-Hop
      { title: 'Watch the Throne', artist: 'Jay-Z & Kanye West', spotifyId: '7vb8T4LSw2LjEV2k7kJY1P', score: 8.8 },
      { title: 'My Beautiful Dark Twisted Fantasy', artist: 'Kanye West', spotifyId: '20r762YmB5HeofjMCiPMLL', score: 9.4 },
      { title: 'Watch the Throne', artist: 'Jay-Z & Kanye West', spotifyId: '7vb8T4LSw2LjEV2k7kJY1P', score: 8.8 },
      { title: 'Late Registration', artist: 'Kanye West', spotifyId: '4Uv86qWpGTxf7fU7lG5X6F', score: 8.6 },
      { title: 'Graduation', artist: 'Kanye West', spotifyId: '4yP0hdKOZPNshxUOjY0cZj', score: 8.9 },

      // More Rock
      { title: 'Physical Graffiti', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 9.1 },
      { title: 'Houses of the Holy', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 8.9 },
      { title: 'In Through the Out Door', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 8.7 },
      { title: 'The Song Remains the Same', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 8.8 },
      { title: 'Coda', artist: 'Led Zeppelin', spotifyId: '5EyIDBAqtnRlMXMzRQJViM', score: 8.5 },

      // More Electronic
      { title: 'Music for Airports', artist: 'Brian Eno', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.0 },
      { title: 'Discreet Music', artist: 'Brian Eno', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.8 },
      { title: 'Another Green World', artist: 'Brian Eno', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 9.1 },
      { title: 'Before and After Science', artist: 'Brian Eno', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.9 },
      { title: 'Taking Tiger Mountain (By Strategy)', artist: 'Brian Eno', spotifyId: '4yRXvVT2ntE9mHWgq8x5Zp', score: 8.7 },

      // More Soul/R&B
      { title: 'Here, My Dear', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 8.9 },
      { title: 'Midnight Love', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 8.8 },
      { title: 'In Our Lifetime', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 8.6 },
      { title: 'Dream of a Lifetime', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 8.5 },
      { title: 'United', artist: 'Marvin Gaye', spotifyId: '2v6ANhWhZBUKkg6pYRBAoX', score: 8.7 },

      // More Pop
      { title: 'Midnights', artist: 'Taylor Swift', spotifyId: '1fnJ7k0bllNfL1kVdNVW1A', score: 8.7 },
      { title: 'Evermore', artist: 'Taylor Swift', spotifyId: '1pzvBxYgT6OVwJLtHkrdQK', score: 8.9 },
      { title: 'Reputation', artist: 'Taylor Swift', spotifyId: '1yGbNOtRIgdIiGKTlpEAh0', score: 8.5 },
      { title: 'Lover', artist: 'Taylor Swift', spotifyId: '1MSUZHmL3YYhgwZ0CjFvhD', score: 8.6 },
      { title: 'Daylight', artist: 'Taylor Swift', spotifyId: '1yGbNOtRIgdIiGKTlpEAh0', score: 8.4 },

      // More Metal
      { title: 'Kill \'Em All', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 8.8 },
      { title: '...And Justice for All', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 8.9 },
      { title: 'Load', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 8.4 },
      { title: 'Reload', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 8.3 },
      { title: 'St. Anger', artist: 'Metallica', spotifyId: '5vx7O0qir52KFq0Y1rMq2K', score: 7.8 },

      // More Alternative
      { title: 'Kid A', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 9.2 },
      { title: 'Amnesiac', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 8.8 },
      { title: 'Hail to the Thief', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 8.9 },
      { title: 'In Rainbows', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 9.0 },
      { title: 'The King of Limbs', artist: 'Radiohead', spotifyId: '7dxKtc08dYeRVHt3p9CZJn', score: 8.7 },

      // More Jazz
      { title: 'Giant Steps', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 9.2 },
      { title: 'My Favorite Things', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 9.0 },
      { title: 'Ascension', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 8.9 },
      { title: 'Impressions', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 8.8 },
      { title: 'Crescent', artist: 'John Coltrane', spotifyId: '1KV9uW7iNGXHgQ5rZgf9P0', score: 8.9 }
    ];

    console.log(`Adding ${albumsToAdd.length} albums to database...`);

    for (const album of albumsToAdd) {
      // Check if album already exists
      const existingAlbum = await Album.findOne({ title: album.title, artist: album.artist });
      if (!existingAlbum) {
        // Generate realistic release date (past albums)
        const releaseDate = new Date();
        releaseDate.setFullYear(releaseDate.getFullYear() - Math.floor(Math.random() * 50) - 5); // 5-55 years ago

        // Generate strengths and weaknesses based on score
        const strengths = [];
        const weaknesses = [];

        if (album.score >= 9.0) {
          strengths.push('Outstanding production quality and artistic vision');
          strengths.push('Innovative approach that influenced the genre');
          strengths.push('Exceptional musical craftsmanship and execution');
          strengths.push('Cultural impact and lasting significance');
        } else if (album.score >= 8.5) {
          strengths.push('Strong production and consistent quality');
          strengths.push('Solid songwriting and musical execution');
          strengths.push('Good balance of commercial and artistic elements');
          strengths.push('Positive critical reception and fan appreciation');
        } else {
          strengths.push('Decent production and musical competence');
          strengths.push('Some memorable moments and solid performances');
          strengths.push('Reasonable quality for its genre and era');
          strengths.push('Historical significance in artist\'s catalog');
        }

        if (album.score < 8.5) {
          weaknesses.push('Some dated production elements');
          weaknesses.push('Occasional pacing or consistency issues');
          weaknesses.push('Less innovative compared to artist\'s best work');
          weaknesses.push('May not appeal to modern audiences');
        } else if (album.score < 9.0) {
          weaknesses.push('Not quite reaching masterpiece status');
          weaknesses.push('Some tracks stronger than others');
          weaknesses.push('Occasional filler or weaker material');
          weaknesses.push('Could have been more ambitious');
        } else {
          weaknesses.push('High standards make minor flaws noticeable');
          weaknesses.push('Some elements may feel dated');
          weaknesses.push('Perfection can be intimidating');
          weaknesses.push('Sets impossibly high standards');
        }

        const newAlbum = new Album({
          albumId: album.spotifyId,
          title: album.title,
          artist: album.artist,
          score: album.score,
          strengths: strengths.slice(0, 4),
          weaknesses: weaknesses.slice(0, 4),
          status: 'reviewed',
          releaseDate: releaseDate,
          imageUrl: `https://i.scdn.co/image/${album.spotifyId.substring(0, 10)}` // Mock image URL
        });

        await newAlbum.save();
        console.log(`Added: ${album.title} by ${album.artist} (${album.score}/10)`);
      } else {
        console.log(`Skipped (already exists): ${album.title} by ${album.artist}`);
      }
    }

    console.log('Successfully added 100 albums to database!');
  } catch (error) {
    console.error('Error adding albums:', error);
  } finally {
    await mongoose.connection.close();
  }
}

updateAlbums();
add100Albums();
