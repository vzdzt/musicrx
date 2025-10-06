#!/bin/bash

# MusicRx VPS Deployment Script
# Run this on your DigitalOcean VPS after SSH access is set up

set -e  # Exit on any error

echo "🚀 Starting MusicRx Backend Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
echo "📦 Installing Node.js 18+..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install ffmpeg
echo "📦 Installing ffmpeg..."
sudo apt install -y ffmpeg
echo "✅ ffmpeg version: $(ffmpeg -version | head -1)"

# Install yt-dlp globally
echo "📦 Installing yt-dlp..."
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
echo "✅ yt-dlp version: $(yt-dlp --version)"

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Configure PM2 for auto-start
echo "⚙️ Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME || true
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

# Upload your code first, then run this script
echo "📥 Make sure you've uploaded your MusicRx code to ~/musicrx on the VPS"
cd ~/musicrx || { echo "❌ Error: ~/musicrx directory not found. Please upload your code first."; exit 1; }

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Run comprehensive test suite
echo "🧪 Running test suite..."
if npm test; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed! Aborting deployment."
    exit 1
fi

# Test the application
echo "🧪 Testing application startup..."
npm run dev &
sleep 5

# Test health endpoint
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    exit 1
fi

# Stop test server
pkill -f "npm run dev" || true

# Start with PM2
echo "🚀 Starting application with PM2..."
npm run pm2-start

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your frontend BACKEND_URL to: http://your-vps-ip"
echo "2. Test a download: curl -X POST http://your-vps-ip/api/download-media -H 'Content-Type: application/json' -d '{\"url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'"
echo "3. Optional: Set up SSL with Let's Encrypt"
echo ""
echo "📝 Useful commands:"
echo "- pm2 logs musicrx-backend    # View logs"
echo "- pm2 restart musicrx-backend # Restart app"
echo "- pm2 stop musicrx-backend    # Stop app"
