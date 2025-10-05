# Docker Setup for Fingrow

This document explains how to run Fingrow using Docker for both development and production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB free disk space

## Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd fingrow
```

### 2. Create environment file
```bash
cp .env.example .env
```

### 3. Start the application

#### Development Mode
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

#### Production Mode
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Services

### Development Environment

1. **API Server** (http://localhost:5000)
   - Node.js Express API
   - Hot reloading enabled
   - Source code mounted as volume

2. **Nginx** (http://localhost:80)
   - Reverse proxy
   - Handles routing to API, admin, and mobile

3. **Adminer** (http://localhost:8080)
   - Database management UI
   - Access SQLite database visually

### Production Environment

1. **API Server** (port 5000)
   - Optimized production build
   - No source code mounting
   - Resource limits applied

2. **Nginx** (ports 80/443)
   - SSL termination
   - Static file caching
   - Load balancing ready

3. **Backup Service**
   - Daily automated backups
   - 7-day retention policy

## Accessing the Application

### Development
- Landing Page: http://localhost
- Admin Panel: http://localhost/admin
- Mobile Web: http://localhost/mobile
- API Docs: http://localhost/api/health
- Database UI: http://localhost:8080

### Production
- Configure your domain in nginx configuration
- Set up SSL certificates in `docker/nginx/ssl/`
- Update `docker/nginx/nginx.prod.conf` with your domain

## Database Management

### Accessing the Database

#### Using Adminer (Development)
1. Go to http://localhost:8080
2. System: SQLite 3
3. Database: `/data/fingrow.db`
4. Leave username/password empty

#### Using Docker CLI
```bash
# Access SQLite CLI
docker-compose exec api sqlite3 /app/data/fingrow.db

# Run SQL commands
.tables
.schema users
SELECT * FROM users LIMIT 5;
.exit
```

### Backup & Restore

#### Manual Backup
```bash
# Create backup
docker-compose exec api sqlite3 /app/data/fingrow.db ".backup /app/data/backup.db"

# Copy backup to host
docker cp fingrow-api:/app/data/backup.db ./backup.db
```

#### Restore from Backup
```bash
# Copy backup to container
docker cp ./backup.db fingrow-api:/app/data/restore.db

# Restore database
docker-compose exec api sqlite3 /app/data/fingrow.db ".restore /app/data/restore.db"
```

## File Uploads

Uploaded files are persisted in Docker volumes:
- Profile images: `./uploads/profiles`
- Product images: `./uploads/products`
- QR codes: `./uploads/qrcodes`

### Managing Uploads
```bash
# View upload directory
docker-compose exec api ls -la /app/uploads/

# Copy files from container
docker cp fingrow-api:/app/uploads ./uploads-backup

# Clean old uploads
docker-compose exec api find /app/uploads -type f -mtime +30 -delete
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 api
```

### Health Checks
```bash
# Check API health
curl http://localhost/health

# Check container status
docker-compose ps

# View resource usage
docker stats
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :5000
   # Kill process or change port in docker-compose.yml
   ```

2. **Permission errors**
   ```bash
   # Fix ownership
   docker-compose exec api chown -R nodejs:nodejs /app/data /app/uploads
   ```

3. **Database locked**
   ```bash
   # Restart API service
   docker-compose restart api
   ```

4. **Out of disk space**
   ```bash
   # Clean Docker system
   docker system prune -a
   ```

### Debugging

```bash
# Access container shell
docker-compose exec api sh

# Check Node.js version
docker-compose exec api node --version

# Test database connection
docker-compose exec api node -e "
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/fingrow.db');
  console.log(db.prepare('SELECT COUNT(*) as count FROM users').get());
"
```

## Production Deployment

### 1. Prepare Server
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configure Environment
- Update `.env` with production values
- Set strong passwords and secrets
- Configure domain names

### 3. SSL Setup
```bash
# Create SSL directory
mkdir -p docker/nginx/ssl

# Copy certificates
cp /path/to/cert.pem docker/nginx/ssl/
cp /path/to/key.pem docker/nginx/ssl/

# Update nginx configuration
vi docker/nginx/nginx.prod.conf
```

### 4. Deploy
```bash
# Pull latest code
git pull origin main

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 5. Setup Monitoring
```bash
# Install monitoring stack (optional)
docker run -d \
  --name=monitoring \
  --restart=always \
  -p 3000:3000 \
  grafana/grafana
```

## Maintenance

### Update Application
```bash
# Development
git pull
docker-compose down
docker-compose up -d --build

# Production
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Clean Up
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (careful!)
docker volume prune

# Full cleanup
docker system prune -a
```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` file
   - Use Docker secrets for sensitive data in production

2. **Network Security**
   - Use custom networks to isolate services
   - Limit exposed ports

3. **File Permissions**
   - Run as non-root user (nodejs)
   - Set appropriate file permissions

4. **Updates**
   - Regularly update base images
   - Monitor security advisories

## Performance Optimization

1. **Multi-stage Builds**
   - Reduces image size
   - Separates build and runtime dependencies

2. **Layer Caching**
   - Order Dockerfile commands efficiently
   - Copy package.json before source code

3. **Resource Limits**
   - Set memory and CPU limits in production
   - Monitor resource usage

4. **Health Checks**
   - Configured for automatic container recovery
   - Monitors API availability