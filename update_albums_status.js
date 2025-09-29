import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const albumSchema = new mongoose.Schema({
  albumId: String,
  title: String,
  artist: String,
  score: Number,
  status: String
});
const Album = mongoose.model('Album', albumSchema);

async function updateAllAlbums() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/musicrx');
    
    const result = await Album.updateMany(
      { status: { $ne: 'reviewed' } },
      { status: 'reviewed' }
    );
    
    console.log(`Updated ${result.modifiedCount} albums to reviewed status`);
    
    const totalReviewed = await Album.countDocuments({ status: 'reviewed' });
    console.log(`Total reviewed albums: ${totalReviewed}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

updateAllAlbums();
