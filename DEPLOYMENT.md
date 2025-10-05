# Deployment Guide for Fingrow

This guide covers deployment options for the Fingrow marketplace application.

## Cloud Deployment (Render.com)

### Option 1: Using render.yaml (Recommended)

1. **Prepare the repository:**
   ```bash
   # Run the cloud build script to prepare files
   npm run build:cloud
   
   # Commit changes
   git add .
   git commit -m "Prepare for Render.com deployment"
   git push origin main
   ```

2. **Deploy on Render.com:**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy

### Option 2: Manual Setup

1. **Create a new Web Service on Render.com:**
   - Repository: Your GitHub repository
   - Branch: `main`
   - Build Command: `npm run build:cloud && npm ci --only=production`
   - Start Command: `npm run start:cloud`

2. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   RENDER=true
   ```

3. **Add Persistent Disk:**
   - Name: `fingrow-data`
   - Mount Path: `/app/data`
   - Size: 1GB (minimum)

### Troubleshooting Common Issues

#### 1. better-sqlite3 Compilation Errors
The cloud build script automatically removes SQLite dependencies and uses a JSON-based database instead.

#### 2. File Upload Issues
Ensure the uploads directory is created:
```bash
mkdir -p uploads/{profiles,products,qrcodes}
```

#### 3. Database Initialization
The JSON database will be automatically created on first run in the `/app/data` directory.

## Docker Deployment

### Local Docker
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Docker on Cloud Platforms

#### 1. Google Cloud Run
```bash
# Build and push to Google Container Registry
docker build -t gcr.io/PROJECT_ID/fingrow .
docker push gcr.io/PROJECT_ID/fingrow

# Deploy to Cloud Run
gcloud run deploy fingrow \
  --image gcr.io/PROJECT_ID/fingrow \
  --port 5000 \
  --allow-unauthenticated
```

#### 2. AWS ECS/Fargate
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker build -t fingrow .
docker tag fingrow:latest ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/fingrow:latest
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/fingrow:latest
```

#### 3. DigitalOcean App Platform
Create `app.yaml`:
```yaml
name: fingrow
services:
- name: api
  source_dir: /
  github:
    repo: your-username/fingrow
    branch: main
  run_command: npm run start:cloud
  build_command: npm run build:cloud && npm ci --only=production
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 5000
  health_check:
    http_path: /api/health
```

## Traditional VPS Deployment

### 1. Server Setup (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx
```

### 2. Application Setup
```bash
# Clone repository
git clone https://github.com/your-username/fingrow.git
cd fingrow

# Prepare for cloud deployment
npm run build:cloud

# Install dependencies
npm ci --only=production

# Create required directories
mkdir -p data uploads/{profiles,products,qrcodes}

# Set proper permissions
chmod 755 data uploads
```

### 3. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'fingrow-api',
    script: 'api/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Nginx Configuration
Create `/etc/nginx/sites-available/fingrow`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:5000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fingrow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Considerations

### Development
- Uses SQLite for simplicity
- Database file: `data/fingrow.db`

### Cloud Deployment
- Uses JSON-based database for compatibility
- Data file: `data/fingrow.json`
- Automatic backups recommended

### Production Recommendations
For high-traffic production, consider:
- PostgreSQL on managed services (AWS RDS, Google Cloud SQL)
- Redis for caching
- CDN for static assets

## Monitoring & Maintenance

### Health Checks
- Endpoint: `/api/health`
- Returns JSON with server status

### Logging
```bash
# PM2 logs
pm2 logs fingrow-api

# Docker logs
docker-compose logs -f api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy
```bash
# Manual backup
cp data/fingrow.json backup/fingrow_$(date +%Y%m%d_%H%M%S).json

# Automated backup (cron)
0 2 * * * cp /path/to/fingrow/data/fingrow.json /path/to/backups/fingrow_$(date +\%Y\%m\%d).json
```

## Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management

2. **File Uploads:**
   - Validate file types and sizes
   - Scan for malware in production

3. **Rate Limiting:**
   - Implement rate limiting for API endpoints
   - Use Nginx rate limiting for additional protection

4. **HTTPS:**
   - Always use HTTPS in production
   - Implement HSTS headers

5. **Database Security:**
   - Regular backups
   - Access controls
   - Encryption at rest (for sensitive data)

## Performance Optimization

1. **Caching:**
   - Implement Redis for session storage
   - Cache frequently accessed data

2. **CDN:**
   - Use CloudFlare or AWS CloudFront
   - Cache static assets and images

3. **Database:**
   - Implement database indexing
   - Consider read replicas for high traffic

4. **Monitoring:**
   - Use APM tools (New Relic, DataDog)
   - Set up alerts for downtime and errors