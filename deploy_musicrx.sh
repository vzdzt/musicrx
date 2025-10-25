#!/bin/bash
echo "🚀 Deploying updated nginx config to MusicRx VPS..."

# Copy nginx config to server
rsync -avz nginx.conf root@104.236.127.44:/root/musicrx/

# Deploy to VPS
ssh root@104.236.127.44 << 'VPS_SCRIPT'
cd /root/musicrx

echo "📦 Copying nginx config..."
cp nginx.conf /etc/nginx/sites-available/musicrx

echo "🔄 Testing nginx config..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Config is valid, reloading nginx..."
    systemctl reload nginx
    echo "🎉 Deploy complete!"
    echo "🌐 Test redirects:"
    echo "  - https://www.musicrx.app/"
    echo "  - http://www.musicrx.app/"
else
    echo "❌ Config error, check logs"
    exit 1
fi
VPS_SCRIPT

echo "✅ Nginx deploy complete!"
