# Movie Watchlist & Recommendation System

A full-stack web application for managing your movie watchlist with personalized recommendations based on your preferences.

**Live Demo:** [movie-watchlist-production.up.railway.app](https://movie-watchlist-production.up.railway.app)

## Features

- **User Authentication**: Secure registration and login with JWT
- **Movie Search**: Search movies using TMDB API
- **Personal Movie List**: Rate movies with 4-tier system (Dislike, OK, Like, Super Like)
- **Watchlist**: Add movies to watch later with priority levels
- **Personalized Recommendations**: Content-based movie suggestions based on your ratings
- **Statistics Dashboard**: View your movie watching statistics and rating distribution

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- JWT Authentication
- TMDB API Integration
- Security: Helmet, Rate Limiting

### Frontend
- React 18 with TypeScript
- React Router v6 for navigation
- Tailwind CSS for styling
- Axios for API calls
- Vite for build tooling

## Security Features

- **JWT Authentication** with secure secret (no fallback keys)
- **Rate Limiting**: 10 requests/15min for auth, 100 requests/15min for general API
- **Security Headers**: Helmet middleware for XSS, clickjacking protection
- **Input Validation**: Email format, rating values, pagination limits
- **Database Transactions**: Atomic operations for data integrity
- **Optimized Indexes**: Fast queries on userId, movieId, rating

## Live Deployment

The application is deployed on:
- **Backend**: Railway (Node.js + PostgreSQL)
- **Frontend**: Railway (static site)

Visit: [movie-watchlist-production.up.railway.app](https://movie-watchlist-production.up.railway.app)

## Local Development (Optional)

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher) or use Railway's database
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/))

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET=your-64-char-hex-secret  # Generate: openssl rand -hex 64
TMDB_API_KEY=your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3
FRONTEND_URL=http://localhost:5173
```

Run database setup and start server:

```bash
npm run prisma:generate
npx prisma db push
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001
```

Start the frontend:

```bash
npm run dev
```

Access at http://localhost:5173

## Project Structure

```
movie-watchlist/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema with indexes
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts        # Prisma client
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.ts            # Auth with validation
│   │   │   ├── movies.ts          # Movie search with pagination
│   │   │   ├── userMovies.ts      # User ratings
│   │   │   ├── watchlist.ts       # Watchlist with transactions
│   │   │   └── recommendations.ts # Recommendations
│   │   ├── services/
│   │   │   ├── tmdb.ts            # TMDB API integration
│   │   │   ├── recommendation.ts  # Parallel recommendation fetching
│   │   │   └── userPreferences.ts # User preference analysis
│   │   ├── utils/
│   │   │   └── jwt.ts             # Secure JWT utilities
│   │   └── index.ts               # Server with security middleware
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Movies/            # MovieCard, UserMovieCard
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      # With error handling
│   │   │   ├── MyMovies.tsx       # With optimistic updates
│   │   │   ├── Watchlist.tsx      # With rollback on error
│   │   │   └── Recommendations.tsx
│   │   ├── services/
│   │   │   └── api.ts             # API client
│   │   └── App.tsx
│   └── package.json
├── docs/                          # Detailed documentation
├── CLAUDE.md                      # Developer guide
└── README.md
```

## Usage

### 1. Create an Account
Register at the app and login with your credentials.

### 2. Discover Movies
Go to "Recommendations" page, search for movies, and rate them.

### 3. Rating System
- **Dislike**: Didn't enjoy it
- **OK**: It was alright
- **Like**: Really enjoyed it
- **Love**: Absolutely loved it!

### 4. Get Recommendations
Rate at least 5-10 movies, then visit "Recommendations" to get personalized suggestions.

### 5. Manage Watchlist
Add movies to watch later. When you watch them, mark as watched with a rating.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register (with email validation)
- `POST /api/auth/login` - Login

### Movies
- `GET /api/movies/search?q=query&page=1` - Search (paginated 1-500)
- `GET /api/movies/popular` - Popular movies
- `GET /api/movies/:tmdbId` - Movie details

### User Movies
- `GET /api/user/movies` - Get rated movies
- `POST /api/user/movies` - Rate a movie
- `PUT /api/user/movies/:id` - Update rating
- `DELETE /api/user/movies/:id` - Remove

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add (with priority validation)
- `DELETE /api/watchlist/:id` - Remove
- `POST /api/watchlist/:id/watched` - Mark watched (atomic transaction)

### Recommendations
- `GET /api/recommendations` - Get recommendations (parallel fetching)
- `GET /api/recommendations/preferences` - User preferences

### Health Check
- `GET /health` - Server and database status

## Database Schema

### Users
- id, email (validated), username, passwordHash, createdAt

### Movies (TMDB Cache)
- id, tmdbId, title, overview, posterPath, genres, director, cast
- Indexed: tmdbId

### UserMovies
- id, userId, movieId, rating (DISLIKE/OK/LIKE/SUPER_LIKE), watched
- Indexed: userId, movieId, rating

### Watchlist
- id, userId, movieId, priority (LOW/MEDIUM/HIGH), addedAt
- Indexed: userId, movieId

## Recommendation Algorithm

Content-based filtering with parallel API fetching:

1. **Genre Matching (40%)**: Analyzes your favorite genres
2. **Popularity Score (30%)**: Considers TMDB ratings
3. **Vote Count (20%)**: Ensures quality recommendations
4. **Recency Bonus (10%)**: Preference for recent releases

## Recent Improvements

- Removed hardcoded JWT fallback (security)
- Added rate limiting (DoS protection)
- Added Helmet security headers
- Database indexes for performance
- Parallel TMDB API calls (faster recommendations)
- Atomic transactions for watchlist operations
- Input validation (email, ratings, pagination)
- Error handling with retry buttons
- Optimistic updates with rollback
- Accessibility improvements (aria-labels)

## Contributing

Pull requests are welcome! See [CLAUDE.md](CLAUDE.md) for development guidelines.

## License

MIT

## Support

For issues, please open a GitHub issue with error details.
