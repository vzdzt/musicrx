import mongoose from 'mongoose';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

dotenv.config();

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
    return true;
  } catch (err) {
    console.error('Spotify auth failed:', err);
    return false;
  }
}

async function fixClassicAlbums() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    console.log('MongoDB connected');

    // Authenticate Spotify
    const authSuccess = await authenticateSpotify();
    if (!authSuccess) {
      console.error('Failed to authenticate with Spotify');
      return;
    }

    // Find albums without imageUrl
    const albumsToFix = await Album.find({
      status: 'reviewed',
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: null },
        { imageUrl: '' },
        { releaseDate: { $exists: false } },
        { releaseDate: null }
      ]
    });

    console.log(`Found ${albumsToFix.length} albums to fix`);

    for (const album of albumsToFix) {
      try {
        console.log(`Fixing: ${album.title} by ${album.artist}`);

        let spotifyAlbum;

        try {
          // First try with existing albumId
          const albumData = await spotifyApi.getAlbum(album.albumId);
          spotifyAlbum = albumData.body;
        } catch (getErr) {
          console.log(`Album ID ${album.albumId} invalid, searching...`);

          // Search for the album
          const searchResults = await spotifyApi.searchAlbums(`${album.title} ${album.artist}`, { limit: 1 });
          if (searchResults.body.albums.items.length > 0) {
            const foundAlbum = searchResults.body.albums.items[0];
            console.log(`Found album: ${foundAlbum.name} by ${foundAlbum.artists[0].name} (ID: ${foundAlbum.id})`);

            // Update albumId as well
            await Album.findOneAndUpdate(
              { albumId: album.albumId },
              { albumId: foundAlbum.id }
            );

            spotifyAlbum = foundAlbum;
          } else {
            console.error(`No album found for ${album.title} by ${album.artist}`);
            continue;
          }
        }

        // Update the album
        await Album.findOneAndUpdate(
          { albumId: spotifyAlbum.id },
          {
            imageUrl: spotifyAlbum.images[0]?.url,
            releaseDate: new Date(spotifyAlbum.release_date)
          }
        );

        console.log(`✓ Updated ${album.title}: imageUrl and releaseDate`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`Error fixing ${album.title}:`, err.message);
      }
    }

    console.log('Fixing complete');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixClassicAlbums();
