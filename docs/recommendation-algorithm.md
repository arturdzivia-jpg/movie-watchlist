# Recommendation Algorithm Documentation

## Overview

The movie recommendation system uses **content-based filtering** to suggest movies based on user preferences extracted from their ratings. It analyzes genres, directors, actors, and movie popularity to generate personalized recommendations.

## Algorithm Type

**Content-Based Filtering**

- Analyzes movie attributes (genres, cast, crew)
- Compares to user's rated movies
- No collaborative filtering (doesn't use other users' data)
- Works even for new users with few ratings

## How It Works

### High-Level Flow

```
1. Analyze User Preferences
   ├─ Extract favorite genres
   ├─ Identify liked directors
   ├─ Identify liked actors
   └─ Note disliked genres

2. Collect Candidate Movies
   ├─ Get similar movies to user's top picks
   ├─ Discover by preferred genres
   └─ Include popular movies as fallback

3. Score Each Candidate
   ├─ Genre matching (40%)
   ├─ Popularity/rating (30%)
   ├─ Vote count (20%)
   ├─ Recency bonus (10%)
   └─ Penalize disliked genres (-50%)

4. Filter and Rank
   ├─ Remove already-rated movies
   ├─ Remove watchlist movies
   └─ Sort by score (highest first)

5. Return Top N Recommendations
```

## Step-by-Step Process

### Step 1: User Preference Analysis

**Service:** `userPreferencesService.getUserPreferences(userId)`

**Extraction Logic:**

#### Preferred Genres
```typescript
// From LIKE and SUPER_LIKE movies
likedMovies.forEach(movie => {
  movie.genres.forEach(genre => {
    genreMap[genre.id].count++
  })
})

// Result: Sorted by count (most frequent first)
[
  { id: 28, name: "Action", count: 15 },
  { id: 12, name: "Adventure", count: 12 },
  { id: 878, name: "Science Fiction", count: 10 }
]
```

#### Disliked Genres
```typescript
// From DISLIKE movies
dislikedMovies.forEach(movie => {
  movie.genres.forEach(genre => {
    dislikedGenreMap[genre.id].count++
  })
})
```

#### Favorite Directors
```typescript
// From LIKE and SUPER_LIKE movies
likedMovies.forEach(movie => {
  if (movie.director) {
    directorMap[movie.director].count++
  }
})

// Result: Sorted by count
[
  { name: "Christopher Nolan", count: 5 },
  { name: "Denis Villeneuve", count: 3 }
]
```

#### Favorite Actors
```typescript
// From top 5 cast members of LIKE/SUPER_LIKE movies
likedMovies.forEach(movie => {
  movie.cast.slice(0, 5).forEach(actor => {
    actorMap[actor.id].count++
  })
})

// Result: Sorted by count
[
  { id: 3223, name: "Robert Downey Jr.", count: 8 },
  { id: 16828, name: "Chris Hemsworth", count: 7 }
]
```

---

### Step 2: Candidate Collection

**Service:** `recommendationService.generateRecommendations(userId, limit)`

**Sources:**

#### 2.1 Similar Movies (Primary Source)

For each of user's top 5 liked movies:
```typescript
const topLikedMovies = userMovies
  .filter(m => m.rating === 'SUPER_LIKE' || m.rating === 'LIKE')
  .slice(0, 5);

for (const movie of topLikedMovies) {
  const similar = await tmdbService.getSimilarMovies(movie.tmdbId);
  candidates.push(...similar.results);
}
```

**Why:** TMDB's similarity is based on keywords, genres, and themes.

#### 2.2 Genre Discovery (Secondary Source)

```typescript
const topGenres = preferences.preferredGenres
  .slice(0, 3)  // Top 3 genres
  .map(g => g.id)
  .join(',');

const discovered = await tmdbService.discoverMovies({
  with_genres: topGenres,
  sort_by: 'vote_average.desc'  // Highest rated first
});

candidates.push(...discovered.results);
```

**Why:** Finds highly-rated movies in user's favorite genres.

#### 2.3 Popular Movies (Fallback)

```typescript
if (candidates.length < 20) {
  const popular = await tmdbService.getPopularMovies();
  candidates.push(...popular.results);
}
```

**Why:** Ensures enough recommendations even with few ratings.

#### 2.4 Deduplication & Filtering

```typescript
// Remove duplicates
const seenIds = new Set();
candidates = candidates.filter(movie => {
  if (seenIds.has(movie.id)) return false;
  seenIds.add(movie.id);
  return true;
});

// Remove already rated
candidates = candidates.filter(movie =>
  !ratedTmdbIds.has(movie.id)
);

// Remove from watchlist
candidates = candidates.filter(movie =>
  !watchlistTmdbIds.has(movie.id)
);
```

---

### Step 3: Scoring Algorithm

**Service:** `recommendationService.scoreMovie(movie, preferences)`

**Scoring Breakdown:**

#### 3.1 Genre Matching (40% Weight)

```typescript
const movieGenreIds = movie.genre_ids;
const preferredGenreIds = preferences.preferredGenres.map(g => g.id);
const matchingGenres = movieGenreIds.filter(id =>
  preferredGenreIds.includes(id)
);

const genreScore = (matchingGenres.length / preferredGenreIds.length) * 40;
score += genreScore;

// Example:
// Movie has [28, 12, 878]
// User likes [28, 12, 14, 27]
// Matching: [28, 12] = 2/4 = 50% match
// Score: 0.5 * 40 = 20 points
```

**Reason Added:**
```typescript
if (matchingGenres.length > 0) {
  const genreNames = preferences.preferredGenres
    .filter(g => matchingGenres.includes(g.id))
    .map(g => g.name)
    .slice(0, 2);

  reasons.push(`Matches your favorite genres: ${genreNames.join(', ')}`);
}
```

#### 3.2 Popularity/Rating Score (30% Weight)

```typescript
const popularityScore = (movie.vote_average / 10) * 30;
score += popularityScore;

// Example:
// Movie rating: 8.3/10
// Score: (8.3 / 10) * 30 = 24.9 points

if (movie.vote_average >= 7.5) {
  reasons.push(`Highly rated (${movie.vote_average.toFixed(1)}/10)`);
}
```

**Why:** Recommends well-reviewed movies.

#### 3.3 Vote Count Score (20% Weight)

```typescript
const voteCountScore = Math.min(movie.vote_count / 1000, 1) * 20;
score += voteCountScore;

// Example:
// Movie has 2500 votes
// Score: min(2500 / 1000, 1) * 20 = 1.0 * 20 = 20 points
//
// Movie has 500 votes
// Score: min(500 / 1000, 1) * 20 = 0.5 * 20 = 10 points
```

**Why:** Filters out obscure/unreliable ratings (requires 1000+ votes for full score).

#### 3.4 Recency Bonus (10% Weight)

```typescript
const releaseYear = parseInt(movie.release_date.split('-')[0]);
const currentYear = new Date().getFullYear();
const yearDiff = currentYear - releaseYear;

if (yearDiff <= 3) {
  score += 10;  // Recent release (last 3 years)
  reasons.push('Recent release');
} else if (yearDiff <= 10) {
  score += 5;   // Moderately recent
}

// Example:
// Current year: 2024
// Movie from 2023: +10 points, "Recent release"
// Movie from 2019: +5 points
// Movie from 2010: +0 points
```

**Why:** Slight preference for newer movies.

#### 3.5 Disliked Genre Penalty

```typescript
const dislikedGenreIds = preferences.dislikedGenres.map(g => g.id);
const hasDislikedGenre = movieGenreIds.some(id =>
  dislikedGenreIds.includes(id)
);

if (hasDislikedGenre) {
  score *= 0.5;  // 50% penalty
}

// Example:
// Score was 75
// Movie has horror genre (user dislikes horror)
// New score: 75 * 0.5 = 37.5
```

**Why:** Avoids genres user consistently dislikes.

#### 3.6 Default Reason

```typescript
if (reasons.length === 0) {
  reasons.push('Popular and well-rated');
}
```

---

### Step 4: Ranking

```typescript
const scoredMovies = candidates.map(movie =>
  this.scoreMovie(movie, preferences)
);

// Sort by score (highest first)
scoredMovies.sort((a, b) => b.score - a.score);

// Return top N
return scoredMovies.slice(0, limit);
```

**Result Format:**
```typescript
[
  {
    ...movieData,
    score: 87.5,
    reasons: [
      "Matches your favorite genres: Action, Adventure",
      "Highly rated (8.3/10)",
      "Recent release"
    ]
  }
]
```

---

## Score Examples

### Example 1: Perfect Match

**Movie:** Avengers: Endgame (2019)
- Genres: Action (28), Adventure (12), Sci-Fi (878)
- Rating: 8.3/10
- Votes: 22,847
- Year: 2019

**User Preferences:**
- Favorite genres: [28, 12, 878]
- No disliked genres

**Calculation:**
```
Genre matching: 3/3 = 100% → 40 points
Popularity: 8.3/10 → 24.9 points
Vote count: min(22847/1000, 1) = 1.0 → 20 points
Recency: 2024-2019 = 5 years → 5 points
Penalty: None

Total: 89.9 points
```

**Reasons:**
- "Matches your favorite genres: Action, Adventure"
- "Highly rated (8.3/10)"

---

### Example 2: Partial Match

**Movie:** The Shawshank Redemption (1994)
- Genres: Drama (18), Crime (80)
- Rating: 8.7/10
- Votes: 23,000
- Year: 1994

**User Preferences:**
- Favorite genres: [28 (Action), 12 (Adventure), 878 (Sci-Fi)]
- No disliked genres

**Calculation:**
```
Genre matching: 0/3 = 0% → 0 points
Popularity: 8.7/10 → 26.1 points
Vote count: min(23000/1000, 1) = 1.0 → 20 points
Recency: 2024-1994 = 30 years → 0 points
Penalty: None

Total: 46.1 points
```

**Reasons:**
- "Highly rated (8.7/10)"

**Note:** Lower score despite higher rating (genre mismatch).

---

### Example 3: With Penalty

**Movie:** The Conjuring (2013)
- Genres: Horror (27), Thriller (53)
- Rating: 7.5/10
- Votes: 9,000
- Year: 2013

**User Preferences:**
- Favorite genres: [28, 12]
- Disliked genres: [27 (Horror)]

**Calculation:**
```
Genre matching: 0/2 = 0% → 0 points
Popularity: 7.5/10 → 22.5 points
Vote count: min(9000/1000, 1) = 1.0 → 20 points
Recency: 2024-2013 = 11 years → 0 points
Subtotal: 42.5 points

Penalty: Has Horror (disliked) → 42.5 * 0.5 = 21.25 points

Total: 21.25 points
```

**Reasons:**
- "Highly rated (7.5/10)"

**Result:** Very low score, unlikely to be recommended.

---

## Algorithm Strengths

### 1. Personalized
- Based on individual user's ratings
- Adapts to user's unique taste
- No "one size fits all"

### 2. Transparent
- Clear scoring breakdown
- Reasons provided for each recommendation
- Users can understand why movies are suggested

### 3. Fast
- No complex ML models
- Simple mathematical scoring
- Scales well with user base

### 4. Cold Start Friendly
- Works with just a few ratings
- Uses popular movies as fallback
- Gradually improves with more ratings

### 5. No Privacy Concerns
- Only uses user's own data
- No data sharing between users
- No tracking required

---

## Algorithm Limitations

### 1. No Collaborative Filtering
- Doesn't learn from similar users
- Misses "hidden gems" liked by others
- Doesn't discover unexpected matches

### 2. Echo Chamber Effect
- Reinforces existing preferences
- May not suggest genre diversity
- Users might get stuck in comfort zone

**Mitigation:** Add "Explore New Genres" feature

### 3. Popularity Bias
- Favors popular movies
- Indie/niche films score lower
- Vote count requirement excludes new releases

**Mitigation:** Add "Hidden Gems" category (low vote count, high rating)

### 4. Recency Bias
- Slight preference for new movies
- Classic films may score lower
- Time-based rather than quality-based

**Mitigation:** Make recency bonus optional/configurable

### 5. Genre Granularity
- TMDB genres are broad
- "Action" includes many subtypes
- Can't distinguish superhero from war films

**Mitigation:** Use TMDB keywords for finer granularity

---

## Improvement Opportunities

### Short Term

1. **Director/Actor Matching**
   ```typescript
   // Currently not heavily weighted
   if (movie.director in user_liked_directors) {
     score += 25;  // Add director bonus
     reasons.push(`Same director as [Movie]`);
   }
   ```

2. **Cast Matching**
   ```typescript
   const matchingActors = intersection(movie.cast, user_liked_actors);
   const castScore = (matchingActors.length / 5) * 20;
   score += castScore;
   ```

3. **Diversity Injection**
   ```typescript
   // Include 20% recommendations from unexplored genres
   const diverseMovies = discoverFromUnexploredGenres();
   recommendations = [...topMatches, ...diverseMovies];
   ```

### Medium Term

1. **Collaborative Filtering**
   - Find users with similar taste
   - Recommend their highly-rated movies
   - Requires user privacy consideration

2. **Temporal Patterns**
   - Learn viewing patterns (weekends, evenings)
   - Suggest appropriate movies for time of day
   - Seasonal recommendations

3. **Mood-Based Filtering**
   - Let user select mood (exciting, relaxing, scary)
   - Filter recommendations by mood
   - Use genres + keywords

### Long Term

1. **Machine Learning Model**
   - Train on user interactions
   - Learn complex patterns
   - Predict ratings accurately

2. **Hybrid Approach**
   - Combine content + collaborative
   - Use ML for weighting
   - Personalized scoring weights

3. **Context-Aware Recommendations**
   - Time of day
   - Device type
   - Social context (alone/with friends)

---

## Performance Considerations

### Current Implementation

- **Complexity:** O(n × m)
  - n = number of candidates
  - m = scoring operations per movie

- **API Calls:**
  - Up to 5 calls for similar movies (parallel via `Promise.all()`)
  - 1 call for genre discovery
  - 1 call for popular fallback
  - **Total:** ~7-10 TMDB API calls (executed in parallel where possible)

- **Execution Time:** ~1-2 seconds (improved from 5+ seconds with parallel fetching)

### Optimization Strategies

1. **Parallel API Fetching (Implemented)**
   ```typescript
   // BEFORE: Sequential fetching (slow - 5+ seconds for 5 movies)
   for (const movie of topLikedMovies) {
     const similar = await tmdbService.getSimilarMovies(movie.tmdbId);
     candidates.push(...similar.results);
   }

   // AFTER: Parallel fetching (fast - ~1-2 seconds total)
   const similarPromises = topLikedMovies.map(movie =>
     tmdbService.getSimilarMovies(movie.movie.tmdbId)
   );
   const similarResults = await Promise.all(similarPromises);
   similarResults.forEach(result => {
     if (result?.results) candidates.push(...result.results);
   });
   ```

   **Performance improvement:** 5+ seconds → ~1-2 seconds (3-5x faster)

2. **Caching** (Future)
   ```typescript
   // Cache recommendations for 24 hours
   const cached = await redis.get(`rec:${userId}`);
   if (cached) return JSON.parse(cached);

   const recommendations = generateRecommendations(userId);
   await redis.setex(`rec:${userId}`, 86400, JSON.stringify(recommendations));
   ```

3. **Background Processing** (Future)
   - Generate recommendations nightly
   - Store in database
   - Serve from cache instantly

4. **Pagination**
   - Generate 100 recommendations
   - Return 20 at a time
   - Client can request more

---

## Testing the Algorithm

### Manual Testing

1. Create test user
2. Rate 10-15 movies across genres
3. Check recommendations match preferences
4. Rate recommended movies
5. Verify algorithm adapts

### Automated Testing

```typescript
describe('Recommendation Algorithm', () => {
  it('should recommend action movies to action lover', async () => {
    const user = await createTestUser();
    await rateMovies(user, actionMovies, 'SUPER_LIKE');

    const recs = await generateRecommendations(user.id);

    const actionRecs = recs.filter(m =>
      m.genre_ids.includes(28)  // Action genre
    );

    expect(actionRecs.length).toBeGreaterThan(recs.length * 0.7);
  });

  it('should avoid horror for horror hater', async () => {
    const user = await createTestUser();
    await rateMovies(user, horrorMovies, 'DISLIKE');

    const recs = await generateRecommendations(user.id);

    const horrorRecs = recs.filter(m =>
      m.genre_ids.includes(27)  // Horror genre
    );

    expect(horrorRecs.length).toBe(0);
  });
});
```

---

## Configuration

### Tunable Parameters

```typescript
// backend/src/services/recommendation.ts

const WEIGHTS = {
  GENRE_MATCH: 0.40,      // 40%
  POPULARITY: 0.30,       // 30%
  VOTE_COUNT: 0.20,       // 20%
  RECENCY: 0.10,          // 10%
  DISLIKE_PENALTY: 0.50   // 50% reduction
};

const THRESHOLDS = {
  HIGH_RATING: 7.5,       // "Highly rated" badge
  MIN_VOTES: 1000,        // Full vote count score
  RECENT_YEARS: 3,        // "Recent release" badge
  TOP_LIKED_MOVIES: 5,    // Number for similarity search
  TOP_GENRES: 3,          // Genres for discovery
  TOP_CAST: 5             // Cast members to consider
};
```

**To Adjust:**
Edit constants in recommendation.ts and redeploy.

---

## Monitoring

### Metrics to Track

1. **Recommendation Quality**
   - Click-through rate (CTR) on recommendations
   - Conversion rate (rated after seeing recommendation)
   - Average rating of recommended movies

2. **Algorithm Performance**
   - Generation time
   - Cache hit rate
   - API call count

3. **User Behavior**
   - Number of ratings before first recommendation
   - Preference diversity over time
   - Genre exploration rate

### Logging

```typescript
console.log('Recommendation generated:', {
  userId,
  candidateCount: candidates.length,
  recommendationCount: recommendations.length,
  topScore: recommendations[0]?.score,
  avgScore: avg(recommendations.map(r => r.score)),
  executionTime: Date.now() - startTime
});
```

---

## Conclusion

The recommendation algorithm balances:
- **Accuracy:** Matches user preferences
- **Discovery:** Introduces variety
- **Performance:** Fast execution
- **Transparency:** Explainable results

It provides a solid foundation that can be enhanced with ML and collaborative filtering as the user base grows.
