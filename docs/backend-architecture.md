# Backend Architecture

## Overview

The backend is built with Node.js, Express.js, and TypeScript, following a modular architecture pattern with clear separation of concerns.

## Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **HTTP Client**: Axios (for TMDB API)

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Database schema definition
├── src/
│   ├── config/
│   │   └── database.ts            # Prisma client initialization
│   ├── middleware/
│   │   └── auth.ts                # JWT authentication middleware
│   ├── models/                     # (Managed by Prisma)
│   ├── routes/
│   │   ├── auth.ts                # Authentication endpoints
│   │   ├── movies.ts              # Movie search/details endpoints
│   │   ├── userMovies.ts          # User's rated movies endpoints
│   │   ├── watchlist.ts           # Watchlist management endpoints
│   │   └── recommendations.ts     # Recommendation endpoints
│   ├── services/
│   │   ├── tmdb.ts                # TMDB API integration
│   │   ├── recommendation.ts      # Recommendation algorithm
│   │   └── userPreferences.ts     # User preference analysis
│   ├── utils/
│   │   └── jwt.ts                 # JWT utility functions
│   └── index.ts                   # Application entry point
├── .env.example                    # Environment variables template
├── .gitignore
├── package.json
└── tsconfig.json
```

## Core Components

### 1. Entry Point (`src/index.ts`)

- Initializes Express application
- Sets up middleware (CORS, JSON parsing)
- Registers all route handlers
- Configures error handling
- Starts HTTP server

**Key Features:**
- CORS configuration for frontend communication
- Global error handling middleware
- Health check endpoint at `/health`

### 2. Database Configuration (`src/config/database.ts`)

- Exports configured Prisma Client instance
- Enables query logging in development mode
- Singleton pattern for database connection

### 3. Middleware (`src/middleware/auth.ts`)

**Authentication Middleware:**
- Extracts JWT token from `Authorization` header
- Verifies token validity
- Attaches decoded user info to request object
- Returns 401 for invalid/missing tokens

**Usage:**
```typescript
router.get('/protected', authenticate, (req: AuthRequest, res) => {
  const userId = req.user!.userId; // User info available
});
```

### 4. Routes

#### Auth Routes (`src/routes/auth.ts`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

**Features:**
- Email/username uniqueness validation
- Password strength validation (min 6 characters)
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation and return

#### Movie Routes (`src/routes/movies.ts`)
- `GET /api/movies/search?q=query&page=1` - Search movies
- `GET /api/movies/popular?page=1` - Get popular movies
- `GET /api/movies/:tmdbId` - Get movie details

**Features:**
- TMDB API integration
- Movie data caching (30-day cache)
- Automatic cache refresh for outdated data
- Director and cast extraction from credits

#### User Movies Routes (`src/routes/userMovies.ts`)
- `GET /api/user/movies?rating=LIKE&sort=date` - Get user's movies
- `POST /api/user/movies` - Add/rate a movie
- `PUT /api/user/movies/:id` - Update rating
- `DELETE /api/user/movies/:id` - Remove movie

**Features:**
- Filtering by rating
- Sorting (date, title, rating)
- Automatic movie caching
- Upsert logic to prevent duplicates

#### Watchlist Routes (`src/routes/watchlist.ts`)
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist
- `POST /api/watchlist/:id/watched` - Mark as watched with rating

**Features:**
- Priority levels (LOW, MEDIUM, HIGH)
- Automatic movie caching
- Move to rated movies when marked watched

#### Recommendation Routes (`src/routes/recommendations.ts`)
- `GET /api/recommendations?limit=20` - Get personalized recommendations
- `GET /api/recommendations/preferences` - Get user preferences (debug)

### 5. Services

#### TMDB Service (`src/services/tmdb.ts`)

**Purpose:** Interface with The Movie Database (TMDB) API

**Methods:**
- `searchMovies(query, page)` - Search movies by title
- `getMovieDetails(tmdbId)` - Get full movie details with credits
- `getPopularMovies(page)` - Get popular/trending movies
- `getRecommendations(tmdbId, page)` - Get TMDB recommendations for a movie
- `getSimilarMovies(tmdbId, page)` - Get similar movies
- `discoverMovies(params)` - Discover movies by criteria (genre, sort, etc.)

**Features:**
- Automatic API key injection
- Error handling and logging
- Supports pagination
- Includes movie credits (cast/crew)

#### Recommendation Service (`src/services/recommendation.ts`)

**Purpose:** Generate personalized movie recommendations

**Algorithm Flow:**
1. Get user preferences (genres, directors, actors)
2. Collect candidate movies from multiple sources:
   - Similar movies to user's top liked movies
   - Discover by preferred genres
   - Popular movies as fallback
3. Score each candidate
4. Sort by score and return top N

**Scoring Breakdown:**
- Genre matching: 40%
- Popularity/rating: 30%
- Vote count: 20%
- Recency bonus: 10%
- Penalty for disliked genres: 50% reduction

See [Recommendation Algorithm](./recommendation-algorithm.md) for details.

#### User Preferences Service (`src/services/userPreferences.ts`)

**Purpose:** Analyze user's movie preferences

**Extracts:**
- Preferred genres (from liked movies)
- Disliked genres (from disliked movies)
- Favorite directors
- Favorite actors

**Returns:**
```typescript
{
  preferredGenres: [{ id, name, count }],
  dislikedGenres: [{ id, name, count }],
  likedDirectors: [{ name, count }],
  likedActors: [{ id, name, count }]
}
```

### 6. Utilities

#### JWT Utils (`src/utils/jwt.ts`)

**Functions:**
- `generateToken(payload)` - Creates JWT with 7-day expiration
- `verifyToken(token)` - Validates and decodes JWT

**Payload Structure:**
```typescript
{
  userId: string;
  email: string;
  username: string;
}
```

## Security Features

### Authentication
- JWT-based stateless authentication
- Tokens expire after 7 days
- Secure password hashing with bcrypt (v3.0.2+)
- Salt rounds: 10
- **No hardcoded fallback secrets** - JWT_SECRET environment variable required

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Auth endpoints**: 10 requests per 15 minutes (brute force protection)
- Implemented with `express-rate-limit` middleware
- Returns 429 status with error message when exceeded

### Security Headers
- **Helmet.js** middleware enabled
- X-Frame-Options: Prevents clickjacking
- X-Content-Type-Options: Prevents MIME sniffing
- XSS Protection headers
- Content Security Policy (CSP)

### Input Validation
- **Email validation**: Regex check for valid format
- **Username validation**: 3-50 character length
- **Rating validation**: Null check before string operations
- **Priority validation**: Enum value checking
- **Pagination validation**: Clamped to 1-500 range

### Data Protection
- User-specific data isolation (all queries filter by userId)
- Cascade delete on user removal
- SQL injection protection via Prisma
- **Database transactions** for atomic operations (watchlist → rated movies)

### CORS Configuration
- Configured for frontend URL only
- Credentials allowed for cookie support
- Production uses environment-specific URLs

## Error Handling

### Global Error Handler
```typescript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});
```

### Route-Level Error Handling
- All async routes wrapped in try-catch
- Specific error messages returned
- Errors logged to console
- HTTP status codes properly set

## Environment Variables

Required variables (see `.env.example`):

```env
PORT=5000                          # Server port
NODE_ENV=development               # Environment
DATABASE_URL=postgresql://...      # PostgreSQL connection
JWT_SECRET=...                     # JWT signing secret
TMDB_API_KEY=...                   # TMDB API key
TMDB_BASE_URL=https://...          # TMDB API base URL
FRONTEND_URL=http://localhost:5173 # Frontend URL for CORS
```

## Performance Optimizations

### Caching
- Movie details cached in database (30-day TTL)
- Reduces TMDB API calls
- Automatic cache refresh when outdated

### Database Indexes
Prisma creates indexes on:
- Primary keys
- Unique fields (email, username, tmdbId)
- Foreign keys
- Compound unique constraints (userId + movieId)
- **Custom indexes added:**
  - `UserMovie.userId` - Fast user movie lookups
  - `UserMovie.movieId` - Fast movie lookups
  - `UserMovie.rating` - Fast rating filters
  - `Watchlist.userId` - Fast user watchlist lookups
  - `Watchlist.movieId` - Fast movie lookups

### Query Optimization
- Uses Prisma's type-safe queries
- Selective field inclusion
- Batch operations where possible
- Cascade operations handled by database

## API Rate Limiting

### TMDB API Limits
- Free tier: 1000 requests per day
- Rate limit: 40 requests per 10 seconds

### Mitigation Strategies
- Movie data caching (reduces API calls)
- Batch similar requests
- Error handling for rate limit errors
- Consider upgrading for production

## Running the Backend

### Development
```bash
npm run dev
```
Uses nodemon with ts-node for hot reload.

### Production
```bash
npm run build
npm start
```
Compiles TypeScript to JavaScript in `dist/` folder.

### Database Commands
```bash
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio GUI
```

## Common Issues

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

### TMDB API Issues
- Verify API key is valid
- Check rate limits haven't been exceeded
- Ensure internet connection

### Prisma Issues
- Run `prisma:generate` after schema changes
- Delete and recreate migrations if needed
- Use `prisma:studio` to inspect database

## Testing Strategy

### Unit Tests (To Implement)
- Test individual services
- Mock external dependencies
- Test utility functions

### Integration Tests (To Implement)
- Test API endpoints
- Test database operations
- Test authentication flow

### Recommended Tools
- Jest for testing framework
- Supertest for HTTP testing
- Prisma's test utilities

## Deployment Considerations

### Environment Setup
1. Set all environment variables
2. Use strong JWT_SECRET
3. Configure production DATABASE_URL
4. Set NODE_ENV=production

### Database Migration
```bash
npx prisma migrate deploy
```

### Recommended Platforms
- **Heroku**: Easy deployment, includes PostgreSQL
- **Railway**: Modern platform, good PostgreSQL support
- **Render**: Free tier available
- **DigitalOcean**: More control, affordable
- **AWS/GCP**: Enterprise-grade, more complex

### Health Monitoring
- Use `/health` endpoint for health checks
- Monitor database connection
- Track API response times
- Log errors to external service (Sentry, LogRocket)

## Implemented Security Features

The following security features are now implemented:
- **Rate limiting** per IP (express-rate-limit)
- **Security headers** (helmet.js)
- **Input validation** on all endpoints
- **Database transactions** for atomic operations

## Future Enhancements

### Features
- Request caching with Redis
- WebSocket support for real-time updates
- Background jobs for recommendation generation
- Email notifications
- Social features (friends, sharing)

### Performance
- Query result pagination
- API response compression
- CDN for static assets

### Security
- CSRF protection
- Request validation with Joi/Zod
- API versioning
