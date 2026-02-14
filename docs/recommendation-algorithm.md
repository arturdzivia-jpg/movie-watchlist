# Recommendation Algorithm Documentation

## Overview

The movie recommendation system uses **enhanced content-based filtering** with **personalized weight learning** to suggest movies based on user preferences extracted from their ratings. It analyzes genres, directors, actors, keywords, franchises, production companies, era preferences, and runtime preferences to generate hyper-personalized recommendations.

## Algorithm Type

**Hybrid Content-Based Filtering with Personalization**

- Analyzes movie attributes (genres, cast, crew, keywords, franchises)
- Compares to user's rated movies with confidence scoring
- Learns personalized weights for each signal per user
- Includes exploration (20%) to break echo chambers
- Features hidden gems discovery for lesser-known quality films
- Anti-repetition tracking to ensure variety
- Mood-based filtering for contextual recommendations

## Key Features

### 1. Per-User Weight Learning
The system learns which signals matter most to each user:
- If a user consistently likes movies from the same director, director weight increases
- If a user watches movies across many genres, genre weight decreases
- Weights are recalculated every 5 ratings after initial 10 ratings

### 2. Multi-Signal Scoring (10 signals)
| Signal | Default Weight | Description |
|--------|---------------|-------------|
| Genre Match | 25 | Matches preferred genres with confidence |
| Keyword Match | 12 | Fine-grained thematic matching |
| Director Match | 12 | Liked directors with consistency score |
| Actor Match | 8 | Actors from liked movies |
| Popularity | 18 | TMDB vote average |
| Recency | 8 | Bonus for recent releases |
| Runtime | 5 | Preferred movie length |
| Era | 5 | Preferred decades |
| Franchise | 15 (bonus) | Same collection as liked movies |
| Production Company | 10 (bonus) | Studios like A24, Marvel, etc. |

### 3. Diversity Features
- **Exploration (20%)**: Movies from unexplored genres with 8.0+ rating
- **Hidden Gems (10%)**: High-quality (7.5+) lesser-known films (100-2000 votes)
- **Anti-Repetition**: 30% penalty for movies shown in last 7 days

### 4. Context Awareness
- **Mood Filtering**: exciting, relaxing, thoughtful, funny, scary, romantic
- **Rating Style Detection**: generous (>70% positive), balanced, critical (<40% positive)

## How It Works

### High-Level Flow

```
1. Analyze User Preferences
   ├─ Extract favorite genres (with confidence & avg rating)
   ├─ Identify liked directors (with consistency score)
   ├─ Identify liked actors (with frequency)
   ├─ Extract preferred keywords
   ├─ Track liked franchises/collections
   ├─ Detect production company preferences
   ├─ Determine era preferences (decades)
   ├─ Calculate runtime preferences
   └─ Detect rating style (generous/balanced/critical)

2. Load Personalized Weights
   ├─ Check if user has learned weights
   ├─ Apply weight multipliers (0.5x - 2.0x)
   └─ Use defaults if insufficient data

3. Collect Candidate Movies
   ├─ Similar movies to user's top 5 liked films (parallel)
   ├─ Discover by preferred genres (or mood genres)
   ├─ Popular movies as fallback
   └─ Apply mood filter if specified

4. Enrich Candidates
   ├─ Check database cache for details
   ├─ Fetch keywords, collection, production companies
   └─ Batch fetch from TMDB for uncached

5. Score Each Candidate
   ├─ Apply all 10 scoring signals
   ├─ Apply personalized weight multipliers
   ├─ Penalize disliked genres (-50%)
   ├─ Penalize recently shown (-30%)
   └─ Adjust for rating style

6. Generate Final List
   ├─ Top 70% from main scored results
   ├─ 20% exploration (unexplored genres)
   ├─ 10% hidden gems (quality lesser-known)
   └─ Interleave for variety

7. Record Shown Recommendations
   └─ Track for anti-repetition
```

## Detailed Scoring

### Genre Matching (25 points base)
```typescript
// Weight by genre confidence and average rating
for (const genreId of matchingGenres) {
  const genrePref = preferences.preferredGenres.find(g => g.id === genreId);
  if (genrePref) {
    genreScore += (genrePref.avgRating / 4) * (genrePref.confidence + 0.2);
  }
}
score += Math.min(genreScore * weights.genre, weights.genre * 2);
```

### Keyword Matching (12 points base)
```typescript
// Fine-grained thematic matching
const matchingKeywords = preferences.preferredKeywords
  .filter(k => movieKeywordIds.has(k.id));

for (const kw of matchingKeywords) {
  keywordScore += Math.min(kw.count, 5); // Cap per keyword
}
score += Math.min(keywordScore, weights.keyword);
```

### Director Matching (12 points base)
```typescript
// Higher score for directors with more liked films and higher avg rating
const directorScore = Math.min(
  (directorMatch.count * 3) * (directorMatch.avgRating / 4),
  weights.director
);
```

### Franchise/Collection Matching (15 points bonus)
```typescript
// Bonus for movies in same collection as liked movies
if (movie.belongs_to_collection && preferences.likedCollections.length > 0) {
  const collectionMatch = preferences.likedCollections.find(
    c => c.id === movie.belongs_to_collection.id
  );
  if (collectionMatch) {
    score += Math.min(collectionMatch.count * 5, 15);
    reasons.push(`Part of ${movie.belongs_to_collection.name}`);
  }
}
```

### Production Company Matching (10 points bonus)
```typescript
// Match studios like A24, Marvel Studios, Studio Ghibli
const companyScore = Math.min(
  (matchingCompany.avgRating / 4) * matchingCompany.count * 2,
  10
);
```

### Era/Decade Matching (5 points base)
```typescript
// Match preferred decades
const eraScore = (eraPref.avgRating / 4) * Math.min(eraPref.count / 5, 1) * weights.era;
```

### Runtime Matching (5 points base)
```typescript
// Runtime buckets: short (<90), medium (90-120), long (120-150), epic (>150)
if (bucket === preferences.preferredRuntime.bucket) {
  score += weights.runtime;
} else if (isAdjacentBucket(bucket, preferences.preferredRuntime.bucket)) {
  score += weights.runtime * 0.5;
}
```

### Recency Bonus (8 points base)
```typescript
if (yearDiff <= 1) {
  score += weights.recency * 1.5;  // New release
} else if (yearDiff <= 3) {
  score += weights.recency;        // Recent
} else if (yearDiff <= 10) {
  score += weights.recency * 0.5;  // Moderately recent
}
```

## Penalties

### Disliked Genre Penalty
```typescript
if (hasDislikedGenre) {
  score *= 0.5;  // 50% reduction
}
```

### Recently Shown Penalty
```typescript
if (recentlyShownIds.has(movie.id)) {
  score *= 0.7;  // 30% reduction for movies shown in last 7 days
}
```

### Rating Style Adjustment
```typescript
if (preferences.ratingStyle === 'critical') {
  // For critical raters, boost highly-rated films more
  if (movie.vote_average >= 8.0) {
    score *= 1.1;
  }
}
```

## Weight Learning Algorithm

The system learns personalized weights after a user has rated at least 10 movies:

```typescript
// Calculate correlation for each signal
const genreWeight = calculateSignalCorrelation(
  likedMovies,
  dislikedMovies,
  extractGenres
);

// Correlation formula:
// hitRateInLiked - hitRateInDisliked
// Result mapped to 0.5 - 2.0 range
```

### When Weights Recalculate
- After first 10 ratings
- Every 5 new ratings thereafter
- Weights stored in `UserPreferenceWeights` table

### Weight Bounds
- Minimum: 0.5x (signal de-emphasized)
- Maximum: 2.0x (signal emphasized)
- Default: 1.0x (neutral)

## Exploration Recommendations

20% of recommendations come from unexplored genres:

```typescript
// Find genres user hasn't rated many movies in
const explorationGenres = allGenres.filter(g => !ratedGenreIds.has(g.id));

// Fetch highly-rated movies from these genres
const explorationCandidates = await tmdbService.discoverMovies({
  with_genres: selectedGenres.map(g => g.id).join(','),
  sort_by: 'vote_average.desc',
  'vote_count.gte': 1000,  // Higher threshold for exploration
  'vote_average.gte': 8.0   // Only highly-rated
});
```

**Reason shown:** "Expand your horizons: highly rated Drama"

## Hidden Gems

10% of recommendations are high-quality lesser-known films:

```typescript
const hiddenGems = await tmdbService.discoverMovies({
  with_genres: topGenres.join(','),
  sort_by: 'vote_average.desc',
  'vote_count.gte': 100,     // Minimum for reliability
  'vote_count.lte': 2000,    // Not too popular
  'vote_average.gte': 7.5    // High quality
});
```

**Reason shown:** "Hidden gem you might love"

## Mood-Based Filtering

Available moods and their genre mappings:

| Mood | Genres |
|------|--------|
| exciting | Action, Adventure, Thriller, Sci-Fi |
| relaxing | Comedy, Family, Fantasy |
| thoughtful | Drama, History, Documentary |
| funny | Comedy, Music |
| scary | Horror, Thriller, Mystery |
| romantic | Romance, Drama |

```
GET /api/recommendations?mood=exciting
```

When mood is specified:
- Exploration recommendations are disabled
- Only movies matching mood genres are returned

## API Endpoints

### Get Recommendations
```
GET /api/recommendations?limit=20&page=1&mood=exciting
```

Response:
```json
{
  "recommendations": [
    {
      "id": 123,
      "title": "Movie Title",
      "score": 85.5,
      "reasons": ["Matches your favorite genres: Action, Sci-Fi", "From Christopher Nolan"],
      "isExploration": false,
      "isHiddenGem": false
    }
  ],
  "total": 20,
  "page": 1,
  "mood": "exciting"
}
```

### Get User Preferences
```
GET /api/recommendations/preferences
```

Response:
```json
{
  "preferredGenres": [
    { "id": 28, "name": "Action", "count": 15, "avgRating": 3.5, "confidence": 0.25 }
  ],
  "likedDirectors": [
    { "name": "Christopher Nolan", "count": 5, "avgRating": 3.8, "consistency": 0.2 }
  ],
  "likedActors": [
    { "id": 1234, "name": "Tom Hanks", "count": 8, "avgRating": 3.6 }
  ],
  "preferredKeywords": [
    { "id": 9715, "name": "superhero", "count": 12 }
  ],
  "likedCollections": [
    { "id": 131296, "name": "MCU", "count": 10, "avgRating": 3.4 }
  ],
  "likedProductionCompanies": [
    { "id": 420, "name": "Marvel Studios", "count": 12, "avgRating": 3.5 }
  ],
  "preferredEras": [
    { "decade": "2010s", "count": 25, "avgRating": 3.4 }
  ],
  "preferredRuntime": { "bucket": "long", "count": 20, "avgRating": 3.5 },
  "ratingDistribution": {
    "superLike": 10,
    "like": 25,
    "ok": 15,
    "dislike": 5,
    "notInterested": 2,
    "total": 57
  },
  "ratingStyle": "balanced",
  "totalRatedMovies": 57
}
```

### Get Available Moods
```
GET /api/recommendations/moods
```

## Database Schema

### UserPreferenceWeights
```prisma
model UserPreferenceWeights {
  id               String   @id @default(uuid())
  userId           String   @unique
  genreWeight      Float    @default(1.0)
  directorWeight   Float    @default(1.0)
  actorWeight      Float    @default(1.0)
  keywordWeight    Float    @default(1.0)
  popularityWeight Float    @default(1.0)
  recencyWeight    Float    @default(1.0)
  runtimeWeight    Float    @default(1.0)
  eraWeight        Float    @default(1.0)
  lastCalculated   DateTime
  ratingCount      Int      @default(0)
}
```

### RecommendationHistory
```prisma
model RecommendationHistory {
  id      String   @id @default(uuid())
  userId  String
  tmdbId  Int
  shownAt DateTime @default(now())
  action  String?  // 'viewed', 'skipped', 'rated', 'watchlisted'

  @@unique([userId, tmdbId])
}
```

### Movie (enhanced)
```prisma
model Movie {
  // ... existing fields
  keywords             Json?    // Array of { id, name }
  collectionId         Int?
  collectionName       String?
  productionCompanies  Json?    // Array of { id, name }
}
```

## Performance

### Optimizations
- Parallel API fetching for similar movies
- Database caching for movie details
- Batch enrichment (10 movies at a time)
- Limit enrichment to top 50 candidates

### Execution Time
- ~1-2 seconds for full recommendation generation
- ~7-10 TMDB API calls (parallelized)

## Configuration

```typescript
// Tunable constants in recommendation.ts
const MIN_VOTE_COUNT = 100;           // Minimum votes for consideration
const HIDDEN_GEM_MIN_VOTES = 100;     // Hidden gem lower bound
const HIDDEN_GEM_MAX_VOTES = 2000;    // Hidden gem upper bound
const HIDDEN_GEM_MIN_RATING = 7.5;    // Hidden gem quality threshold
const EXPLORATION_RATIO = 0.2;         // 20% exploration
const ENRICHMENT_LIMIT = 50;           // Max candidates to enrich
const RECENTLY_SHOWN_DAYS = 7;         // Anti-repetition window
const RECENTLY_SHOWN_PENALTY = 0.3;    // 30% penalty

// In weightLearning.ts
const MIN_RATINGS_FOR_LEARNING = 10;   // Minimum ratings before learning
const RECALC_THRESHOLD = 5;            // Recalculate every N ratings
const MIN_WEIGHT = 0.5;                // Minimum weight multiplier
const MAX_WEIGHT = 2.0;                // Maximum weight multiplier
```

## Summary

The enhanced recommendation system provides:

1. **Hyper-Personalization**: Per-user weight learning adapts to individual patterns
2. **Multi-Signal Scoring**: 10 signals including keywords, franchises, production companies
3. **Diversity**: 20% exploration + 10% hidden gems prevents echo chambers
4. **Anti-Repetition**: 7-day tracking ensures variety across sessions
5. **Context Awareness**: Mood-based filtering for "what to watch now"
6. **Transparency**: Clear reasons for each recommendation
7. **Performance**: Parallel fetching and caching for fast response
