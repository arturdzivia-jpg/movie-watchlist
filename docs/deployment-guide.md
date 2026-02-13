# Deployment Guide

## Overview

This guide covers deploying the Movie Watchlist application to production. The application consists of two parts:
- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React SPA (Single Page Application)

## Prerequisites

- Git repository (GitHub, GitLab, etc.)
- TMDB API key
- Production PostgreSQL database
- Deployment accounts (Vercel, Heroku, etc.)

---

## Backend Deployment

### Option 1: Railway (Recommended)

**Why Railway:**
- Built-in PostgreSQL support
- Automatic deployments from Git
- Free tier available
- Simple configuration
- Good performance

**Steps:**

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your repo
   - Select your repository

3. **Add PostgreSQL Database**
   - In project dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway provisions database automatically

4. **Configure Backend Service**
   - Click on your backend service
   - Go to "Variables" tab
   - Add environment variables:

   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway variable reference
   JWT_SECRET=<generate-a-long-random-string>
   TMDB_API_KEY=<your-tmdb-api-key>
   TMDB_BASE_URL=https://api.themoviedb.org/3
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

5. **Configure Build Settings**
   - Root directory: `/backend`
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma db push && npm start`

   **Note:** We use `prisma db push` instead of `migrate deploy` for simpler schema sync on Railway.

6. **Deploy**
   - Railway auto-deploys on git push
   - First deployment triggers automatically
   - Get your backend URL from Railway dashboard

7. **Run Database Migrations**
   - Schema sync runs automatically via start command (`prisma db push`)
   - Or manually via Railway CLI:
     ```bash
     railway run npx prisma db push
     ```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Option 2: Heroku

**Steps:**

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

4. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:essential-0
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=<your-secret>
   heroku config:set TMDB_API_KEY=<your-key>
   heroku config:set TMDB_BASE_URL=https://api.themoviedb.org/3
   heroku config:set FRONTEND_URL=https://your-frontend.vercel.app
   ```

6. **Create Procfile** (in backend directory)
   ```
   web: npx prisma migrate deploy && npm start
   ```

7. **Deploy**
   ```bash
   git push heroku main
   ```

8. **Scale**
   ```bash
   heroku ps:scale web=1
   ```

---

### Option 3: Render

**Steps:**

1. **Sign up at [render.com](https://render.com)**

2. **Create Web Service**
   - New → Web Service
   - Connect your Git repository
   - Select backend directory

3. **Configure**
   - Name: `movie-watchlist-api`
   - Environment: Node
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && npm start`
   - Instance type: Free

4. **Create PostgreSQL Database**
   - New → PostgreSQL
   - Name: `movie-watchlist-db`
   - Free tier

5. **Environment Variables**
   ```env
   NODE_ENV=production
   DATABASE_URL=<internal-database-url-from-render>
   JWT_SECRET=<your-secret>
   TMDB_API_KEY=<your-key>
   TMDB_BASE_URL=https://api.themoviedb.org/3
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

6. **Deploy**
   - Auto-deploys from Git pushes
   - Manual deploy button in dashboard

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

**Why Vercel:**
- Built for React/Vite
- Zero configuration
- Automatic deployments
- Free tier
- Excellent performance (CDN)

**Steps:**

1. **Sign up at [vercel.com](https://vercel.com)**

2. **Import Project**
   - New Project
   - Import Git Repository
   - Select your repository
   - Select `frontend` directory

3. **Configure Build Settings**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)

4. **Environment Variables**
   ```env
   VITE_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Auto-deploys on git push to main
   - Get your frontend URL

6. **Update Backend CORS**
   - Go to Railway/Heroku backend
   - Update `FRONTEND_URL` to your Vercel URL
   - Redeploy backend

---

### Option 2: Netlify

**Steps:**

1. **Sign up at [netlify.com](https://netlify.com)**

2. **New Site from Git**
   - Connect to Git provider
   - Select repository
   - Select `frontend` directory

3. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: `frontend`

4. **Environment Variables**
   - Site settings → Environment variables
   - Add `VITE_API_URL`

5. **Deploy**
   - Trigger deploy
   - Auto-deploys on git push

---

### Option 3: Cloudflare Pages

**Steps:**

1. **Sign up at Cloudflare**

2. **Create Pages Project**
   - Pages → Create a project
   - Connect Git
   - Select repository

3. **Build Configuration**
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`

4. **Environment Variables**
   ```env
   VITE_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**
   - Automatic on git push

---

## Post-Deployment Checklist

### Backend

- [ ] Database migrations applied
- [ ] Environment variables set correctly
- [ ] Health check endpoint accessible (`/health`)
- [ ] Health check returns: `{"status":"ok","checks":{"database":"healthy"}}`
- [ ] CORS configured for frontend URL
- [ ] JWT secret is secure and random (no hardcoded fallback)
- [ ] Rate limiting active (test with rapid requests)
- [ ] Security headers present (check browser dev tools → Network → Response Headers)
- [ ] Logs accessible and monitored

### Frontend

- [ ] Production build successful
- [ ] API URL points to production backend
- [ ] CORS working (no console errors)
- [ ] Login/register flow works
- [ ] All features functional
- [ ] Mobile responsive

### Database

- [ ] Backups configured
- [ ] Connection pooling optimized
- [ ] Indexes created by Prisma
- [ ] Data persists correctly

---

## Environment Variables Summary

### Backend (.env in production)

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=<64-character-random-hex-string>

# TMDB
TMDB_API_KEY=<your-tmdb-api-key>
TMDB_BASE_URL=https://api.themoviedb.org/3

# CORS
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (in Vercel/Netlify)

```env
VITE_API_URL=https://your-backend-domain.com
```

---

## Monitoring and Logging

### Backend Monitoring

**Railway:**
- Built-in logs and metrics
- Real-time log streaming
- Resource usage graphs

**Heroku:**
```bash
heroku logs --tail
heroku logs --source app
```

**Add External Monitoring:**
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **DataDog**: APM
- **New Relic**: Performance monitoring

### Frontend Monitoring

**Vercel Analytics:**
- Enable in project settings
- Free tier available
- Core Web Vitals

**Add External:**
- **Sentry**: JavaScript error tracking
- **Google Analytics**: User analytics
- **Plausible**: Privacy-friendly analytics

---

## Database Backups

### Railway
- Automatic backups (paid plans)
- Manual snapshots available

### Heroku
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

### Manual Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$DATE.sql"

# Get database URL from environment
DATABASE_URL="your-production-database-url"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Keep only last 30 days
find . -name "backup_*.sql" -mtime +30 -delete
```

**Automate with Cron:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## CI/CD Setup

### GitHub Actions

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm ci
      - run: cd backend && npm test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Railway, Vercel auto-deploy from Git
      - run: echo "Deployment triggered by Git push"
```

---

## Custom Domain Setup

### Frontend (Vercel)

1. Go to project Settings → Domains
2. Add your domain (e.g., `watchlist.yourdomain.com`)
3. Add DNS records as instructed
4. Vercel provisions SSL automatically

### Backend (Railway)

1. Go to service Settings → Networking
2. Add custom domain
3. Configure DNS CNAME record
4. SSL automatically provisioned

---

## Performance Optimization

### Backend

1. **Enable Compression**
   ```bash
   npm install compression
   ```
   ```typescript
   import compression from 'compression';
   app.use(compression());
   ```

2. **Connection Pooling**
   ```env
   DATABASE_URL=postgresql://...?connection_limit=10
   ```

3. **Response Caching** (future)
   ```typescript
   import redis from 'redis';
   const cache = redis.createClient(process.env.REDIS_URL);
   ```

### Frontend

1. **Code Splitting** (Vite does this automatically)

2. **Asset Optimization**
   - Vite minifies automatically
   - Images optimized by build

3. **CDN** (Vercel/Netlify provide this)

---

## Security Checklist

- [x] HTTPS enabled (both frontend and backend)
- [x] Environment variables secured (not in code)
- [x] JWT secret is strong and unique (no hardcoded fallback)
- [x] CORS properly configured
- [x] Rate limiting enabled (express-rate-limit)
- [x] SQL injection prevented (Prisma does this)
- [x] XSS protection (React does this)
- [ ] Dependencies updated regularly
- [x] Security headers configured (Helmet.js)

### Implemented Security Features

**Rate Limiting (Already Implemented):**
```typescript
// General API: 100 requests per 15 minutes
// Auth endpoints: 10 requests per 15 minutes
import rateLimit from 'express-rate-limit';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts' }
});
```

**Security Headers (Already Implemented):**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

**JWT Security (Already Implemented):**
- No hardcoded fallback secrets
- Application fails fast if `JWT_SECRET` not set
- 7-day token expiration

---

## Rollback Strategy

### Railway/Render
- Click on previous deployment
- Click "Redeploy"

### Heroku
```bash
heroku releases
heroku rollback v123
```

### Vercel
- Deployments tab
- Find previous deployment
- Click "Promote to Production"

---

## Scaling Considerations

### Vertical Scaling
- Upgrade instance size on Railway/Heroku
- More RAM/CPU for backend
- Bigger database instance

### Horizontal Scaling
- Add more backend instances
- Load balancer (provided by platforms)
- Database read replicas

### Caching Layer
- Add Redis for session storage
- Cache TMDB API responses
- Cache recommendation results

---

## Cost Estimation

### Free Tier Limits

**Railway:**
- $5 free credit/month
- Sleeps after inactivity
- PostgreSQL included

**Vercel:**
- 100 GB bandwidth/month
- Unlimited deployments
- Edge functions

**Render:**
- Free PostgreSQL (limited)
- Free web service (spins down)
- 750 hours/month

### Paid Tier Costs (Approximate)

**Backend + Database:**
- Railway: $5-20/month
- Heroku: $7-25/month
- Render: $7-25/month

**Frontend:**
- Vercel: Free for most apps
- Netlify: Free for most apps

**Total:** $5-25/month for small-medium traffic

---

## Troubleshooting

### Build Failures

**Issue:** "Prisma generate failed"
**Solution:** Ensure `prisma generate` runs before build

**Issue:** "TypeScript errors"
**Solution:** Fix errors locally, commit, push

### Runtime Errors

**Issue:** 502 Bad Gateway
**Solution:** Check backend logs, ensure server starts

**Issue:** Database connection failed
**Solution:** Verify DATABASE_URL format

**Issue:** CORS errors
**Solution:** Update FRONTEND_URL in backend env

### Performance Issues

**Issue:** Slow API responses
**Solution:**
- Check database query performance
- Add indexes to frequently queried fields
- Enable query logging to find slow queries

**Issue:** High memory usage
**Solution:**
- Increase instance size
- Check for memory leaks
- Optimize database queries

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check error logs
- Monitor uptime
- Review performance metrics

**Monthly:**
- Update dependencies
- Review database size
- Check backup integrity
- Update documentation

**Quarterly:**
- Security audit
- Performance optimization
- Cost review
- Feature planning

---

## Support and Resources

### Platform Documentation
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Heroku Docs](https://devcenter.heroku.com)
- [Render Docs](https://render.com/docs)

### Database
- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

### Monitoring
- [Sentry](https://sentry.io)
- [LogRocket](https://logrocket.com)
