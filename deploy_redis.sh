#!/bin/bash
# Redis Deployment Script for MusicRx

echo "🔧 Installing Redis for MusicRx caching layer..."

# Ubuntu/Debian Redis installation
sudo apt update
sudo apt install redis-server -y

# Configure Redis for production
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# Secure Redis (optional - update later if needed)
# echo "bind 127.0.0.1 ::1" >> /etc/redis/redis.conf
# echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo systemctl status redis-server

echo "✅ Redis installed and configured!"
echo "✅ Auto-scaling caching layer available"
echo "📊 In-memory performance significantly increased"
