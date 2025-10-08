# 🚀 MusicRx Deployment Coordination System

## Overview
MusicRx uses a **hybrid deployment strategy** with 3 systems working together:

1. **GitHub Pages** - Static frontend (automatic)
2. **Vercel** - Alternative frontend + serverless API (manual/on-demand)
3. **VPS** - Full backend with media processing (manual)

## 🏷️ Deployment Labels System

### Git Commit Labels (in commit messages):
- `[frontend-only]` - Only deploy to GitHub Pages
- `[vercel-deploy]` - Trigger Vercel deployment
- `[backend-update]` - VPS backend needs manual deployment
- `[full-deploy]` - Deploy everything

### Automatic Triggers:
- **GitHub Pages**: Deploys on any `public/` folder changes
- **Vercel**: Manual trigger or when `[vercel-deploy]` label used
- **VPS**: Always manual (run `./deploy.sh` on VPS)

## 🌍 Environment Configuration

### Frontend BACKEND_URL Routing:

```javascript
// In public/script.js
const BACKEND_URL = window.location.hostname === 'musicrx.app'
  ? 'https://musicrx.app'          // GitHub Pages → VPS Backend
  : 'https://musicrx.vercel.app';  // Vercel → Vercel Serverless
```

### Domain Strategy:
- `musicrx.app` → GitHub Pages + VPS Backend
- `musicrx.vercel.app` → Vercel Full-Stack
- `vps.musicrx.app` → Direct VPS access (optional)

## 📋 Deployment Checklist

### For Frontend-Only Changes:
```bash
git add public/
git commit -m "✨ Add new feature [frontend-only]"
git push  # → GitHub Pages auto-deploys
```

### For Backend Changes:
```bash
git add backend/
git commit -m "🔧 API improvements [backend-update]"
git push

# Then manually deploy to VPS:
ssh user@vps "cd ~/musicrx && ./deploy.sh"
```

### For Full Deployment:
```bash
git add .
git commit -m "🚀 Major update [full-deploy]"
git push

# Deploy sequence:
# 1. GitHub Pages (automatic)
# 2. Vercel (manual trigger)
# 3. VPS Backend (manual)
```

## 🔄 Conflict Prevention

### 1. **Path-Based Deployment**
- GitHub Actions only triggers on `public/` changes
- Vercel can be configured to ignore certain paths
- VPS deployment is always manual

### 2. **Environment Variables**
```bash
# .env for different deployments
DEPLOY_TARGET=github    # or vercel or vps
BACKEND_URL=https://musicrx.app
```

### 3. **Feature Flags**
```javascript
// Conditional features based on deployment
const isVercel = window.location.hostname.includes('vercel');
const isGitHub = window.location.hostname === 'musicrx.app';

if (isVercel) {
  // Enable Vercel-specific features
} else if (isGitHub) {
  // Enable GitHub Pages features
}
```

## 📊 Monitoring & Status

### Deployment Status URLs:
- **GitHub Pages**: https://github.com/vzdzt/musicrx/deployments
- **Vercel**: https://vercel.com/vzdzt/musicrx
- **VPS Health**: https://musicrx.app/api/health

### Logs:
- **GitHub Actions**: GitHub → Actions tab
- **Vercel**: Vercel dashboard → Functions
- **VPS**: `pm2 logs musicrx-backend`

## 🛠️ Troubleshooting

### If deployments conflict:
1. Check which domain you're testing on
2. Verify BACKEND_URL in browser console
3. Clear browser cache (Ctrl+F5)
4. Check deployment status in respective dashboards

### If features don't work:
1. Confirm correct BACKEND_URL is being used
2. Check if feature requires VPS (media downloads)
3. Verify API endpoints are accessible

## 🎯 Best Practices

1. **Use labels consistently** in commit messages
2. **Test on all domains** after major changes
3. **Document deployment requirements** for new features
4. **Monitor all three systems** regularly
5. **Have rollback plans** for each deployment method

## 📞 Emergency Contacts

- **GitHub Pages Issues**: Check GitHub Actions logs
- **Vercel Issues**: Vercel dashboard or support
- **VPS Issues**: SSH access and PM2 logs

---

**Remember**: This hybrid approach maximizes flexibility but requires careful coordination. Consider consolidating to 2 methods when possible for simplicity.
