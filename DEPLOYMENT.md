# BugTrackr Deployment Guide

This guide covers deploying the unified BugTrackr Next.js application to various hosting platforms.

## Prerequisites

- Node.js 18+ installed
- AppFlyte Collection Database account with API credentials
- Git repository (for automated deployments)

## Environment Configuration

Before deploying, ensure you have the following environment variables configured:

```bash
APPFLYTE_COLLECTION_BASE_URL=https://appflyte-backend.ameya.ai/[workspace-id]/api/collection/[workspace-id]/user/public/cm/0/dpdo_bug_tracker
APPFLYTE_COLLECTION_API_KEY=your_api_key_here
DEBUG=false
```

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides the simplest deployment experience for Next.js applications with automatic builds and deployments.

#### Steps:

1. **Push to Git**
   ```bash
   git push origin main
   ```

2. **Import Project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Set root directory to `frontend`

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add the required environment variables:
     - `APPFLYTE_COLLECTION_BASE_URL`
     - `APPFLYTE_COLLECTION_API_KEY`
     - `DEBUG` (set to `false`)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application
   - Future pushes to main branch will trigger automatic deployments

#### Vercel Configuration

Create `vercel.json` in the `frontend` directory (optional):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Option 2: Netlify

Netlify also provides excellent Next.js support with automatic deployments.

#### Steps:

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your Git repository

2. **Configure Build Settings**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/.next`

3. **Set Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add the required environment variables

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your application

#### Netlify Configuration

Create `netlify.toml` in the root directory:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Option 3: Self-Hosted (VPS/Cloud Server)

For more control, you can deploy to your own server.

#### Requirements:
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt recommended)

#### Steps:

1. **Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd bugtrackr-app/frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   nano .env.local  # Edit with your credentials
   ```

4. **Build Application**
   ```bash
   npm run build
   ```

5. **Install PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   ```

6. **Start Application**
   ```bash
   pm2 start npm --name "bugtrackr" -- start
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

7. **Configure Nginx**
   
   Create `/etc/nginx/sites-available/bugtrackr`:
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/bugtrackr /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

9. **Set Up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 4: Docker Deployment

Deploy using Docker containers for consistency across environments.

#### Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built application
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  bugtrackr:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - APPFLYTE_COLLECTION_BASE_URL=${APPFLYTE_COLLECTION_BASE_URL}
      - APPFLYTE_COLLECTION_API_KEY=${APPFLYTE_COLLECTION_API_KEY}
      - DEBUG=false
    restart: unless-stopped
```

#### Deploy with Docker:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Post-Deployment Checklist

After deploying, verify the following:

- [ ] Application loads at your domain
- [ ] Health check endpoint responds: `https://your-domain.com/api/health`
- [ ] Can view bugs list
- [ ] Can create new bugs
- [ ] Can update bug status
- [ ] Can add comments
- [ ] Activity logs are recorded
- [ ] No CORS errors in browser console
- [ ] All API endpoints return correct status codes

## Monitoring and Maintenance

### Health Monitoring

Set up monitoring for the health endpoint:

```bash
# Simple uptime monitoring
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "collectionDb": {
      "status": "connected",
      "type": "AppFlyte Collection Database"
    }
  }
}
```

### Log Management

**Vercel/Netlify**: View logs in the platform dashboard

**Self-Hosted with PM2**:
```bash
pm2 logs bugtrackr
pm2 logs bugtrackr --lines 100
```

**Docker**:
```bash
docker-compose logs -f bugtrackr
```

### Performance Monitoring

Monitor key metrics:
- API response times
- Collection DB query performance
- Error rates
- User activity patterns

### Backup Strategy

**Collection DB Data**:
- AppFlyte handles database backups
- Export critical data periodically for redundancy

**Application Code**:
- Keep Git repository as source of truth
- Tag releases for easy rollback

## Troubleshooting

### Application Won't Start

1. Check environment variables are set correctly
2. Verify Node.js version (18+)
3. Check logs for specific errors
4. Ensure Collection DB credentials are valid

### API Endpoints Return 500 Errors

1. Check Collection DB connectivity
2. Verify API key is correct
3. Check Collection DB base URL format
4. Review server logs for detailed error messages

### Slow Performance

1. Verify Collection DB query optimization is enabled
2. Check network latency to Collection DB
3. Review API route implementations for inefficiencies
4. Consider caching frequently accessed data

### CORS Errors

This should not happen with the unified architecture. If you see CORS errors:
1. Verify frontend and API are on the same domain
2. Check that you're not mixing HTTP and HTTPS
3. Ensure no hardcoded backend URLs remain in frontend code

## Rollback Procedure

If issues arise after deployment:

### Vercel/Netlify
1. Go to Deployments in dashboard
2. Find previous working deployment
3. Click "Promote to Production"

### Self-Hosted
```bash
# Stop current version
pm2 stop bugtrackr

# Checkout previous version
git checkout <previous-commit-hash>
cd frontend
npm install
npm run build

# Restart
pm2 restart bugtrackr
```

### Docker
```bash
# Stop current containers
docker-compose down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose up -d --build
```

## Scaling Considerations

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

**Vercel/Netlify**: Automatic scaling included

**Self-Hosted**: Use a load balancer (Nginx, HAProxy) with multiple instances:
```bash
pm2 start npm --name "bugtrackr-1" -i 4 -- start
```

### Database Optimization

- Use Collection DB filter queries to reduce data transfer
- Set `include_detail=false` for list operations
- Implement caching for frequently accessed data
- Monitor query performance and optimize as needed

## Security Best Practices

1. **Environment Variables**: Never commit `.env.local` to Git
2. **API Keys**: Rotate Collection DB API keys periodically
3. **HTTPS**: Always use HTTPS in production
4. **Updates**: Keep dependencies updated for security patches
5. **Access Control**: Implement proper authentication/authorization
6. **Rate Limiting**: Consider adding rate limiting to API routes

## Support and Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Netlify Documentation**: https://docs.netlify.com
- **AppFlyte Documentation**: Contact AppFlyte support

## Conclusion

The unified Next.js architecture simplifies deployment significantly compared to the previous dual-folder setup. Choose the deployment option that best fits your needs:

- **Vercel**: Best for quick deployment with minimal configuration
- **Netlify**: Alternative to Vercel with similar features
- **Self-Hosted**: Maximum control and customization
- **Docker**: Consistent deployment across any environment

All options provide a production-ready environment for BugTrackr.
