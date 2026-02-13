# Database Schema Documentation

## Overview

The database uses PostgreSQL with Prisma ORM for type-safe database access. The schema is designed for a multi-user movie watchlist application with rating and recommendation features.

## Database Technology

- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Migration Tool**: Prisma Migrate
- **Connection Pooling**: Prisma's built-in pooling

## Schema File Location

`backend/prisma/schema.prisma`

## Entity Relationship Diagram

```
┌──────────────┐
│    Users     │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────┐      N:1     ┌──────────────┐
│  UserMovies  ├──────────────►│    Movies    │
└──────────────┘               └──────────────┘
                                       ▲
┌──────────────┐      N:1             │
│  Watchlist   ├──────────────────────┘
└──────────────┘
```

## Tables

### 1. Users

**Purpose:** Store user account information

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique user identifier |
| email | String | UNIQUE, NOT NULL | User's email address |
| username | String | UNIQUE, NOT NULL | Display username |
| passwordHash | String | NOT NULL | Bcrypt hashed password |
| createdAt | DateTime | DEFAULT now() | Account creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `email`
- Unique index on `username`

**Relations:**
- Has many `UserMovies` (cascade delete)
- Has many `Watchlist` items (cascade delete)

**Security:**
- Passwords stored as bcrypt hashes (10 salt rounds)
- Never return passwordHash in API responses
- Email used for login

**Example:**
```sql
id: "550e8400-e29b-41d4-a716-446655440000"
email: "john@example.com"
username: "john_doe"
passwordHash: "$2b$10$..."
createdAt: "2024-01-15T10:30:00.000Z"
updatedAt: "2024-01-15T10:30:00.000Z"
```

---

### 2. Movies

**Purpose:** Cache movie data from TMDB API

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Internal movie identifier |
| tmdbId | Integer | UNIQUE, NOT NULL | TMDB API movie ID |
| title | String | NOT NULL | Movie title |
| overview | String | NULLABLE | Movie synopsis |
| posterPath | String | NULLABLE | TMDB poster image path |
| releaseDate | String | NULLABLE | Release date (YYYY-MM-DD) |
| genres | JSON | NULLABLE | Array of genre objects |
| director | String | NULLABLE | Director name |
| cast | JSON | NULLABLE | Array of cast objects |
| runtime | Integer | NULLABLE | Runtime in minutes |
| lastUpdated | DateTime | DEFAULT now() | Cache timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `tmdbId`

**Relations:**
- Has many `UserMovies`
- Has many `Watchlist` items

**JSON Structures:**

**Genres:**
```json
[
  { "id": 28, "name": "Action" },
  { "id": 12, "name": "Adventure" }
]
```

**Cast:**
```json
[
  {
    "id": 3223,
    "name": "Robert Downey Jr.",
    "character": "Tony Stark"
  }
]
```

**Cache Strategy:**
- Cache duration: 30 days
- Auto-refresh on access if outdated
- Reduces TMDB API calls

**Example:**
```sql
id: "660e8400-e29b-41d4-a716-446655440000"
tmdbId: 299536
title: "Avengers: Infinity War"
overview: "As the Avengers and their allies..."
posterPath: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg"
releaseDate: "2018-04-25"
genres: [{"id": 12, "name": "Adventure"}, ...]
director: "Anthony Russo"
cast: [{"id": 3223, "name": "Robert Downey Jr.", ...}, ...]
runtime: 149
lastUpdated: "2024-01-15T10:30:00.000Z"
```

---

### 3. UserMovies

**Purpose:** Store user's rated movies

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique entry identifier |
| userId | String (UUID) | FOREIGN KEY, NOT NULL | References Users.id |
| movieId | String (UUID) | FOREIGN KEY, NOT NULL | References Movies.id |
| rating | Enum | NOT NULL | User's rating |
| watched | Boolean | DEFAULT true | Whether user watched it |
| createdAt | DateTime | DEFAULT now() | Rating creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Rating Enum Values:**
- `DISLIKE` - 👎 Didn't enjoy it
- `OK` - 😐 It was alright
- `LIKE` - 👍 Really enjoyed it
- `SUPER_LIKE` - ❤️ Absolutely loved it

**Indexes:**
- Primary key on `id`
- Composite unique index on `(userId, movieId)` - prevents duplicate ratings
- **@@index([userId])** - Fast user queries
- **@@index([movieId])** - Fast movie lookups
- **@@index([rating])** - Fast rating filters

**Relations:**
- Belongs to `User` (cascade delete when user deleted)
- Belongs to `Movie` (cascade delete when movie deleted)

**Constraints:**
- One rating per user per movie (enforced by unique constraint)
- Upsert pattern used in API to handle updates

**Example:**
```sql
id: "770e8400-e29b-41d4-a716-446655440000"
userId: "550e8400-e29b-41d4-a716-446655440000"
movieId: "660e8400-e29b-41d4-a716-446655440000"
rating: "SUPER_LIKE"
watched: true
createdAt: "2024-01-15T10:30:00.000Z"
updatedAt: "2024-01-16T14:20:00.000Z"
```

---

### 4. Watchlist

**Purpose:** Store movies user wants to watch later

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique watchlist entry |
| userId | String (UUID) | FOREIGN KEY, NOT NULL | References Users.id |
| movieId | String (UUID) | FOREIGN KEY, NOT NULL | References Movies.id |
| addedAt | DateTime | DEFAULT now() | When added to watchlist |
| priority | Enum | DEFAULT MEDIUM | Watching priority |

**Priority Enum Values:**
- `LOW` - Can wait
- `MEDIUM` - Normal priority (default)
- `HIGH` - Want to watch soon

**Indexes:**
- Primary key on `id`
- Composite unique index on `(userId, movieId)` - prevents duplicates
- **@@index([userId])** - Fast user queries
- **@@index([movieId])** - Fast movie lookups

**Relations:**
- Belongs to `User` (cascade delete)
- Belongs to `Movie` (cascade delete)

**Constraints:**
- One entry per user per movie
- Cannot be in both watchlist and rated movies simultaneously

**Example:**
```sql
id: "880e8400-e29b-41d4-a716-446655440000"
userId: "550e8400-e29b-41d4-a716-446655440000"
movieId: "660e8400-e29b-41d4-a716-446655440000"
addedAt: "2024-01-15T10:30:00.000Z"
priority: "HIGH"
```

---

## Enums

### Rating
```prisma
enum Rating {
  DISLIKE
  OK
  LIKE
  SUPER_LIKE
}
```

**Weights for Recommendations:**
- DISLIKE: -1
- OK: 0
- LIKE: 1
- SUPER_LIKE: 2

### Priority
```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

**Used for watchlist ordering** (future feature)

---

## Database Constraints

### Foreign Key Constraints

1. **UserMovies → Users**
   - ON DELETE: CASCADE
   - Deleting user removes all their ratings

2. **UserMovies → Movies**
   - ON DELETE: CASCADE
   - Deleting movie removes all ratings for it

3. **Watchlist → Users**
   - ON DELETE: CASCADE
   - Deleting user removes their watchlist

4. **Watchlist → Movies**
   - ON DELETE: CASCADE
   - Deleting movie removes from all watchlists

### Unique Constraints

1. **Users.email** - No duplicate emails
2. **Users.username** - No duplicate usernames
3. **Movies.tmdbId** - No duplicate TMDB movies
4. **(UserMovies.userId, UserMovies.movieId)** - One rating per movie per user
5. **(Watchlist.userId, Watchlist.movieId)** - One watchlist entry per movie per user

---

## Common Queries

### Get User's Liked Movies
```typescript
await prisma.userMovie.findMany({
  where: {
    userId: "user-id",
    rating: { in: ['LIKE', 'SUPER_LIKE'] }
  },
  include: { movie: true }
});
```

### Get User's Watchlist
```typescript
await prisma.watchlist.findMany({
  where: { userId: "user-id" },
  include: { movie: true },
  orderBy: { addedAt: 'desc' }
});
```

### Get Movie with All User Interactions
```typescript
await prisma.movie.findUnique({
  where: { tmdbId: 299536 },
  include: {
    userMovies: true,
    watchlist: true
  }
});
```

### Count Movies by Rating
```typescript
await prisma.userMovie.groupBy({
  by: ['rating'],
  where: { userId: "user-id" },
  _count: { id: true }
});
```

---

## Migrations

### Running Migrations

**Create new migration:**
```bash
npx prisma migrate dev --name description
```

**Apply migrations (production):**
```bash
npx prisma migrate deploy
```

**Reset database (dev only):**
```bash
npx prisma migrate reset
```

### Migration Files

Stored in `backend/prisma/migrations/`

Each migration includes:
- SQL migration file
- Migration metadata

---

## Prisma Client

### Generate Client
```bash
npx prisma generate
```

**After:**
- Schema changes
- Fresh clone
- Dependency installation

### Prisma Studio

**Visual database browser:**
```bash
npx prisma studio
```

Opens GUI at `http://localhost:5555`

---

## Data Integrity

### Transaction Support

**Prisma transactions for atomic operations:**

The watchlist "mark as watched" operation uses transactions to ensure atomicity:

```typescript
// Used in watchlist.ts for markWatched endpoint
await prisma.$transaction(async (tx) => {
  // Create the user movie entry
  const userMovie = await tx.userMovie.upsert({
    where: { userId_movieId: { userId, movieId } },
    update: { rating: validatedRating, watched: true },
    create: { userId, movieId, rating: validatedRating, watched: true }
  });

  // Delete from watchlist
  await tx.watchlist.delete({ where: { id } });

  return userMovie;
});
```

This ensures both operations succeed or both fail - no partial state.

### Cascade Deletes

**User Deletion:**
1. Deletes all UserMovies
2. Deletes all Watchlist entries
3. Movies remain (shared resource)

**Movie Deletion:**
1. Deletes all UserMovies referencing it
2. Deletes all Watchlist entries referencing it
3. Users remain

---

## Performance Considerations

### Indexes

**Automatic Indexes (Prisma):**
- All primary keys
- All unique fields
- All foreign keys
- All unique compound constraints

**Custom Indexes Added:**
```prisma
// UserMovie model
@@index([userId])   // Fast user movie lookups
@@index([movieId])  // Fast movie lookups
@@index([rating])   // Fast rating filters

// Watchlist model
@@index([userId])   // Fast user watchlist lookups
@@index([movieId])  // Fast movie lookups
```

**Query Optimization:**
- Use `select` to limit fields
- Use `include` judiciously
- Paginate large result sets
- Use database indexes

### Connection Pooling

Prisma uses connection pooling by default:
- Pool size configurable via DATABASE_URL
- Format: `?connection_limit=10`

**Example:**
```
postgresql://user:pass@host:5432/db?connection_limit=10
```

---

## Backup and Restore

### Backup Database

```bash
pg_dump -U postgres movie_watchlist > backup.sql
```

### Restore Database

```bash
psql -U postgres movie_watchlist < backup.sql
```

### Automated Backups

**Recommended for production:**
- Daily automated backups
- Retention policy (30 days)
- Off-site storage
- Test restore procedures

---

## Security Best Practices

### Sensitive Data

1. **Never log passwordHash**
2. **Exclude from API responses:**
   ```typescript
   select: {
     id: true,
     email: true,
     username: true,
     // passwordHash: false (omitted)
   }
   ```

### Row-Level Security

**Always filter by userId:**
```typescript
where: {
  userId: req.user.userId  // From JWT
}
```

**Never trust client-provided userId**

### SQL Injection

Prisma protects against SQL injection:
- Parameterized queries
- Type-safe API
- No raw SQL needed (usually)

---

## Monitoring

### Query Logging

**Enable in development:**
```typescript
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});
```

**Disable in production** (performance)

### Slow Query Detection

Monitor queries taking > 100ms:
- Add database query logging
- Use tools like pgAdmin
- Consider query optimization

---

## Scaling Considerations

### Read Replicas

For high traffic:
- Use read replicas for queries
- Write to primary database
- Prisma supports read replicas

### Database Sharding

For very large scale:
- Shard by userId
- Requires application changes
- Consider at 100M+ records

### Caching Layer

Add Redis caching:
- Cache frequently accessed movies
- Cache user preferences
- Reduce database load

---

## Future Schema Enhancements

### Potential Additions

1. **User Profiles**
   - Bio, avatar, preferences
   - Public/private settings

2. **Social Features**
   - Friends table
   - Shared watchlists
   - Comments/reviews

3. **Collections**
   - User-created movie lists
   - Themes/categories

4. **Viewing History**
   - Separate from ratings
   - Watch date tracking
   - Re-watch support

5. **Movie Metadata**
   - Languages, countries
   - Awards, certifications
   - Streaming availability

6. **User Activity Log**
   - Audit trail
   - History tracking
   - Undo functionality
