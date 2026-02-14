# Frontend Architecture

## Overview

The frontend is a modern React application built with TypeScript and Tailwind CSS, featuring a component-based architecture with React Router for navigation and Context API for state management.

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API

## Project Structure

```
frontend/
├── public/                         # Static assets
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.tsx          # Login form
│   │   │   └── Register.tsx       # Registration form
│   │   ├── Discover/
│   │   │   ├── SwipeCardStack.tsx # Card stack with drag/swipe animations
│   │   │   ├── SwipeCard.tsx      # Full-height poster card with gradient overlay
│   │   │   ├── SwipeControls.tsx  # Undo/Watched/Skip buttons
│   │   │   ├── FilterBar.tsx      # Genre & style filters (style hideable)
│   │   │   ├── RatingModal.tsx    # Rate already-watched movies
│   │   │   └── CardDetails.tsx    # Back of flipped card
│   │   ├── Movies/
│   │   │   ├── MovieCard.tsx      # Movie display card (search results)
│   │   │   ├── UserMovieCard.tsx  # User's rated movie card
│   │   │   └── MovieDetailModal.tsx # Enhanced movie detail modal with trailers
│   │   ├── Layout.tsx             # Main app layout with nav
│   │   └── ProtectedRoute.tsx     # Auth route wrapper
│   ├── context/
│   │   └── AuthContext.tsx        # Authentication state management
│   ├── pages/
│   │   ├── Dashboard.tsx          # Main dashboard with stats
│   │   ├── MyMovies.tsx           # User's rated movies list
│   │   ├── Watchlist.tsx          # Watchlist management
│   │   └── Recommendations.tsx    # Movie discovery & search
│   ├── services/
│   │   └── api.ts                 # API client and type definitions
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles + Tailwind
├── index.html                      # HTML template
├── package.json
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS configuration
└── vite.config.ts                  # Vite configuration
```

## Core Components

### 1. Entry Point (`src/main.tsx`)

- Renders root React component
- Wraps app in StrictMode
- Mounts to DOM element `#root`

### 2. Root Component (`src/App.tsx`)

**Responsibilities:**
- Sets up routing structure
- Wraps app in AuthProvider
- Defines all application routes
- Handles route protection

**Route Structure:**
```typescript
/login          → Login page (public)
/register       → Register page (public)
/               → Protected routes (Layout wrapper)
  ├── /         → Dashboard
  ├── /movies   → My Movies
  ├── /watchlist → Watchlist
  └── /recommendations → Recommendations
```

### 3. Layout Component (`src/components/Layout.tsx`)

**Features:**
- Top navigation bar (desktop)
- **Hamburger menu** (mobile < 768px)
- Mobile dropdown navigation with slide-down animation
- User info display (hidden on mobile, shows logout icon)
- Active route highlighting
- Logout button (icon on mobile, text on desktop)
- **Fully responsive design**
- Auto-close mobile menu on route change

**Navigation Links:**
- Dashboard
- My Movies
- Watchlist
- Recommendations

### 4. Authentication Components

#### Login (`src/components/Auth/Login.tsx`)

**Features:**
- Email and password inputs
- Form validation
- Error message display
- Loading state during login
- Link to registration page

**Flow:**
1. User enters credentials
2. Form submits to API
3. On success: Store token, redirect to dashboard
4. On error: Display error message

#### Register (`src/components/Auth/Register.tsx`)

**Features:**
- Email, username, password inputs
- Password confirmation
- Client-side validation
- Error message display
- Loading state during registration
- Link to login page

**Validation:**
- Password minimum 6 characters
- Password confirmation match
- All fields required

### 5. Movie Components

#### MovieCard (`src/components/Movies/MovieCard.tsx`)

**Purpose:** Display movie from search/recommendations

**Features:**
- Movie poster with fallback
- Title and release year
- Rating badge (TMDB score)
- Overview text (truncated)
- Quick rating buttons (Dislike, OK, Like, Love)
- Add to Watchlist button
- Responsive layout
- **"In My Movies" badge** when movie is already rated
- **Highlighted rating button** showing current rating

**Props:**
```typescript
{
  movie: TMDBMovie;
  userRating?: Rating | null;  // Shows rating status if already rated
  onRate?: (tmdbId, rating) => void;
  onAddToWatchlist?: (tmdbId) => void;
  onNotInterested?: (tmdbId) => void;
  onClick?: (movie) => void;
  showActions?: boolean;
}
```

#### UserMovieCard (`src/components/Movies/UserMovieCard.tsx`)

**Purpose:** Display user's rated movie

**Features:**
- Horizontal layout with poster
- Current rating badge
- Genre chips
- Rating dropdown (change rating)
- Remove button
- Movie overview

**Props:**
```typescript
{
  userMovie: UserMovie;
  onUpdateRating?: (id, rating) => void;
  onDelete?: (id) => void;
}
```

#### MovieDetailModal (`src/components/Movies/MovieDetailModal.tsx`)

**Purpose:** Display full movie details in an enhanced modal dialog

**Features:**
- Backdrop header image with gradient fade
- Cast portraits section with circular actor photos (horizontal scroll)
- Embedded YouTube trailer with thumbnail preview and play button
- Movie tagline display
- Clickable metadata (genres, actors, directors, studios)
- Rating buttons and watchlist management
- Bottom sheet on mobile, centered modal on desktop
- Larger modal size (max-w-4xl / 1024px)

**Props:**
```typescript
{
  movie: TMDBMovie | Movie;
  tmdbId?: number;
  userRating?: Rating | null;
  isInWatchlist?: boolean;
  onClose: () => void;
  onRate?: (rating: Rating) => void;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  onUpdateRating?: (rating: Rating) => void;
  onDelete?: () => void;
  isProcessing?: boolean;
}
```

**Data Fetched:**
- Full movie details from `/api/movies/:tmdbId`
- Includes cast with profile photos, trailer info, backdrop, tagline

### 6. Protected Route

**Component:** `ProtectedRoute.tsx`

**Features:**
- Checks authentication status
- Shows loading state while checking
- Redirects to login if not authenticated
- Renders children if authenticated

**Usage:**
```typescript
<ProtectedRoute>
  <Layout />
</ProtectedRoute>
```

## Pages

### 1. Dashboard (`src/pages/Dashboard.tsx`)

**Features:**
- Total movies count card
- Watchlist count card
- Recommendations link card
- Rating distribution chart
- Visual statistics with progress bars
- Empty state with call-to-action

**Statistics Displayed:**
- Total movies watched
- Count by rating (Super Like, Like, OK, Dislike)
- Visual bar charts with percentages
- Color-coded by rating type

### 2. My Movies (`src/pages/MyMovies.tsx`)

**Features:**
- List of all rated movies
- Filter by rating dropdown
- Sort options (date, title, rating)
- Update rating inline
- Remove movie functionality
- Empty state with CTA
- Movie count display

**Filters:**
- All Ratings
- ❤️ Love
- 👍 Like
- 😐 OK
- 👎 Dislike

**Sort Options:**
- Date Added (default)
- Title (alphabetical)
- Rating (high to low)

### 3. Watchlist (`src/pages/Watchlist.tsx`)

**Features:**
- List of unwatched movies
- Priority indicators (HIGH, MEDIUM, LOW)
- Quick "Mark as Watched" buttons with rating
- Remove from watchlist
- Empty state with CTA
- Movie count display

**Quick Actions:**
- 👎 Mark as watched (Dislike)
- 😐 Mark as watched (OK)
- 👍 Mark as watched (Like)
- ❤️ Mark as watched (Love)
- Remove button

**Flow:**
When marked as watched:
1. Creates rated movie entry
2. Removes from watchlist
3. Updates UI immediately

### 4. Recommendations (`src/pages/Recommendations.tsx`)

**Features:**
- Two tabs: Recommended / Search Results
- Search bar for finding movies
- Personalized recommendations feed
- Recommendation reasons displayed
- Quick rating buttons
- Add to Watchlist button
- Empty state handling

**Tabs:**
1. **Recommended for You**:
   - AI-generated suggestions
   - Shows reasons (genre match, highly rated, etc.)
   - Updates when movies rated

2. **Search Results**:
   - TMDB search results
   - Same action buttons
   - Switches to this tab on search

**Empty States:**
- No recommendations: Prompts to rate movies first
- No search results: Suggests different search

## State Management

### Authentication Context (`src/context/AuthContext.tsx`)

**Purpose:** Global authentication state

**State:**
```typescript
{
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Methods:**
```typescript
login(email, password): Promise<void>
register(email, username, password): Promise<void>
logout(): void
```

**Features:**
- Persists auth to localStorage
- Automatically loads on mount
- Provides loading state
- Handles token expiration

**Usage:**
```typescript
const { user, login, logout, isAuthenticated } = useAuth();
```

### Component-Level State

Each page manages its own data state:
- Local loading states
- Data from API
- Filter/sort selections
- Form inputs

## API Service (`src/services/api.ts`)

### Axios Instance Configuration

**Base Setup:**
- Base URL: `http://localhost:5000` (dev) or env variable
- Content-Type: application/json

**Request Interceptor:**
- Automatically adds JWT token to Authorization header
- Token read from localStorage

**Response Interceptor:**
- Detects 401 (Unauthorized)
- Clears auth state
- Redirects to login

### API Modules

#### Auth API
```typescript
authAPI.register(email, username, password)
authAPI.login(email, password)
```

#### Movies API
```typescript
moviesAPI.search(query, page)
moviesAPI.getDetails(tmdbId)
moviesAPI.getPopular(page)
```

#### User Movies API
```typescript
userMoviesAPI.getAll(rating?, sort?)
userMoviesAPI.add(tmdbId, rating, watched)
userMoviesAPI.update(id, rating?, watched?)
userMoviesAPI.delete(id)
```

#### Watchlist API
```typescript
watchlistAPI.getAll()
watchlistAPI.add(tmdbId, priority)
watchlistAPI.remove(id)
watchlistAPI.markWatched(id, rating)
```

#### Recommendations API
```typescript
recommendationsAPI.get(limit)
recommendationsAPI.getPreferences()
```

### Type Definitions

All API types are defined in `api.ts`:
- `User`
- `Movie`
- `UserMovie`
- `WatchlistItem`
- `TMDBMovie`
- `Recommendation`
- `Rating` enum

## Styling System

### Tailwind CSS

**Configuration:**
- Default theme with dark color scheme
- Custom utilities as needed
- Responsive breakpoints

**Color Palette:**
- Background: slate-900 (dark)
- Cards: slate-800
- Borders: slate-700
- Text: white/slate-300/slate-400
- Primary: blue-600
- Success: green-600
- Warning: yellow-600
- Danger: red-600

### Global Styles (`src/index.css`)

- Tailwind directives
- Body background (dark theme)
- Font family (system fonts)
- Box-sizing reset
- **`.scrollbar-hide`** - Hides scrollbar for horizontal tab navigation
- **`.safe-bottom`/`.safe-top`** - Safe area insets for notched devices (iPhone X+)
- **`.touch-pan-x`/`.touch-pan-y`** - Touch action utilities for swipe gestures
- **`.scroll-smooth`** - iOS smooth scrolling

### Component Styling Patterns

**Cards:**
```css
bg-slate-800 rounded-lg p-6 border border-slate-700
```

**Buttons (Primary):**
```css
bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded
```

**Input Fields:**
```css
bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600
focus:outline-none focus:ring-2 focus:ring-blue-500
```

## Routing

### React Router v6 Features

**Layout Routes:**
```typescript
<Route element={<Layout />}>
  <Route index element={<Dashboard />} />
  <Route path="movies" element={<MyMovies />} />
</Route>
```

**Protected Routes:**
Wrapped with `ProtectedRoute` component

**Redirects:**
```typescript
<Route path="*" element={<Navigate to="/" replace />} />
```

**Navigation:**
```typescript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/dashboard');
```

## User Experience Features

### Loading States
- Skeleton screens
- Loading spinners
- Disabled buttons during operations
- Loading text feedback

### Error Handling
- Try-catch in async operations
- **Error state with retry button** on all pages
- Inline error messages that auto-dismiss
- User-friendly error messages
- Error rollback for optimistic updates

### Empty States
- Custom messages for empty data
- Call-to-action buttons
- Helpful guidance for next steps
- Friendly icons/emojis

### Responsive Design
- **Mobile-first approach** with Tailwind breakpoints
- Grid layouts adapt to screen size (1 col → 2 col → 3 col → 4 col)
- **Hamburger menu** for mobile navigation (< 768px)
- **Touch-friendly buttons** (minimum 44x44px on mobile)
- **Bottom sheet modal** on mobile (slides up from bottom)
- **Viewport-based heights** for swipe cards (65-70vh)
- Stacked layouts on mobile, horizontal on desktop
- Hidden scrollbars for horizontal tab navigation

### Optimistic Updates
- Immediate UI updates
- **Automatic rollback on error** - previous state restored
- Better perceived performance
- Error notifications shown to user

### Accessibility
- **aria-labels** on all icon buttons
- **aria-hidden** on decorative emojis
- Screen reader labels for form controls
- Semantic HTML structure

## Performance Optimizations

### Code Splitting
- Route-based splitting (automatic with Vite)
- Lazy loading components (can be added)

### Image Optimization
- Fallback for missing posters
- SVG placeholders
- Lazy loading (can be added)

### Memoization Opportunities
- `useMemo` for expensive calculations
- `useCallback` for stable function references
- `React.memo` for pure components

### Bundle Optimization (Vite)
- Tree shaking
- Minification
- CSS optimization
- Asset optimization

## Build and Development

### Development Server
```bash
npm run dev
```
- Hot Module Replacement (HMR)
- Fast refresh
- Source maps
- Port: 5173

### Production Build
```bash
npm run build
```
- TypeScript compilation check
- Vite production build
- Output: `dist/` folder
- Optimized and minified

### Preview Production Build
```bash
npm run preview
```
- Serves production build locally
- Test before deployment

## Environment Variables

**Create `.env` file:**
```env
VITE_API_URL=http://localhost:5000
```

**Access in code:**
```typescript
import.meta.env.VITE_API_URL
```

## Common Issues and Solutions

### CORS Errors
- Ensure backend CORS is configured
- Check FRONTEND_URL in backend .env

### 401 Errors
- Token may be expired
- Clear localStorage and re-login
- Check token in network tab

### Build Errors
- Delete node_modules and reinstall
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check TypeScript errors

### Styling Issues
- Ensure Tailwind is configured correctly
- Check PostCSS config
- Verify index.css imports Tailwind

## Testing Strategy (To Implement)

### Unit Tests
- Component rendering
- Utility functions
- Hook behavior
- Form validation

### Integration Tests
- User flows
- API integration
- Navigation
- State management

### E2E Tests
- Login flow
- Movie rating flow
- Watchlist management
- Recommendation generation

### Recommended Tools
- **Vitest**: Fast, Vite-native testing
- **React Testing Library**: Component testing
- **Playwright/Cypress**: E2E testing
- **MSW**: API mocking

## Deployment

### Build for Production
```bash
npm run build
```

### Recommended Platforms
- **Vercel**: Best for React/Vite, zero config
- **Netlify**: Easy deployment, forms support
- **Cloudflare Pages**: Fast global CDN
- **GitHub Pages**: Free, good for static sites

### Environment Variables (Production)
Set in deployment platform:
- `VITE_API_URL`: Your backend API URL

### Build Settings
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+

## Future Enhancements

### Features
- Dark/light theme toggle
- Movie details modal
- Advanced filtering
- Sort animations
- Infinite scroll for lists
- Share watchlist feature
- Export data functionality

### Performance
- Virtual scrolling for large lists
- Image lazy loading
- Service worker for offline support
- Progressive Web App (PWA)

### UX Improvements
- Skeleton loading screens
- Toast notifications (replace browser alerts)
- Drag-and-drop for watchlist ordering
- Keyboard shortcuts
- ~~Accessibility improvements (ARIA labels)~~ - **IMPLEMENTED**
- ~~Mobile-responsive design~~ - **IMPLEMENTED (v1.3.0)**

## Implemented Features

The following UX features are now implemented:
- **Error states with retry buttons** on Dashboard, MyMovies, Watchlist
- **Optimistic updates with rollback** on rating changes and deletions
- **React Router Link components** instead of anchor tags (no page reloads)
- **Accessibility improvements**: aria-labels on icon buttons, aria-hidden on emojis

### Mobile-Responsive Design (v1.3.0)

The following mobile-responsive features are implemented:

**Navigation:**
- Hamburger menu on mobile (< 768px)
- Slide-down mobile navigation menu
- Auto-close on route change
- Logout icon on mobile, text on desktop

**Layout Components:**
- `Layout.tsx` - Mobile hamburger menu with dropdown
- `SwipeCardStack.tsx` - Viewport-based height (65-70vh), full-height poster with gradient overlay
- `SwipeCard.tsx` - Full-height movie poster with gradient text overlay at bottom
- `MovieDetailModal.tsx` - Enhanced modal with backdrop header, cast portraits with photos, embedded YouTube trailers, tagline display. Bottom sheet on mobile, centered on desktop (max-w-4xl)
- `FilterBar.tsx` - Stacked controls on mobile, optional `hideStyleFilter` prop for swipe mode
- `SwipeControls.tsx` - Larger touch targets (56px on mobile), triggers animated card transitions

**Pages:**
- `Dashboard.tsx` - Responsive progress bars, stacked layout
- `MyMovies.tsx` - Stacked header/filters, touch-friendly toggles
- `Watchlist.tsx` - Responsive cards, grid rating buttons
- `Recommendations.tsx` - Stacked search, grid session stats

**Touch Targets:**
All interactive elements have minimum 44x44px touch targets on mobile for accessibility.

**Responsive Breakpoints:**
```
< 640px  : Mobile (default styles)
≥ 640px  : sm: prefix
≥ 768px  : md: prefix (desktop navigation appears)
≥ 1024px : lg: prefix
≥ 1280px : xl: prefix
```

### Developer Experience
- Storybook for component library
- E2E test suite
- Automated deployment
- Error monitoring (Sentry)
- Analytics (Plausible/GA)
