# Movie Watchlist - Developer Guide

> **Quick Start for Claude/AI Assistants**: This document provides comprehensive instructions for understanding, modifying, and extending the Movie Watchlist application.

> **Important**: After making code changes, always commit and push to apply them:
> ```bash
> git add <changed-files> && git commit -m "description" && git push
> ```

> **Deployment Note**: This project deploys to **Railway (backend)** and **Vercel (frontend)**. There is NO local database setup - schema changes are applied automatically on Railway deploy via `prisma db push` in the `npm start` script. Do NOT attempt to run Prisma commands locally.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture Documentation](#architecture-documentation)
4. [Development Workflow](#development-workflow)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)
7. [Contributing](#contributing)

---

## Project Overview

### What This Application Does

A full-stack web application for managing movie watchlists with personalized recommendations:

- **User Features:**
  - Create account and login (JWT authentication)
  - Search for movies (TMDB API integration)
  - Rate movies with 4-tier system (Dislike, OK, Like, Super Like)
  - Maintain a watchlist of movies to watch
  - Get AI-powered personalized movie recommendations
  - View statistics and rating distribution
  - Filter discover page by genre and style (Movies, Anime, Cartoons)
  - Toggle between list and grid view on My Movies page
  - View full movie details in modal (cast portraits, trailers, backdrop, tagline)

- **Technical Features:**
  - Multi-user support with data isolation
  - Content-based recommendation algorithm
  - Movie data caching (reduces API calls)
  - **Mobile-first responsive design** (works on phones, tablets, desktops)
  - Type-safe codebase (TypeScript throughout)
  - Rate limiting (100 req/15min general, 10 req/15min auth)
  - Security headers (Helmet.js)
  - Database transactions for atomic operations

### Technology Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication (no hardcoded fallback)
- TMDB API integration
- express-rate-limit (rate limiting)
- Helmet.js (security headers)

**Frontend:**
- React 18 + TypeScript
- React Router v6
- Tailwind CSS
- Axios for HTTP
- Vite build tool

### Project Structure

```
Watchlist/
├── backend/              # Node.js/Express backend
│   ├── prisma/          # Database schema and migrations
│   └── src/             # TypeScript source code
├── frontend/            # React frontend
│   └── src/             # TypeScript source code
├── docs/                # Comprehensive documentation
└── README.md            # Setup instructions
```

---

## Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+
- PostgreSQL 14+
- TMDB API key (free from themoviedb.org)

# Optional
- Docker (for containerized PostgreSQL)
- pgAdmin / TablePlus (database GUI)
```

### Installation (5 minutes)

**1. Database Setup:**
```bash
# Option A: Install PostgreSQL locally
brew install postgresql@14
brew services start postgresql@14
createdb movie_watchlist

# Option B: Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
docker exec -it postgres createdb -U postgres movie_watchlist
```

**2. Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL
# - JWT_SECRET (generate with: openssl rand -hex 64)
# - TMDB_API_KEY

# Run migrations
npm run prisma:generate
npm run prisma:migrate

# Start backend
npm run dev
```

**3. Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

**4. Access Application:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5001 (port 5000 often used by macOS)
- Health check: http://localhost:5001/health

**Note:** On macOS, port 5000 is used by Control Center. Use port 5001 instead.

---

## Architecture Documentation

### 📚 Complete Documentation

All documentation is in the [`docs/`](docs/) folder:

#### Core Architecture
- **[Backend Architecture](docs/backend-architecture.md)** - Complete backend structure, services, routes, middleware
- **[Frontend Architecture](docs/frontend-architecture.md)** - React components, routing, state management, styling
- **[Database Schema](docs/database-schema.md)** - Tables, relationships, constraints, indexes, queries

#### API & Algorithms
- **[API Documentation](docs/api-documentation.md)** - All endpoints, request/response formats, authentication
- **[Recommendation Algorithm](docs/recommendation-algorithm.md)** - How recommendations work, scoring, optimization

#### Deployment
- **[Deployment Guide](docs/deployment-guide.md)** - Production deployment on Railway, Vercel, Heroku, etc.

### Quick Reference

#### Database Schema (Overview)

```
Users
├─ id (uuid, primary key)
├─ email (unique)
├─ username (unique)
└─ passwordHash

Movies (TMDB cache)
├─ id (uuid, primary key)
├─ tmdbId (unique, integer)
├─ title, overview, posterPath, backdropPath
├─ genres (json), director, directorId
├─ cast (json with id, name, character, profilePath)
├─ runtime, tagline, keywords (json)
└─ lastUpdated (30-day cache)

UserMovies (ratings)
├─ id (uuid, primary key)
├─ userId → Users.id
├─ movieId → Movies.id
├─ rating (enum: DISLIKE, OK, LIKE, SUPER_LIKE)
└─ watched (boolean)

Watchlist
├─ id (uuid, primary key)
├─ userId → Users.id
├─ movieId → Movies.id
└─ priority (enum: LOW, MEDIUM, HIGH)
```

#### API Endpoints (Overview)

```
Auth:
  POST   /api/auth/register
  POST   /api/auth/login

Movies:
  GET    /api/movies/search?q=query
  GET    /api/movies/popular
  GET    /api/movies/:tmdbId

User Movies:
  GET    /api/user/movies?rating=LIKE&sort=date
  POST   /api/user/movies
  PUT    /api/user/movies/:id
  DELETE /api/user/movies/:id

Watchlist:
  GET    /api/watchlist
  POST   /api/watchlist
  DELETE /api/watchlist/:id
  POST   /api/watchlist/:id/watched

Recommendations:
  GET    /api/recommendations?limit=20
  GET    /api/recommendations/preferences

Discover:
  GET    /api/discover?category=popular&page=1&genre=28&style=anime
  GET    /api/discover?actor=123        # Filter by TMDB actor ID
  GET    /api/discover?director=456     # Filter by TMDB person ID (director)
  GET    /api/discover?company=789      # Filter by TMDB company ID (studio)
```

#### Frontend Routes (Overview)

```
Public:
  /login       → Login page
  /register    → Registration page

Protected (requires auth):
  /            → Dashboard (statistics)
  /movies      → My Movies (rated movies list/grid with detail modal)
  /watchlist   → Watchlist (movies to watch with detail modal)
  /discovery   → Discovery page (grid/swipe view, genre/style filters)
```

---

## Development Workflow

> **IMPORTANT FOR AI ASSISTANTS**: This project has NO local database. The developer uses Railway (backend) and Vercel (frontend) for all deployments. Never run `prisma db push`, `prisma migrate`, or any database commands locally - they will fail due to missing DATABASE_URL. Schema changes are applied automatically on Railway deploy.

### Running in Development

**Start Everything:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database UI (optional)
cd backend
npm run prisma:studio
```

### Making Changes

#### Adding a New API Endpoint

1. **Create route handler** in `backend/src/routes/`
2. **Register route** in `backend/src/index.ts`
3. **Add TypeScript types** in `frontend/src/services/api.ts`
4. **Create API function** in `frontend/src/services/api.ts`
5. **Use in component** via React hooks

**Example:**
```typescript
// backend/src/routes/favorites.ts
router.get('/favorites', authenticate, async (req, res) => {
  const favorites = await prisma.userMovie.findMany({
    where: { userId: req.user!.userId, rating: 'SUPER_LIKE' }
  });
  res.json(favorites);
});

// frontend/src/services/api.ts
export const favoritesAPI = {
  getAll: () => api.get<UserMovie[]>('/api/favorites')
};
```

#### Modifying Database Schema

> **IMPORTANT**: This project uses `prisma db push` instead of migrations. Schema changes are automatically applied when the server starts on Railway (via the `npm start` script). Do NOT create migration files manually.

1. **Edit** `backend/prisma/schema.prisma`
2. **Commit and push** - Schema syncs automatically on deploy via `prisma db push`
3. **Update frontend types** in `frontend/src/services/api.ts`

**How it works:**
- The `npm start` script runs `npx prisma db push && node dist/index.js`
- `prisma db push` automatically syncs the schema to the database
- No migration files needed - changes apply on Railway deploy

**Example:**
```prisma
model Favorite {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  movieId   String   @map("movie_id")
  createdAt DateTime @default(now()) @map("created_at")

  user  User  @relation(fields: [userId], references: [id])
  movie Movie @relation(fields: [movieId], references: [id])

  @@unique([userId, movieId])
  @@map("favorites")
}
```

#### Adding a New React Page

1. **Create page component** in `frontend/src/pages/`
2. **Add route** in `frontend/src/App.tsx`
3. **Add navigation link** in `frontend/src/components/Layout.tsx`

**Example:**
```typescript
// frontend/src/pages/Favorites.tsx
export const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState([]);
  // ... component logic
};

// frontend/src/App.tsx
<Route path="favorites" element={<Favorites />} />

// frontend/src/components/Layout.tsx
<Link to="/favorites">Favorites</Link>
```

### Testing Changes

```bash
# Backend (when tests are implemented)
cd backend
npm test

# Frontend (when tests are implemented)
cd frontend
npm test

# Manual testing checklist:
- [ ] Can register new user
- [ ] Can login
- [ ] Can search movies
- [ ] Can rate movies
- [ ] Can add to watchlist
- [ ] Recommendations work
- [ ] All pages load without errors
```

---

## Common Tasks

### Task 1: Add a New Movie Property

**Scenario:** Add "watched date" to user movies

**Steps:**

1. **Update Prisma schema:**
```prisma
model UserMovie {
  // ... existing fields
  watchedDate DateTime? @map("watched_date")
}
```

2. **Commit and push** - Schema syncs automatically on Railway deploy via `prisma db push`

3. **Update API route:**
```typescript
// backend/src/routes/userMovies.ts
const { tmdbId, rating, watchedDate } = req.body;
// ... use watchedDate in create/update
```

4. **Update frontend types:**
```typescript
// frontend/src/services/api.ts
export interface UserMovie {
  // ... existing fields
  watchedDate?: string;
}
```

5. **Update UI component:**
```typescript
// frontend/src/components/Movies/UserMovieCard.tsx
<p>Watched: {new Date(userMovie.watchedDate).toLocaleDateString()}</p>
```

### Task 2: Modify Recommendation Algorithm

**Scenario:** Increase genre matching weight from 40% to 50%

**File to edit:** `backend/src/services/recommendation.ts`

**Change:**
```typescript
// Find this line:
const genreScore = (matchingGenres.length / preferredGenreIds.length) * 40;

// Change to:
const genreScore = (matchingGenres.length / preferredGenreIds.length) * 50;

// Also update popularity score to maintain 100% total:
const popularityScore = (movie.vote_average / 10) * 25;  // was 30
```

**Test:**
- Rate several movies
- Check recommendations
- Verify genre matching is more emphasized

### Task 3: Add a New Rating Type

**Scenario:** Add "Haven't Seen" rating

**Steps:**

1. **Update Prisma enum:**
```prisma
enum Rating {
  DISLIKE
  OK
  LIKE
  SUPER_LIKE
  NOT_WATCHED  // Add this
}
```

2. **Commit and push** - Schema syncs automatically on Railway deploy via `prisma db push`

3. **Update frontend types:**
```typescript
export type Rating = 'DISLIKE' | 'OK' | 'LIKE' | 'SUPER_LIKE' | 'NOT_WATCHED';
```

4. **Add UI button:**
```typescript
// frontend/src/components/Movies/MovieCard.tsx
const ratingButtons = [
  // ... existing buttons
  { rating: 'NOT_WATCHED', emoji: '❓', label: 'Haven\'t Seen', color: 'bg-gray-600' }
];
```

5. **Update recommendation algorithm** to handle new rating type

### Task 4: Add Movie Filtering

**Scenario:** Filter movies by genre in My Movies page

**Steps:**

1. **Add genre filter state:**
```typescript
// frontend/src/pages/MyMovies.tsx
const [filterGenre, setFilterGenre] = useState<number | null>(null);
```

2. **Add filter logic:**
```typescript
const applyFilters = () => {
  let filtered = [...movies];

  if (filterGenre) {
    filtered = filtered.filter(m =>
      m.movie.genres?.some(g => g.id === filterGenre)
    );
  }

  setFilteredMovies(filtered);
};
```

3. **Add UI dropdown:**
```typescript
<select onChange={(e) => setFilterGenre(Number(e.target.value))}>
  <option value="">All Genres</option>
  <option value="28">Action</option>
  <option value="35">Comedy</option>
  // ... more genres
</select>
```

### Task 5: Add Social Features

**Scenario:** Allow users to share their watchlist

**High-level steps:**

1. **Add Friends table** to database schema
2. **Create friend management endpoints**
3. **Add sharing permissions** to Watchlist model
4. **Create shared watchlist view**
5. **Add social components** to frontend
6. **Implement notifications**

See [backend-architecture.md](docs/backend-architecture.md#future-enhancements) for more details on potential social features.

---

## Troubleshooting

### Backend Issues

**Problem:** `Prisma Client not generated`
```bash
cd backend
npm run prisma:generate
```

**Problem:** `Database connection failed`
- Check PostgreSQL is running: `pg_ctl status`
- Verify DATABASE_URL in `.env`
- Test connection: `psql $DATABASE_URL`

**Problem:** `TMDB API errors`
- Verify API key is correct
- Check rate limits (1000/day free tier)
- Test key: `curl "https://api.themoviedb.org/3/movie/550?api_key=YOUR_KEY"`

**Problem:** `Port 5000 already in use`

On macOS, port 5000 is used by Control Center (AirPlay Receiver). Use port 5001 instead:
```bash
# Change port in .env
PORT=5001

# Or disable AirPlay Receiver in System Settings → General → AirDrop & Handoff
```

### Frontend Issues

**Problem:** `CORS errors in browser console`
- Ensure backend is running
- Check `FRONTEND_URL` in backend `.env` matches frontend URL
- Restart backend after changing `.env`

**Problem:** `401 Unauthorized on all API calls`
- Token expired (7 days) - logout and login again
- Check Authorization header in Network tab
- Clear localStorage: `localStorage.clear()`

**Problem:** `Vite build fails`
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

**Problem:** `Images not loading`
- TMDB poster URLs need full path: `https://image.tmdb.org/t/p/w500${posterPath}`
- Use fallback for missing images (already implemented)

### Database Issues

**Problem:** `Schema sync failed on deploy`
```bash
# This project uses prisma db push (not migrations)
# If schema sync fails, check Railway logs for errors
# Common causes: invalid schema syntax, constraint violations

# To reset database locally (WARNING: deletes all data):
cd backend
npx prisma db push --force-reset
```

**Problem:** `Database too large`
- Check movie cache size
- Clean old cached movies:
  ```sql
  DELETE FROM movies WHERE last_updated < NOW() - INTERVAL '90 days';
  ```

### Common Errors

**Error:** `Cannot find module '@prisma/client'`
```bash
cd backend
npm run prisma:generate
```

**Error:** `Failed to fetch recommendations`
- Need at least 1-2 rated movies
- Check backend logs for TMDB API errors
- Verify user has rated movies with LIKE/SUPER_LIKE

**Error:** `Duplicate key value violates unique constraint`
- Trying to rate same movie twice (expected behavior)
- Use upsert instead of create (already implemented)

---

## Code Patterns and Conventions

### Backend Patterns

**Route Structure:**
```typescript
router.method('/path', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Extract parameters
    const { userId } = req.user!;
    const { id } = req.params;

    // 2. Validate input
    if (!id) {
      return res.status(400).json({ error: 'ID required' });
    }

    // 3. Database operation
    const result = await prisma.model.operation();

    // 4. Return response
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});
```

**Database Queries:**
```typescript
// Always filter by userId for security
const movies = await prisma.userMovie.findMany({
  where: { userId: req.user!.userId },
  include: { movie: true },
  orderBy: { createdAt: 'desc' }
});

// Use upsert to prevent duplicates
const movie = await prisma.movie.upsert({
  where: { tmdbId },
  update: { ...updateData },
  create: { ...createData }
});
```

### Frontend Patterns

**Component Structure:**
```typescript
interface Props {
  // Define props
}

export const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // 1. State
  const [data, setData] = useState<Type>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 2. Effects
  useEffect(() => {
    loadData();
  }, []);

  // 3. Handlers
  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get();
      setData(response.data);
    } catch (error) {
      console.error(error);
      alert('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Render
  if (isLoading) return <Loading />;

  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

**API Calls:**
```typescript
// Always use try-catch
try {
  await api.operation();
  // Update UI optimistically
} catch (error) {
  console.error(error);
  alert('Operation failed');
  // Revert optimistic update
}
```

### TypeScript Best Practices

**Use interfaces for data:**
```typescript
interface User {
  id: string;
  email: string;
  username: string;
}
```

**Use enums for constants:**
```typescript
enum Rating {
  DISLIKE = 'DISLIKE',
  OK = 'OK',
  LIKE = 'LIKE',
  SUPER_LIKE = 'SUPER_LIKE'
}
```

**Type API responses:**
```typescript
const response = await api.get<UserMovie[]>('/api/user/movies');
const movies: UserMovie[] = response.data;
```

---

## Environment Variables Reference

### Backend (.env)

```bash
# Server
PORT=5001                    # Backend port (5000 often used by macOS)
NODE_ENV=development         # Environment (development/production)

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/movie_watchlist?schema=public"

# Authentication (REQUIRED - no fallback)
JWT_SECRET="<64-char-hex>"   # Generate: openssl rand -hex 64

# TMDB API
TMDB_API_KEY="<your-key>"    # Get from themoviedb.org
TMDB_BASE_URL="https://api.themoviedb.org/3"

# CORS
FRONTEND_URL="http://localhost:5173"  # Frontend URL for CORS
```

**Important:** `JWT_SECRET` is required. The application will fail to start if not set (no hardcoded fallback for security).

### Frontend (.env)

```bash
# API
VITE_API_URL="http://localhost:5001"  # Backend URL
```

---

## Contributing

### Before Making Changes

1. Read relevant documentation in `docs/`
2. Check existing code patterns
3. Ensure TypeScript types are correct
4. Test locally before committing

### Commit Message Format

```
type(scope): description

- Detailed change 1
- Detailed change 2
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(recommendations): increase genre matching weight to 50%

fix(auth): handle token expiration gracefully

docs(api): add examples for watchlist endpoints
```

### Pull Request Checklist

- [ ] Code follows existing patterns
- [ ] TypeScript types are correct
- [ ] No console errors in browser
- [ ] Backend starts without errors
- [ ] Schema changes in prisma/schema.prisma (auto-syncs on deploy)
- [ ] Documentation updated (if needed)
- [ ] Tested core user flows

---

## Additional Resources

### Documentation Files

- [README.md](README.md) - Setup instructions
- [docs/backend-architecture.md](docs/backend-architecture.md) - Backend deep dive
- [docs/frontend-architecture.md](docs/frontend-architecture.md) - Frontend deep dive
- [docs/database-schema.md](docs/database-schema.md) - Database structure
- [docs/api-documentation.md](docs/api-documentation.md) - API reference
- [docs/recommendation-algorithm.md](docs/recommendation-algorithm.md) - Algorithm details
- [docs/deployment-guide.md](docs/deployment-guide.md) - Production deployment

### External Documentation

- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Express](https://expressjs.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TMDB API](https://developers.themoviedb.org/3)

### Tools

- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Postman](https://www.postman.com) - API testing
- [React DevTools](https://react.dev/learn/react-developer-tools) - React debugging

---

## Quick Command Reference

```bash
# Backend
cd backend
npm install              # Install dependencies
npm run dev             # Start development server
npm run build           # Build for production
npm start               # Run production build
npm run prisma:generate # Generate Prisma Client
npm run prisma:studio   # Open database GUI
# Note: Schema syncs via `prisma db push` on deploy (no manual migrations)

# Frontend
cd frontend
npm install             # Install dependencies
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build

# Database
createdb movie_watchlist              # Create database
psql movie_watchlist                  # Access database CLI
pg_dump movie_watchlist > backup.sql  # Backup database
psql movie_watchlist < backup.sql     # Restore database
```

---

## Support

For questions or issues:
1. Check documentation in `docs/`
2. Search existing GitHub issues
3. Create new issue with details
4. Include error messages and logs

---

**Last Updated:** 2026-02-14

**Version:** 1.4.0

**Maintainers:** See [README.md](README.md)

---

## Implemented Security & Performance Features

The following features are already implemented in the codebase:

### Backend Security
- **Rate Limiting:** 100 requests/15min (general), 10 requests/15min (auth)
- **Security Headers:** Helmet.js middleware enabled
- **JWT Security:** No hardcoded fallback - fails fast if `JWT_SECRET` not set
- **Input Validation:** Email format, rating enum, priority enum, pagination limits
- **Database Transactions:** Atomic operations for watchlist → rated movies

### Frontend UX
- **Error States:** Retry buttons on API failures
- **Optimistic Updates:** With automatic rollback on error
- **Accessibility:** aria-labels on icon buttons, aria-hidden on decorative emojis
- **React Router Links:** No full page reloads

### Performance
- **Parallel API Fetching:** Recommendations use `Promise.all()` for 3-5x faster load
- **Database Indexes:** Custom indexes on userId, movieId, rating for fast queries
- **Movie Caching:** 30-day cache reduces TMDB API calls

### UI Features
- **Genre & Style Filtering:** Filter discover page by any TMDB genre and style (Movies, Anime, Cartoons) - grid view only
- **Genre Filtering in Swipe Mode:** Swipe view shows genre filter only (no style filter) for cleaner UI
- **View Mode Toggle:** My Movies supports both list and grid views (persisted to localStorage)
- **Movie Detail Modal:** Enhanced modal with backdrop header image, cast portraits with photos, embedded YouTube trailers, movie tagline, and clickable metadata (genres, actors, directors, studios)
- **Swipe Discovery:** Tinder-like card swiping with full-height poster cards, gradient overlay for text, and animated transitions for all actions (drag, buttons, keyboard)
- **Already Rated Indicator:** Discovery page cards show "In My Movies" badge and highlighted rating button for movies already in user's collection
- **Clickable Metadata:** Genres, actors, directors, and studios are clickable links throughout the app. Clicking navigates to the Discover page filtered by that item:
  - **In Movie Detail Modal:** Click genre badges, director name, actor names, or studio names
  - **In My Movies:** Click genre badges on movie cards
  - **In Dashboard:** Click preference badges (favorite genres, actors, directors, studios)
  - **URL-based Filters:** Filter state is stored in URL query params for shareable/bookmarkable links (e.g., `/discovery?actor=123&genre=28`)

### Mobile-Responsive Design
- **Hamburger Navigation:** Collapsible menu on mobile devices (< 768px)
- **Touch-Friendly Buttons:** All interactive elements minimum 44x44px for accessibility
- **Responsive Layouts:** Content stacks vertically on mobile, no horizontal scrolling
- **Bottom Sheet Modal:** Movie detail modal slides up from bottom on mobile
- **Adaptive Swipe Cards:** Viewport-based height (65-70vh) instead of fixed pixels
- **Mobile-Optimized Forms:** Full-width inputs and buttons on small screens
- **Hidden Scrollbars:** Clean horizontal scrolling for category tabs
- **Safe Area Support:** CSS utilities for notched devices (iPhone X+)

**Key responsive breakpoints:**
- Mobile: < 640px (default styles)
- Small: >= 640px (`sm:` prefix)
- Medium: >= 768px (`md:` prefix)
- Large: >= 1024px (`lg:` prefix)
- XL: >= 1280px (`xl:` prefix)
