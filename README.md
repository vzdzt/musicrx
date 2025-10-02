# MusicRx

A comprehensive music discovery and analysis platform featuring automated album reviews, underground artist rankings, media tools, and real-time music news. Built with modern web technologies and hosted on DigitalOcean VPS.

![MusicRx](https://musicrx.app)

## 🌟 Features

### 🎵 Automated Album Reviews
- **AI-Powered Ratings**: Get detailed album reviews based on streaming data, sales, professional reviews, and fan sentiment
- **Comprehensive Analysis**: Includes strengths, weaknesses, and contextual scoring out of 10
- **Real-Time Data**: Integrates Spotify, Billboard, YouTube, and social media metrics
- **Historical Archive**: Complete review database with searchable interface

### 👥 Underground Rankings
- **Data-Driven Discovery**: Algorithmic ranking of emerging artists based on streaming growth, social influence, and network analysis
- **Real-Time Metrics**: Monthly listeners, follower growth, and engagement tracking
- **Dynamic Updates**: Automated data refresh with manual curation capabilities
- **Growth Analytics**: Track artist trajectories and emerging trends

### 🛠️ Media Tools
- **Video to MP3 Converter**: Extract audio from YouTube, TikTok, Instagram, and 1000+ platforms
- **Universal Music Links**: Cross-platform music discovery with links to Spotify, Apple Music, Tidal, and more
- **Lyrics Finder**: Instant song lyrics search with formatted display
- **Media Downloader**: Download videos, images, and audio from social media posts

### 📰 Music News & Discovery
- **Real-Time News Feed**: Curated music industry news from multiple sources
- **New Release Tracking**: Automated monitoring of new album releases
- **Album of the Year Contenders**: Dynamic ranking of current year releases
- **Interactive Homepage**: Scrollable sections with live data updates

### 🎨 User Experience
- **Dynamic Themes**: Multiple visual themes with smooth transitions
- **Interactive Animations**: Three.js starfield background with mouse interaction
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Mode First**: Carefully crafted dark theme with accessibility considerations

## 🏗️ Architecture

### Frontend
- **Static HTML/CSS/JavaScript**: No build process required
- **Vanilla JS**: Modern ES6+ with async/await
- **Three.js Integration**: Interactive 3D starfield background
- **GSAP Animations**: Smooth scroll-triggered animations
- **Responsive Design**: Mobile-first approach

### Backend
- **Node.js/Express**: RESTful API server
- **MongoDB**: Document database for reviews and rankings
- **yt-dlp Integration**: Media processing and downloads
- **External APIs**: Spotify, YouTube Data, Twitter/X, Billboard
- **PM2 Process Management**: Production deployment with auto-restart

### Data Management
- **Automated Updates**: Cron jobs for data refresh
- **Manual Curation**: Scripts for data maintenance and corrections
- **Real-Time Sync**: Live data updates across all interfaces
- **Backup Systems**: Regular database backups and version control

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or Atlas)
- yt-dlp and ffmpeg
- DigitalOcean VPS (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/musicrx.git
   cd musicrx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database URI
   ```

4. **Install system dependencies**
   ```bash
   # macOS
   brew install yt-dlp ffmpeg

   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm ffmpeg
   curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   chmod +x /usr/local/bin/yt-dlp
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:3000/api`

## 📊 API Endpoints

### Album Reviews
```http
POST /api/album
GET /api/albums
GET /api/album/:id
```

### Underground Rankings
```http
GET /api/underground-rankings
GET /api/underground-rankings?limit=10
```

### Media Tools
```http
POST /api/convert-video
POST /api/download-media
```

### News & Discovery
```http
GET /api/news
GET /api/new-releases
GET /api/aoty-contenders
```

### System
```http
GET /api/health
```

## 🌐 Deployment

### DigitalOcean VPS Setup

1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install yt-dlp and ffmpeg
   sudo apt install ffmpeg -y
   curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   sudo chmod +x /usr/local/bin/yt-dlp
   ```

2. **Deploy Application**
   ```bash
   # Upload files to server
   scp -r . user@your-vps:/path/to/musicrx/

   # Install dependencies
   npm install --production

   # Start with PM2
   npm run pm2-start
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name musicrx.app;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **SSL Setup**
   ```bash
   sudo certbot --nginx -d musicrx.app
   ```

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost/musicrx
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
X_BEARER_TOKEN=your_twitter_bearer_token
YOUTUBE_API_KEY=your_youtube_api_key
BILLBOARD_API_KEY=your_billboard_key
```

## 🔧 Data Management

### Automated Updates
Run these scripts regularly to keep data current:

```bash
# Update monthly listeners
node update_monthly_listeners.js

# Update underground ratings
node update_ug_ratings_new.js

# Fix artist images
node fix_artist_images.js

# Add missing artists
node add_missing_artists.js
```

### Manual Data Operations
```bash
# Verify data integrity
node verify_monthly_listeners.js

# Clean up artists
node cleanup_artists.js

# Update album status
node update_albums_status.js
```

## 🎯 Usage

### Rating an Album
1. Go to Tools page
2. Enter Spotify Album ID (e.g., `4aawyAB9vmqN3uQ7FjRGTy`)
3. Click "Rate Album"
4. View automated analysis with score, highlights, and misses

### Exploring Rankings
- **All-Time Rankings**: Historical album rankings
- **2025 Albums**: Current year contenders
- **Underground**: Emerging artist discovery

### Using Tools
- **Converter**: Paste video URL, get MP3 download
- **Downloader**: Download media from social posts
- **Lyrics**: Search by artist and song title
- **Universal Links**: Get cross-platform music links

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow ES6+ standards
- Add JSDoc comments for functions
- Test API endpoints thoroughly
- Update documentation for new features

## 📈 Performance

- **Frontend**: < 100KB gzipped
- **API Response**: < 200ms average
- **Database**: Optimized queries with indexing
- **Caching**: In-memory caching for frequent requests
- **CDN**: Static assets served via CDN

## 🔒 Security

- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration for frontend
- Environment variable protection
- Regular dependency updates

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **yt-dlp**: Media processing capabilities
- **Three.js**: 3D visualizations
- **GSAP**: Smooth animations
- **Spotify API**: Music data integration
- **MongoDB**: Data persistence

## 📞 Support

For issues or questions:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Include error logs and reproduction steps
4. Tag with appropriate labels

---

**Live Site**: [https://musicrx.app](https://musicrx.app)

**API Documentation**: Available at `/api` endpoint
