# Render.com Deployment Guide

This guide provides multiple deployment options for Render.com to handle various compatibility issues.

## Quick Fix for Current Error

The Docker user creation error can be resolved using one of these approaches:

### Option 1: Node.js Native Deployment (Recommended)

**Why this works:** Avoids Docker complications entirely, uses Render's native Node.js environment.

1. **Rename the configuration file:**
   ```bash
   mv render-node.yaml render.yaml
   ```

2. **Push to repository:**
   ```bash
   git add .
   git commit -m "Use Node.js native deployment for Render.com"
   git push origin main
   ```

3. **Deploy on Render.com:**
   - Connect your repository
   - Render will use the `render.yaml` configuration
   - No Docker build issues!

### Option 2: Simple Docker (No User Creation)

**Why this works:** Uses Docker but avoids user permission complexities.

1. **Use the simple Docker configuration:**
   ```bash
   mv render-simple.yaml render.yaml
   ```

2. **Push and deploy:**
   ```bash
   git add .
   git commit -m "Use simple Docker configuration"
   git push origin main
   ```

### Option 3: Manual Service Creation

If the YAML configurations don't work, create the service manually:

1. **Go to Render.com Dashboard**
2. **Create New Web Service**
3. **Configure as follows:**

   **For Node.js Native:**
   - **Environment:** Node
   - **Build Command:** `npm run build:cloud && npm ci --only=production`
   - **Start Command:** `npm run start:cloud`

   **For Docker:**
   - **Environment:** Docker
   - **Dockerfile Path:** `./Dockerfile.simple`

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   RENDER=true
   ```

5. **Add Persistent Disk:**
   - **Name:** `fingrow-data`
   - **Mount Path:** `/opt/render/project/src/data` (for Node.js) or `/app/data` (for Docker)
   - **Size:** 1GB

## Deployment Options Comparison

| Option | Type | Pros | Cons | Recommended For |
|--------|------|------|------|-----------------|
| Node.js Native | Native | Fast builds, no Docker issues | Less isolated | **Most users** |
| Simple Docker | Docker | Consistent environment | Slower builds | Advanced users |
| Full Docker | Docker | Complete isolation | Complex setup | Development only |

## Troubleshooting Common Issues

### 1. Build Fails with SQLite Errors
**Solution:** The build script automatically switches to JSON database.
```bash
npm run build:cloud
```

### 2. Permission Denied Errors
**Solution:** Use Node.js native deployment (Option 1).

### 3. File Upload Issues
**Solution:** Ensure persistent disk is mounted correctly:
- Node.js: `/opt/render/project/src/data`
- Docker: `/app/data`

### 4. Health Check Fails
**Solution:** Verify the health check endpoint:
```bash
curl https://your-app.onrender.com/api/health
```

## Step-by-Step Deployment

### Using Node.js Native (Recommended)

1. **Prepare the repository:**
   ```bash
   # Use Node.js configuration
   cp render-node.yaml render.yaml
   
   # Prepare for cloud deployment
   npm run build:cloud
   
   # Commit changes
   git add .
   git commit -m "Prepare for Render.com Node.js deployment"
   git push origin main
   ```

2. **Deploy on Render.com:**
   - Go to [Render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically
   - Click "Create Web Service"

3. **Verify deployment:**
   - Wait for build to complete
   - Visit your app URL
   - Check `/api/health` endpoint

### Using Simple Docker

1. **Prepare the repository:**
   ```bash
   # Use simple Docker configuration
   cp render-simple.yaml render.yaml
   
   # Commit changes
   git add .
   git commit -m "Use simple Docker for Render.com"
   git push origin main
   ```

2. **Deploy and verify as above**

## Post-Deployment Configuration

### 1. Custom Domain (Optional)
- Go to Settings → Custom Domains
- Add your domain and configure DNS

### 2. Environment Variables
Add these if needed:
```
DATABASE_URL=your_database_url
API_KEY=your_api_key
```

### 3. Scaling (Paid Plans)
- Go to Settings → Scaling
- Increase instances for high traffic

## Monitoring and Maintenance

### Health Monitoring
```bash
# Check app status
curl https://your-app.onrender.com/api/health

# Expected response:
{
  "success": true,
  "message": "Fingrow API is running",
  "timestamp": "2024-..."
}
```

### Logs
- Go to your service dashboard
- Click "Logs" tab
- Monitor for errors and performance

### Database Backup
The JSON database is automatically backed up with the persistent disk. For additional safety:

1. **Download database:**
   - Go to Files tab in Render dashboard
   - Download `data/fingrow.json`

2. **Scheduled backups:**
   - Set up external backup service
   - Use Render's disk snapshots (paid feature)

## Performance Optimization

### 1. Enable HTTP/2
- Automatically enabled on Render.com
- No configuration needed

### 2. CDN for Static Assets
```javascript
// Add to your app
app.use('/uploads', express.static('uploads', {
  maxAge: '7d',
  etag: true
}));
```

### 3. Health Check Optimization
```javascript
// Optimize health check response
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now()
  });
});
```

## Security Considerations

### 1. Environment Variables
- Never commit sensitive data
- Use Render's environment variable system

### 2. HTTPS
- Automatically enabled on Render.com
- Free SSL certificates included

### 3. Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

## Cost Optimization

### Free Tier Limits
- 750 hours/month (about 1 month of continuous running)
- 100GB bandwidth
- Automatic sleep after 15 minutes of inactivity

### Paid Plans
- **Starter ($7/month):** Always on, custom domains
- **Standard ($25/month):** More resources, priority support

## Getting Help

### Common Commands
```bash
# Check deployment status
render services list

# View logs
render logs -f your-service-name

# Deploy latest changes
git push origin main
```

### Support Resources
- [Render.com Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Status Page](https://status.render.com)

## Success Checklist

- [ ] Repository pushed to GitHub
- [ ] `render.yaml` configured correctly
- [ ] Build script runs successfully
- [ ] Service deploys without errors
- [ ] Health check endpoint responds
- [ ] App loads in browser
- [ ] API endpoints work correctly
- [ ] File uploads work (if using persistent disk)
- [ ] Environment variables set correctly