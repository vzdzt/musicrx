# 🚀 MusicRx Backend - VPS Deployment Guide

Deploy your own yt-dlp powered media processing backend to a VPS for full control.

## 📋 Prerequisites

- VPS with Ubuntu/Debian (DigitalOcean, Linode, Vultr, etc.)
- At least 1GB RAM, 1 CPU core
- SSH access to your VPS

## 🛠️ VPS Setup (One-time)

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js & npm
```bash
# Install Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18+
npm --version   # Should be 9+
```

### 3. Install ffmpeg
```bash
sudo apt install -y ffmpeg
ffmpeg -version  # Verify installation
```

### 4. Install yt-dlp (Global)
```bash
# Download latest yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp

# Make executable
sudo chmod +x /usr/local/bin/yt-dlp

# Verify installation
yt-dlp --version
```

### 5. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 📦 Deploy Your Backend

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/vzdzt/musicrx.git
cd musicrx
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test Locally
```bash
# Test the server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/health
```

### 4. Start with PM2
```bash
# Start the server
npm run pm2-start

# Check status
pm2 status

# View logs
pm2 logs musicrx-backend
```

### 5. Configure Nginx (Optional but Recommended)
```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/musicrx-backend
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/musicrx-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔧 Update Your Frontend

### 1. Update API URLs in tools.html

Replace the cobalt.tools URLs with your VPS URL:

```javascript
// Change from:
fetch('https://cobalt.tools/api/json', {

// To:
fetch('https://your-vps-ip-or-domain/api/download-media', {
```

### 2. Update Both Functions

In `tools.html`, find and replace:
- `https://cobalt.tools/api/json` → `https://your-vps-ip-or-domain/api/download-media`
- `https://cobalt.tools/api/json` → `https://your-vps-ip-or-domain/api/convert-video`

## 🌐 Domain Setup (Optional)

### 1. Buy a Domain
- Namecheap, GoDaddy, or Porkbun
- Point A record to your VPS IP

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
pm2 status              # Check server status
pm2 logs musicrx-backend # View logs
pm2 restart musicrx-backend  # Restart server
pm2 stop musicrx-backend     # Stop server
```

### Update yt-dlp
```bash
# Update yt-dlp weekly
sudo yt-dlp -U
```

### Backup Strategy
```bash
# Backup your code
tar -czf backup-$(date +%Y%m%d).tar.gz ~/musicrx/

# Backup PM2 processes
pm2 save
```

## 🚨 Troubleshooting

### Server Won't Start
```bash
# Check logs
pm2 logs musicrx-backend

# Check if port 3000 is in use
sudo netstat -tulpn | grep :3000

# Kill process if needed
sudo fuser -k 3000/tcp
```

### yt-dlp Errors
```bash
# Test yt-dlp manually
yt-dlp --version
yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --print title
```

### CORS Issues
- Ensure your VPS allows your frontend domain
- Check Nginx configuration for proper headers

## 💰 Cost Breakdown

- **VPS**: $5-10/month (1GB RAM, 1 CPU)
- **Domain**: $10-15/year
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$70/year for full control

## 🎯 Benefits of VPS Deployment

✅ **Full Control** - Your own yt-dlp installation
✅ **No Rate Limits** - Process as many requests as you want
✅ **Custom Features** - Add user accounts, analytics, etc.
✅ **Cost Effective** - $5/month vs paying per request
✅ **Scalable** - Upgrade VPS as needed

## 📞 Support

If you run into issues:
1. Check `pm2 logs musicrx-backend`
2. Test yt-dlp manually: `yt-dlp "test-url"`
3. Verify Nginx configuration
4. Check firewall settings

Your backend is now a **professional media processing service**! 🎵✨
