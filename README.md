# MusicRx Backend

Backend API for MusicRx media tools - video conversion, media downloading, and more.

## Features

- **Video to MP3 Conversion**: Convert YouTube, TikTok, Instagram videos to MP3
- **Media Downloader**: Download videos, images, and audio from social media posts
- **Universal Music Links**: Cross-platform music link discovery (frontend only)
- **Lyrics Finder**: Song lyrics search (frontend only)

## Prerequisites

- **Node.js** 16+
- **yt-dlp** (latest version)
- **ffmpeg** (for audio processing)

### Installing Dependencies

**macOS:**
```bash
# Install yt-dlp and ffmpeg
brew install yt-dlp ffmpeg

# Keep yt-dlp updated
yt-dlp -U
```

**Linux:**
```bash
# Install via pip (recommended)
pip install yt-dlp
sudo apt install ffmpeg  # Ubuntu/Debian
```

**Windows:**
```bash
# Install via pip
pip install yt-dlp

# Install ffmpeg from https://ffmpeg.org/download.html
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/musicrx.git
cd musicrx
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Or start production server:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### POST `/api/convert-video`
Convert video URLs to MP3 audio.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=..."
}
```

**Response:** MP3 file download

### POST `/api/download-media`
Download media from social media posts.

**Request:**
```json
{
  "url": "https://instagram.com/p/..."
}
```

**Response:** Original media file download

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T..."
}
```

## Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard if needed.

### Option 2: Railway

1. Connect your GitHub repo to Railway
2. Deploy automatically
3. Add environment variables if needed

### Option 3: DigitalOcean App Platform

1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set run command: `npm start`

### Option 4: Traditional VPS

```bash
# Install Node.js, yt-dlp, ffmpeg
# Upload files
# Run: npm start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Supported Platforms

yt-dlp supports 1000+ sites including:
- YouTube, YouTube Music
- TikTok, Instagram, Twitter/X
- Vimeo, Dailymotion
- SoundCloud, Bandcamp
- Facebook, Reddit
- And many more...

## File Limits

- **Max file size**: 100MB (configurable)
- **Timeout**: 5 minutes per request
- **Temp files**: Automatically cleaned up

## Security

- Input validation and sanitization
- Rate limiting (implement as needed)
- CORS enabled for frontend
- No file storage - direct streaming

## Troubleshooting

### yt-dlp Issues
```bash
# Update yt-dlp
yt-dlp -U

# Check version
yt-dlp --version
```

### ffmpeg Issues
```bash
# Check installation
ffmpeg -version
```

### Common Errors
- **"Command failed"**: Check yt-dlp/ffmpeg installation
- **"Timeout"**: Video too long, try shorter clips
- **"Unsupported URL"**: Platform not supported by yt-dlp

## Development

```bash
# Install dev dependencies
npm install

# Run with auto-restart
npm run dev

# Test endpoints
curl -X POST http://localhost:3000/api/health
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## Support

For issues:
1. Check yt-dlp is updated: `yt-dlp -U`
2. Verify ffmpeg installation
3. Check server logs
4. Open GitHub issue with error details
