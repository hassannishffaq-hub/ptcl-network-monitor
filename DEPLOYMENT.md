# PTCL Network Monitor - Online Deployment Guide

## 🚀 Free Hosting with Render.com

### Step 1: Create GitHub Repository
1. Go to github.com
2. Create new repository: `ptcl-network-monitor`
3. Upload all files from local folder

### Step 2: Deploy to Render.com
1. Go to render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure deployment:
   - **Name**: ptcl-network-monitor
   - **Root Directory**: backend
   - **Build Command**: `npm run install-frontend && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3: Environment Variables
Add these in Render dashboard:
- `NODE_ENV`: production
- `PORT`: 10000 (Render provides)

### Step 4: Deploy!
Click "Create Web Service" and wait for deployment.

### Access Your App
Your app will be available at: `https://ptcl-network-monitor.onrender.com`

## 📱 Features After Deployment
- ✅ 24/7 online access
- ✅ Custom domain support
- ✅ SSL certificate
- ✅ Mobile responsive
- ✅ Real-time monitoring

## 💰 Cost: $0/month (Free Tier)
