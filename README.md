# Movie Watchlist & Recommendation System

A full-stack web application for managing your movie watchlist with personalized recommendations based on your preferences.

## Features

- **User Authentication**: Secure registration and login with JWT
- **Movie Search**: Search movies using TMDB API
- **Personal Movie List**: Rate movies with 4-tier system (Dislike, OK, Like, Super Like)
- **Watchlist**: Add movies to watch later
- **Personalized Recommendations**: AI-powered movie suggestions based on your ratings
- **Statistics Dashboard**: View your movie watching statistics

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- JWT Authentication
- TMDB API Integration

### Frontend
- React with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Vite for build tooling

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- TMDB API key (free account at [themoviedb.org](https://www.themoviedb.org/))

## Getting Started

### 1. Clone the Repository

```bash
cd /Users/arturdzivia/Projects/Watchlist
```

### 2. Get TMDB API Key

1. Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings > API
4. Request an API key (choose "Developer" option)
5. Copy your API key

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```bash
# Using psql
psql -U postgres
CREATE DATABASE movie_watchlist;
\q
```

Or use a GUI tool like pgAdmin, Postico, or TablePlus.

### 4. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
PORT=5000
NODE_ENV=development

# Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/movie_watchlist?schema=public"

# Generate a secure random string for JWT_SECRET
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Add your TMDB API key
TMDB_API_KEY=your-tmdb-api-key-here
TMDB_BASE_URL=https://api.themoviedb.org/3

FRONTEND_URL=http://localhost:5173
```

**Generate Prisma Client and run migrations:**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view your database
npm run prisma:studio
```

**Start the backend server:**

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

The backend will run on `http://localhost:5000`

### 5. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## Project Structure

```
movie-watchlist/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts        # Prisma client
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts            # Authentication routes
│   │   │   ├── movies.ts          # Movie search routes
│   │   │   ├── userMovies.ts      # User's rated movies
│   │   │   ├── watchlist.ts       # Watchlist management
│   │   │   └── recommendations.ts # Recommendation engine
│   │   ├── services/
│   │   │   ├── tmdb.ts            # TMDB API integration
│   │   │   ├── recommendation.ts  # Recommendation algorithm
│   │   │   └── userPreferences.ts # User preference analysis
│   │   ├── utils/
│   │   │   └── jwt.ts             # JWT utilities
│   │   └── index.ts               # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Movies/
│   │   │   │   ├── MovieCard.tsx
│   │   │   │   └── UserMovieCard.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Authentication state
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MyMovies.tsx
│   │   │   ├── Watchlist.tsx
│   │   │   └── Recommendations.tsx
│   │   ├── services/
│   │   │   └── api.ts             # API client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Usage

### 1. Create an Account

1. Navigate to `http://localhost:5173`
2. Click "Sign up" and create an account
3. Login with your credentials

### 2. Discover Movies

1. Go to "Recommendations" page
2. Use the search bar to find movies
3. Rate movies or add them to your watchlist

### 3. Rate Movies

Click one of the rating buttons:
- 👎 **Dislike**: Didn't enjoy it
- 😐 **OK**: It was alright
- 👍 **Like**: Really enjoyed it
- ❤️ **Love**: Absolutely loved it!

### 4. Get Recommendations

1. Rate at least 5-10 movies
2. Visit the "Recommendations" tab
3. Get personalized movie suggestions based on your preferences

### 5. Manage Watchlist

1. Add movies you want to watch to your watchlist
2. When you watch them, mark as watched with a rating
3. They'll automatically move to your rated movies

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Movies
- `GET /api/movies/search?q=query` - Search movies
- `GET /api/movies/popular` - Get popular movies
- `GET /api/movies/:tmdbId` - Get movie details

### User Movies
- `GET /api/user/movies` - Get user's rated movies
- `POST /api/user/movies` - Add/rate a movie
- `PUT /api/user/movies/:id` - Update movie rating
- `DELETE /api/user/movies/:id` - Remove movie

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist
- `POST /api/watchlist/:id/watched` - Mark as watched

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations
- `GET /api/recommendations/preferences` - Get user preferences

## Database Schema

### Users
- id, email, username, passwordHash, createdAt, updatedAt

### Movies
- id, tmdbId, title, overview, posterPath, releaseDate, genres, director, cast, runtime

### UserMovies
- id, userId, movieId, rating (DISLIKE/OK/LIKE/SUPER_LIKE), watched

### Watchlist
- id, userId, movieId, addedAt, priority (LOW/MEDIUM/HIGH)

## Recommendation Algorithm

The system uses content-based filtering:

1. **Genre Matching (40%)**: Analyzes your favorite genres
2. **Popularity Score (30%)**: Considers TMDB ratings
3. **Vote Count (20%)**: Ensures quality recommendations
4. **Recency Bonus (10%)**: Gives slight preference to recent releases

The algorithm:
- Extracts genres, directors, and cast from liked movies
- Finds similar movies from TMDB
- Scores candidates based on multiple factors
- Filters out already-rated movies
- Returns top-scored recommendations

## Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify DATABASE_URL in .env is correct
```

**TMDB API errors:**
- Verify your API key is correct
- Check you haven't exceeded the free tier limit (1000 requests/day)

**Prisma errors:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run prisma:generate
```

### Frontend Issues

**API connection error:**
- Ensure backend is running on port 5000
- Check CORS settings in backend

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development

### Running Tests

```bash
# Backend tests (to be implemented)
cd backend
npm test

# Frontend tests (to be implemented)
cd frontend
npm test
```

### Code Formatting

```bash
# Format backend code
cd backend
npm run format

# Format frontend code
cd frontend
npm run format
```

## Deployment

### Backend (Heroku/Railway/Render)

1. Set environment variables
2. Provision PostgreSQL database
3. Run migrations: `npm run prisma:migrate`
4. Deploy with `npm start`

### Frontend (Vercel/Netlify)

1. Build: `npm run build`
2. Deploy `dist` folder
3. Set API URL environment variable

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## Support

For issues or questions, please open a GitHub issue.
