# API Documentation

## Base URL

**Development:** `http://localhost:5000`
**Production:** Your deployed backend URL

All endpoints are prefixed with `/api`

## Authentication

Most endpoints require authentication via JWT token.

### Header Format
```
Authorization: Bearer <jwt_token>
```

### Token Expiration
Tokens expire after 7 days. Frontend automatically redirects to login on 401.

---

## Endpoints

### Authentication

#### Register User

**POST** `/api/auth/register`

**Description:** Create a new user account

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

**Validation:**
- Email: Valid email format, unique
- Username: Unique, any string
- Password: Minimum 6 characters

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Email already exists"
}
```
```json
{
  "error": "Username already exists"
}
```
```json
{
  "error": "Password must be at least 6 characters"
}
```

---

#### Login User

**POST** `/api/auth/login`

**Description:** Login with existing account

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Invalid credentials"
}
```

**400 Bad Request:**
```json
{
  "error": "Email and password are required"
}
```

---

### Movies

#### Search Movies

**GET** `/api/movies/search`

**Description:** Search for movies using TMDB API

**Authentication:** Required

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number, default 1

**Example:**
```
GET /api/movies/search?q=avengers&page=1
```

**Success Response (200):**
```json
{
  "page": 1,
  "results": [
    {
      "id": 299536,
      "title": "Avengers: Infinity War",
      "overview": "As the Avengers and their allies...",
      "poster_path": "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
      "backdrop_path": "/lmZFxXgJE3vgrciwuDib0N8CfQo.jpg",
      "release_date": "2018-04-25",
      "genre_ids": [12, 878, 14, 28],
      "vote_average": 8.3,
      "vote_count": 25847,
      "popularity": 123.45
    }
  ],
  "total_pages": 10,
  "total_results": 200
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Search query is required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to search movies"
}
```

---

#### Get Popular Movies

**GET** `/api/movies/popular`

**Description:** Get popular/trending movies from TMDB

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number, default 1

**Example:**
```
GET /api/movies/popular?page=1
```

**Success Response (200):**
Same format as search results

---

#### Get Movie Details

**GET** `/api/movies/:tmdbId`

**Description:** Get detailed information about a specific movie. Caches data for 30 days.

**Authentication:** Required

**Path Parameters:**
- `tmdbId`: TMDB movie ID (integer)

**Example:**
```
GET /api/movies/299536
```

**Success Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "tmdbId": 299536,
  "title": "Avengers: Infinity War",
  "overview": "As the Avengers and their allies...",
  "posterPath": "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
  "releaseDate": "2018-04-25",
  "genres": [
    { "id": 12, "name": "Adventure" },
    { "id": 878, "name": "Science Fiction" },
    { "id": 14, "name": "Fantasy" },
    { "id": 28, "name": "Action" }
  ],
  "director": "Anthony Russo",
  "cast": [
    {
      "id": 3223,
      "name": "Robert Downey Jr.",
      "character": "Tony Stark / Iron Man"
    },
    {
      "id": 16828,
      "name": "Chris Hemsworth",
      "character": "Thor Odinson"
    }
  ],
  "runtime": 149,
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid TMDB ID"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to get movie details"
}
```

---

### User Movies

#### Get User's Movies

**GET** `/api/user/movies`

**Description:** Get all movies rated by the authenticated user

**Authentication:** Required

**Query Parameters:**
- `rating` (optional): Filter by rating (DISLIKE, OK, LIKE, SUPER_LIKE)
- `sort` (optional): Sort order (date, title, rating). Default: date

**Examples:**
```
GET /api/user/movies
GET /api/user/movies?rating=SUPER_LIKE
GET /api/user/movies?sort=title
GET /api/user/movies?rating=LIKE&sort=date
```

**Success Response (200):**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "movieId": "660e8400-e29b-41d4-a716-446655440000",
    "rating": "SUPER_LIKE",
    "watched": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "movie": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "tmdbId": 299536,
      "title": "Avengers: Infinity War",
      "overview": "As the Avengers...",
      "posterPath": "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
      "releaseDate": "2018-04-25",
      "genres": [...],
      "director": "Anthony Russo",
      "cast": [...],
      "runtime": 149
    }
  }
]
```

---

#### Add/Rate Movie

**POST** `/api/user/movies`

**Description:** Add a movie with a rating. Uses upsert logic (creates or updates).

**Authentication:** Required

**Request Body:**
```json
{
  "tmdbId": 299536,
  "rating": "SUPER_LIKE",
  "watched": true
}
```

**Fields:**
- `tmdbId` (required): TMDB movie ID
- `rating` (required): DISLIKE, OK, LIKE, or SUPER_LIKE
- `watched` (optional): Boolean, default true

**Success Response (201):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "movieId": "660e8400-e29b-41d4-a716-446655440000",
  "rating": "SUPER_LIKE",
  "watched": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "movie": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "tmdbId": 299536,
    "title": "Avengers: Infinity War",
    ...
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "tmdbId and rating are required"
}
```
```json
{
  "error": "Invalid rating value"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to add movie"
}
```

---

#### Update Movie Rating

**PUT** `/api/user/movies/:id`

**Description:** Update rating or watched status of a user's movie

**Authentication:** Required

**Path Parameters:**
- `id`: UserMovie ID (from GET /api/user/movies)

**Request Body:**
```json
{
  "rating": "LIKE",
  "watched": true
}
```

**Fields (all optional, at least one required):**
- `rating`: DISLIKE, OK, LIKE, or SUPER_LIKE
- `watched`: Boolean

**Success Response (200):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "movieId": "660e8400-e29b-41d4-a716-446655440000",
  "rating": "LIKE",
  "watched": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:20:00.000Z",
  "movie": {...}
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Movie not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid rating value"
}
```

---

#### Delete Movie

**DELETE** `/api/user/movies/:id`

**Description:** Remove a movie from user's rated movies

**Authentication:** Required

**Path Parameters:**
- `id`: UserMovie ID

**Success Response (200):**
```json
{
  "message": "Movie removed successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Movie not found"
}
```

---

### Watchlist

#### Get Watchlist

**GET** `/api/watchlist`

**Description:** Get user's watchlist (movies to watch)

**Authentication:** Required

**Success Response (200):**
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "movieId": "660e8400-e29b-41d4-a716-446655440000",
    "addedAt": "2024-01-15T10:30:00.000Z",
    "priority": "HIGH",
    "movie": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "tmdbId": 299536,
      "title": "Avengers: Infinity War",
      ...
    }
  }
]
```

---

#### Add to Watchlist

**POST** `/api/watchlist`

**Description:** Add a movie to watchlist

**Authentication:** Required

**Request Body:**
```json
{
  "tmdbId": 299536,
  "priority": "MEDIUM"
}
```

**Fields:**
- `tmdbId` (required): TMDB movie ID
- `priority` (optional): LOW, MEDIUM, or HIGH. Default: MEDIUM

**Success Response (201):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "movieId": "660e8400-e29b-41d4-a716-446655440000",
  "addedAt": "2024-01-15T10:30:00.000Z",
  "priority": "MEDIUM",
  "movie": {...}
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "tmdbId is required"
}
```
```json
{
  "error": "Movie already in watchlist"
}
```

---

#### Remove from Watchlist

**DELETE** `/api/watchlist/:id`

**Description:** Remove a movie from watchlist

**Authentication:** Required

**Path Parameters:**
- `id`: Watchlist item ID

**Success Response (200):**
```json
{
  "message": "Removed from watchlist successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Watchlist item not found"
}
```

---

#### Mark as Watched

**POST** `/api/watchlist/:id/watched`

**Description:** Mark a watchlist movie as watched with a rating. Removes from watchlist and adds to rated movies.

**Authentication:** Required

**Path Parameters:**
- `id`: Watchlist item ID

**Request Body:**
```json
{
  "rating": "LIKE"
}
```

**Fields:**
- `rating` (required): DISLIKE, OK, LIKE, or SUPER_LIKE

**Success Response (200):**
```json
{
  "message": "Movie marked as watched and moved to your list",
  "userMovie": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "movieId": "660e8400-e29b-41d4-a716-446655440000",
    "rating": "LIKE",
    "watched": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "movie": {...}
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Rating is required"
}
```
```json
{
  "error": "Invalid rating value"
}
```

**404 Not Found:**
```json
{
  "error": "Watchlist item not found"
}
```

---

### Recommendations

#### Get Recommendations

**GET** `/api/recommendations`

**Description:** Get personalized movie recommendations based on user's ratings

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of recommendations, default 20

**Example:**
```
GET /api/recommendations?limit=20
```

**Success Response (200):**
```json
{
  "recommendations": [
    {
      "id": 299537,
      "title": "Avengers: Endgame",
      "overview": "After the devastating events...",
      "poster_path": "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
      "backdrop_path": "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
      "release_date": "2019-04-24",
      "genre_ids": [28, 12, 878],
      "vote_average": 8.3,
      "vote_count": 22847,
      "popularity": 98.76,
      "score": 87.5,
      "reasons": [
        "Matches your favorite genres: Action, Adventure",
        "Highly rated (8.3/10)"
      ]
    }
  ],
  "total": 20
}
```

**Fields:**
- Standard TMDB movie fields
- `score`: Recommendation score (0-100)
- `reasons`: Array of strings explaining why recommended

**Empty Response:**
Returns empty array if user hasn't rated enough movies.

---

#### Get User Preferences

**GET** `/api/recommendations/preferences`

**Description:** Get user's movie preferences (for debugging/display)

**Authentication:** Required

**Success Response (200):**
```json
{
  "preferredGenres": [
    { "id": 28, "name": "Action", "count": 15 },
    { "id": 12, "name": "Adventure", "count": 12 },
    { "id": 878, "name": "Science Fiction", "count": 10 }
  ],
  "likedDirectors": [
    { "name": "Christopher Nolan", "count": 5 },
    { "name": "Denis Villeneuve", "count": 3 }
  ],
  "likedActors": [
    { "id": 3223, "name": "Robert Downey Jr.", "count": 8 },
    { "id": 16828, "name": "Chris Hemsworth", "count": 7 }
  ],
  "dislikedGenres": [
    { "id": 27, "name": "Horror", "count": 3 }
  ]
}
```

**Use Case:**
- Debugging recommendation algorithm
- Showing user their taste profile
- Understanding recommendation logic

---

## Error Codes

### HTTP Status Codes

- **200 OK**: Successful GET/PUT/DELETE
- **201 Created**: Successful POST
- **400 Bad Request**: Invalid input/validation error
- **401 Unauthorized**: Missing or invalid JWT token
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Common Error Response Format

```json
{
  "error": "Error message description"
}
```

---

## Rate Limiting

### TMDB API Limits
- Free tier: 1000 requests/day
- Rate: 40 requests/10 seconds

### Mitigation
- Movie data cached for 30 days
- Batch requests when possible
- Consider paid tier for production

---

## CORS

### Allowed Origins

Development: `http://localhost:5173`
Production: Set via `FRONTEND_URL` env variable

### Allowed Methods

GET, POST, PUT, DELETE, OPTIONS

### Credentials

Allowed for cookie support

---

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Search (with token):**
```bash
curl -X GET "http://localhost:5000/api/movies/search?q=avengers" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import endpoints
2. Set base URL variable
3. Use environment for token
4. Create collection for all endpoints

### Using Insomnia

Similar to Postman, supports:
- Environment variables
- Request chaining
- GraphQL (if added)

---

## Webhook Support (Future)

Potential webhook events:
- `movie.rated`
- `movie.added_to_watchlist`
- `recommendation.generated`

Not currently implemented.

---

## API Versioning

Current version: v1 (implicit)

Future: `/api/v1/...`, `/api/v2/...`

Backwards compatibility maintained within major versions.
