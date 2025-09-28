import mongoose from 'mongoose';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Album schema
const albumSchema = new mongoose.Schema({
  albumId: String,
  title: String,
  artist: String,
  releaseDate: Date,
  status: String,
  score: Number,
  strengths: [String],
  weaknesses: [String],
  readyBy: Date,
  imageUrl: String,
  featured: { type: Boolean, default: false },
  ranking: Number
});
const Album = mongoose.model('Album', albumSchema);

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Authenticate Spotify
async function authenticateSpotify() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify authenticated');
  } catch (err) {
    console.error('Spotify auth failed:', err);
    process.exit(1);
  }
}

// Get all 2025 albums from Spotify
async function get2025Albums() {
  console.log('Fetching 2025 albums from Spotify...');

  const albums = [];
  let offset = 0;
  const limit = 50;

  // Search for albums from 2025 (current year)
  const searchYears = [2025, 2024]; // Try 2025 first, then 2024 if needed

  for (const year of searchYears) {
    console.log(`Searching for ${year} albums...`);
    offset = 0;

    while (offset < 500) { // Limit to prevent infinite loop
      try {
        const response = await spotifyApi.searchAlbums(`year:${year}`, {
          limit: limit,
          offset: offset,
          market: 'US'
        });

        console.log(`API response for ${year}, offset ${offset}: ${response.body.albums.items.length} items`);

        if (response.body.albums.items.length === 0) break;

        for (const album of response.body.albums.items) {
          // Get full album details to get popularity
          try {
            const fullAlbum = await spotifyApi.getAlbum(album.id);
            const albumData = fullAlbum.body;

            // Debug: log first few albums to see what's available
            if (albums.length < 5) {
              console.log(`Sample album: ${albumData.name} by ${albumData.artists[0].name}, type: ${albumData.album_type}, popularity: ${albumData.popularity}, year: ${new Date(albumData.release_date).getFullYear()}`);
            }

            // Only include albums with decent popularity (>20) and not singles
            if (albumData.album_type === 'album' && albumData.popularity > 20) {
              // Check if it's actually from the target year
              const releaseYear = new Date(albumData.release_date).getFullYear();
              if (releaseYear === year) {
                albums.push({
                  id: albumData.id,
                  name: albumData.name,
                  artists: albumData.artists,
                  release_date: albumData.release_date,
                  popularity: albumData.popularity,
                  images: albumData.images
                });
              }
            }
          } catch (err) {
            console.error(`Error getting album ${album.id}:`, err.message);
          }

          // Small delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        offset += limit;
        console.log(`Fetched ${albums.length} albums so far...`);

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error fetching ${year} albums:`, err);
        break;
      }
    }

    // If we found enough albums, stop searching
    if (albums.length >= 50) break;
  }

  // Sort by popularity (highest first)
  albums.sort((a, b) => b.popularity - a.popularity);

  console.log(`Found ${albums.length} major 2025 albums`);
  return albums;
}

// Mock data for ratings (since real APIs aren't fully implemented)
function generateMockRating(album) {
  // Base score on popularity (0-100) but add some randomness
  const baseScore = album.popularity / 10; // Convert to 0-10 scale
  const randomFactor = (Math.random() - 0.5) * 2; // -1 to +1
  const score = Math.max(1, Math.min(10, baseScore + randomFactor));

  const strengths = [];
  const weaknesses = [];

  // Generate strengths based on popularity
  if (album.popularity > 80) strengths.push('Massive commercial success');
  if (album.popularity > 70) strengths.push('Strong streaming performance');
  if (album.popularity > 60) strengths.push('Popular with audiences');

  // Generate weaknesses
  if (album.popularity < 40) weaknesses.push('Limited mainstream appeal');
  if (album.popularity < 50) weaknesses.push('Could use more promotion');

  // Add some generic strengths/weaknesses
  const genericStrengths = [
    'Solid production quality',
    'Strong lyrical content',
    'Innovative sound design',
    'Great vocal performances',
    'Cohesive album structure'
  ];

  const genericWeaknesses = [
    'Some tracks could be stronger',
    'Production could be more polished',
    'Lyrical content varies in quality',
    'Album length could be optimized'
  ];

  // Add 1-2 random strengths/weaknesses
  const numStrengths = Math.floor(Math.random() * 2) + 1;
  const numWeaknesses = Math.floor(Math.random() * 2) + 1;

  for (let i = 0; i < numStrengths; i++) {
    const randomStrength = genericStrengths[Math.floor(Math.random() * genericStrengths.length)];
    if (!strengths.includes(randomStrength)) strengths.push(randomStrength);
  }

  for (let i = 0; i < numWeaknesses; i++) {
    const randomWeakness = genericWeaknesses[Math.floor(Math.random() * genericWeaknesses.length)];
    if (!weaknesses.includes(randomWeakness)) weaknesses.push(randomWeakness);
  }

  return {
    status: 'reviewed',
    score: parseFloat(score.toFixed(1)),
    strengths: strengths.slice(0, 3), // Max 3
    weaknesses: weaknesses.slice(0, 3)  // Max 3
  };
}

// Rate and save albums
async function rateAndSaveAlbums(albums) {
  console.log('Rating and saving albums...');

  let saved = 0;
  let skipped = 0;

  for (const albumData of albums) {
    try {
      // Check if album already exists
      const existingAlbum = await Album.findOne({ albumId: albumData.id });
      if (existingAlbum) {
        console.log(`Skipping ${albumData.name} - already exists`);
        skipped++;
        continue;
      }

      // Generate rating
      const rating = generateMockRating(albumData);

      // Create album document
      const album = new Album({
        albumId: albumData.id,
        title: albumData.name,
        artist: albumData.artists[0].name,
        releaseDate: new Date(albumData.release_date),
        imageUrl: albumData.images[0]?.url,
        ...rating
      });

      await album.save();
      saved++;
      console.log(`Saved: ${albumData.name} by ${albumData.artists[0].name} - ${rating.score}/10`);

    } catch (err) {
      console.error(`Error saving ${albumData.name}:`, err);
    }
  }

  console.log(`\nComplete! Saved: ${saved}, Skipped: ${skipped}`);
}

// Main function
async function main() {
  try {
    await authenticateSpotify();
    const albums = await get2025Albums();
    await rateAndSaveAlbums(albums);

    console.log('\n🎵 2025 Album Rating Complete!');
    console.log('You can now view the Album of the Year contenders in your tools page.');

  } catch (err) {
    console.error('Script failed:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Run the script
main();
