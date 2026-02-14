import prisma from '../config/database';
import tmdbService, { TMDBMovie, TMDBKeyword } from './tmdb';
import userPreferencesService, { EnhancedUserPreferences } from './userPreferences';

interface ScoredMovie extends TMDBMovie {
  score: number;
  reasons: string[];
  isExploration?: boolean;
  isHiddenGem?: boolean;
}

interface UserWeights {
  genre: number;
  director: number;
  actor: number;
  keyword: number;
  popularity: number;
  recency: number;
  runtime: number;
  era: number;
}

// Mood to genre mapping
type Mood = 'exciting' | 'relaxing' | 'thoughtful' | 'funny' | 'scary' | 'romantic';

const MOOD_GENRE_MAPPING: Record<Mood, number[]> = {
  exciting: [28, 12, 53, 878],      // Action, Adventure, Thriller, Sci-Fi
  relaxing: [35, 10751, 14],        // Comedy, Family, Fantasy
  thoughtful: [18, 36, 99],         // Drama, History, Documentary
  funny: [35, 10402],               // Comedy, Music
  scary: [27, 53, 9648],            // Horror, Thriller, Mystery
  romantic: [10749, 18]             // Romance, Drama
};

// TMDB genre ID to name mapping (fallback)
const GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// Default weights (sum to ~100)
const DEFAULT_WEIGHTS: UserWeights = {
  genre: 25,
  director: 12,
  actor: 8,
  keyword: 12,
  popularity: 18,
  recency: 8,
  runtime: 5,
  era: 5
};

// Configuration constants
const MIN_VOTE_COUNT = 100;
const HIDDEN_GEM_MIN_VOTES = 100;
const HIDDEN_GEM_MAX_VOTES = 2000;
const HIDDEN_GEM_MIN_RATING = 7.5;
const EXPLORATION_RATIO = 0.2; // 20% of recommendations
const ENRICHMENT_LIMIT = 50;
const ENRICHMENT_BATCH_SIZE = 10;
const RECENTLY_SHOWN_DAYS = 7;
const RECENTLY_SHOWN_PENALTY = 0.3; // 30% penalty

// Helper: Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper: Get decade from release date
function getDecade(releaseDate: string | null | undefined): string | null {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.split('-')[0]);
  if (isNaN(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

// Helper: Get runtime bucket
type RuntimeBucket = 'short' | 'medium' | 'long' | 'epic';
function getRuntimeBucket(runtime: number): RuntimeBucket {
  if (runtime < 90) return 'short';
  if (runtime < 120) return 'medium';
  if (runtime < 150) return 'long';
  return 'epic';
}

// Helper: Check if buckets are adjacent
function isAdjacentBucket(a: RuntimeBucket, b: RuntimeBucket): boolean {
  const order: RuntimeBucket[] = ['short', 'medium', 'long', 'epic'];
  return Math.abs(order.indexOf(a) - order.indexOf(b)) === 1;
}

class RecommendationService {
  /**
   * Get or calculate personalized weights for a user
   */
  private async getUserWeights(userId: string): Promise<UserWeights> {
    const storedWeights = await prisma.userPreferenceWeights.findUnique({
      where: { userId }
    });

    if (storedWeights) {
      return {
        genre: storedWeights.genreWeight * DEFAULT_WEIGHTS.genre,
        director: storedWeights.directorWeight * DEFAULT_WEIGHTS.director,
        actor: storedWeights.actorWeight * DEFAULT_WEIGHTS.actor,
        keyword: storedWeights.keywordWeight * DEFAULT_WEIGHTS.keyword,
        popularity: storedWeights.popularityWeight * DEFAULT_WEIGHTS.popularity,
        recency: storedWeights.recencyWeight * DEFAULT_WEIGHTS.recency,
        runtime: storedWeights.runtimeWeight * DEFAULT_WEIGHTS.runtime,
        era: storedWeights.eraWeight * DEFAULT_WEIGHTS.era
      };
    }

    return DEFAULT_WEIGHTS;
  }

  /**
   * Get recently shown recommendation IDs to avoid repetition
   */
  private async getRecentlyShownIds(userId: string): Promise<Set<number>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENTLY_SHOWN_DAYS);

    const recent = await prisma.recommendationHistory.findMany({
      where: {
        userId,
        shownAt: { gte: cutoff }
      },
      select: { tmdbId: true }
    });

    return new Set(recent.map((r: { tmdbId: number }) => r.tmdbId));
  }

  /**
   * Record shown recommendations for anti-repetition
   */
  async recordShownRecommendations(userId: string, tmdbIds: number[]): Promise<void> {
    const now = new Date();

    await Promise.all(
      tmdbIds.map(tmdbId =>
        prisma.recommendationHistory.upsert({
          where: { userId_tmdbId: { userId, tmdbId } },
          update: { shownAt: now },
          create: { userId, tmdbId, shownAt: now }
        })
      )
    );
  }

  /**
   * Enrich candidate movies with full details (director, cast, keywords, collection, production companies)
   */
  private async enrichMoviesWithDetails(movies: TMDBMovie[]): Promise<TMDBMovie[]> {
    const enrichedMovies: TMDBMovie[] = [];
    const moviesToFetch: TMDBMovie[] = [];

    // Check database cache for existing movie details
    const tmdbIds = movies.map(m => m.id);
    const cachedMovies = await prisma.movie.findMany({
      where: { tmdbId: { in: tmdbIds } }
    });

    const cacheMap = new Map(cachedMovies.map(m => [m.tmdbId, m]));

    for (const movie of movies) {
      const cached = cacheMap.get(movie.id);
      if (cached?.director || cached?.cast) {
        enrichedMovies.push({
          ...movie,
          director: cached.director || undefined,
          cast: (cached.cast as unknown as { id: number; name: string }[]) || undefined,
          keywords: (cached.keywords as unknown as TMDBKeyword[]) || undefined,
          belongs_to_collection: cached.collectionId
            ? { id: cached.collectionId, name: cached.collectionName || '', poster_path: null, backdrop_path: null }
            : null,
          production_companies: (cached.productionCompanies as unknown as any[]) || undefined
        });
      } else {
        moviesToFetch.push(movie);
      }
    }

    // Fetch remaining movies from TMDB in batches
    for (let i = 0; i < moviesToFetch.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = moviesToFetch.slice(i, i + ENRICHMENT_BATCH_SIZE);
      const detailsPromises = batch.map(movie =>
        tmdbService.getEnhancedMovieDetails(movie.id)
          .then(details => {
            const director = details.credits?.crew.find(c => c.job === 'Director')?.name;
            const cast = details.credits?.cast.slice(0, 10).map(a => ({ id: a.id, name: a.name }));
            return {
              ...movie,
              director,
              cast,
              keywords: details.keywords,
              belongs_to_collection: details.belongs_to_collection,
              production_companies: details.production_companies
            };
          })
          .catch(() => movie) // Keep original if fetch fails
      );

      const batchResults = await Promise.all(detailsPromises);
      enrichedMovies.push(...batchResults);
    }

    return enrichedMovies;
  }

  /**
   * Generate exploration recommendations from unexplored genres
   */
  private async generateExplorationRecommendations(
    _userId: string,
    preferences: EnhancedUserPreferences,
    excludeIds: Set<number>,
    count: number
  ): Promise<ScoredMovie[]> {
    // Get all genres
    const allGenres = await tmdbService.getGenreList();

    // Find genres user hasn't rated many movies in
    const ratedGenreIds = new Set(preferences.preferredGenres.map(g => g.id));
    const explorationGenres = allGenres.filter(g => !ratedGenreIds.has(g.id));

    if (explorationGenres.length === 0) return [];

    // Pick random exploration genres
    const selectedGenres = shuffleArray(explorationGenres).slice(0, 2);

    // Fetch highly-rated movies from these genres
    const explorationCandidates = await tmdbService.discoverMovies({
      with_genres: selectedGenres.map(g => g.id).join(','),
      sort_by: 'vote_average.desc',
      'vote_count.gte': 1000, // Higher threshold for exploration
      'vote_average.gte': 8.0
    });

    return explorationCandidates.results
      .filter(m => !excludeIds.has(m.id))
      .slice(0, count)
      .map(movie => ({
        ...movie,
        score: 60, // Moderate score for exploration
        reasons: [`Expand your horizons: highly rated ${selectedGenres[0]?.name || 'movie'}`],
        isExploration: true
      }));
  }

  /**
   * Generate hidden gems recommendations (high quality, lower popularity)
   */
  private async generateHiddenGems(
    preferences: EnhancedUserPreferences,
    excludeIds: Set<number>,
    count: number
  ): Promise<ScoredMovie[]> {
    const topGenres = preferences.preferredGenres.slice(0, 3).map(g => g.id);

    if (topGenres.length === 0) return [];

    const hiddenGems = await tmdbService.discoverMovies({
      with_genres: topGenres.join(','),
      sort_by: 'vote_average.desc',
      'vote_count.gte': HIDDEN_GEM_MIN_VOTES,
      'vote_count.lte': HIDDEN_GEM_MAX_VOTES,
      'vote_average.gte': HIDDEN_GEM_MIN_RATING
    });

    return hiddenGems.results
      .filter(m => !excludeIds.has(m.id))
      .slice(0, count)
      .map(movie => ({
        ...movie,
        score: 65, // Slightly above average
        reasons: ['Hidden gem you might love'],
        isHiddenGem: true
      }));
  }

  /**
   * Main recommendation generation with enhanced scoring
   */
  async generateRecommendations(
    userId: string,
    limit: number = 20,
    page: number = 1,
    mood?: Mood
  ): Promise<ScoredMovie[]> {
    // Get enhanced user preferences
    const preferences = await userPreferencesService.getEnhancedUserPreferences(userId);

    // Get personalized weights
    const weights = await this.getUserWeights(userId);

    // Get recently shown recommendations
    const recentlyShownIds = await this.getRecentlyShownIds(userId);

    // Get user's already rated movies (to exclude)
    const ratedMovies = await prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true }
    });

    const ratedTmdbIds = new Set(ratedMovies.map(um => um.movie.tmdbId));

    // Get movies from watchlist (to exclude)
    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: { movie: true }
    });

    const watchlistTmdbIds = new Set(watchlist.map(w => w.movie.tmdbId));

    // Combined exclusion set
    const excludeIds = new Set([...ratedTmdbIds, ...watchlistTmdbIds]);

    // Collect candidate movies
    const candidateMovies: TMDBMovie[] = [];
    const seenIds = new Set<number>();

    // Apply mood filter to genre discovery if specified
    const moodGenres = mood ? MOOD_GENRE_MAPPING[mood] : null;

    // 1. Get recommendations based on user's top liked movies (parallel requests)
    const topLikedMovies = ratedMovies
      .filter(um => um.rating === 'SUPER_LIKE' || um.rating === 'LIKE')
      .slice(0, 5);

    const similarMoviesPromises = topLikedMovies.map(userMovie =>
      tmdbService.getSimilarMovies(userMovie.movie.tmdbId, page)
        .catch(error => {
          console.error(`Error getting similar movies for ${userMovie.movie.tmdbId}:`, error);
          return { results: [] as TMDBMovie[] };
        })
    );

    const similarMoviesResults = await Promise.all(similarMoviesPromises);

    for (const similar of similarMoviesResults) {
      similar.results.forEach(movie => {
        // Apply mood filter if specified
        if (moodGenres && !movie.genre_ids?.some(g => moodGenres.includes(g))) {
          return;
        }

        if (!seenIds.has(movie.id) && !excludeIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
          candidateMovies.push(movie);
          seenIds.add(movie.id);
        }
      });
    }

    // 2. Discover movies by preferred genres (or mood genres)
    const genresToDiscover = moodGenres
      ? moodGenres
      : preferences.preferredGenres.slice(0, 3).map(g => g.id);

    if (genresToDiscover.length > 0) {
      try {
        const discovered = await tmdbService.discoverMovies({
          with_genres: genresToDiscover.join(','),
          sort_by: 'popularity.desc',
          'vote_count.gte': MIN_VOTE_COUNT,
          page
        });

        discovered.results.forEach(movie => {
          if (!seenIds.has(movie.id) && !excludeIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
            candidateMovies.push(movie);
            seenIds.add(movie.id);
          }
        });
      } catch (error) {
        console.error('Error discovering movies by genre:', error);
      }
    }

    // 3. Get popular movies as fallback
    if (candidateMovies.length < 20) {
      try {
        const popular = await tmdbService.getPopularMovies(page);
        popular.results.forEach(movie => {
          if (moodGenres && !movie.genre_ids?.some(g => moodGenres.includes(g))) {
            return;
          }

          if (!seenIds.has(movie.id) && !excludeIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
            candidateMovies.push(movie);
            seenIds.add(movie.id);
          }
        });
      } catch (error) {
        console.error('Error getting popular movies:', error);
      }
    }

    // Enrich top candidates with full details
    const candidatesToEnrich = candidateMovies.slice(0, ENRICHMENT_LIMIT);
    const remainingCandidates = candidateMovies.slice(ENRICHMENT_LIMIT);
    const enrichedCandidates = await this.enrichMoviesWithDetails(candidatesToEnrich);

    // Score all candidates
    const allCandidates = [...enrichedCandidates, ...remainingCandidates];
    let scoredMovies = allCandidates.map(movie =>
      this.scoreMovie(movie, preferences, weights, recentlyShownIds)
    );

    // Calculate exploration and hidden gems slots
    const explorationCount = Math.floor(limit * EXPLORATION_RATIO);
    const hiddenGemCount = Math.floor(limit * 0.1); // 10% hidden gems
    const mainCount = limit - explorationCount - hiddenGemCount;

    // Get main recommendations (exploitation)
    const mainRecommendations = scoredMovies
      .sort((a, b) => b.score - a.score)
      .slice(0, mainCount);

    // Add exploration recommendations (if not in mood mode)
    let explorationRecs: ScoredMovie[] = [];
    if (!mood) {
      const mainIds = new Set(mainRecommendations.map(m => m.id));
      explorationRecs = await this.generateExplorationRecommendations(
        userId,
        preferences,
        new Set([...excludeIds, ...mainIds]),
        explorationCount
      );
    }

    // Add hidden gems
    const usedIds = new Set([
      ...mainRecommendations.map(m => m.id),
      ...explorationRecs.map(m => m.id)
    ]);
    const hiddenGems = await this.generateHiddenGems(
      preferences,
      new Set([...excludeIds, ...usedIds]),
      hiddenGemCount
    );

    // Combine and interleave results
    const finalResults: ScoredMovie[] = [];
    const explorationIterator = explorationRecs[Symbol.iterator]();
    const hiddenGemIterator = hiddenGems[Symbol.iterator]();

    // Interleave: every 5th item is exploration, every 10th is hidden gem
    for (let i = 0; i < mainRecommendations.length; i++) {
      finalResults.push(mainRecommendations[i]);

      if ((finalResults.length % 5) === 0) {
        const exploration = explorationIterator.next();
        if (!exploration.done) {
          finalResults.push(exploration.value);
        }
      }

      if ((finalResults.length % 10) === 0) {
        const gem = hiddenGemIterator.next();
        if (!gem.done) {
          finalResults.push(gem.value);
        }
      }
    }

    // Add remaining exploration and hidden gems
    let item = explorationIterator.next();
    while (!item.done) {
      finalResults.push(item.value);
      item = explorationIterator.next();
    }

    item = hiddenGemIterator.next();
    while (!item.done) {
      finalResults.push(item.value);
      item = hiddenGemIterator.next();
    }

    const result = finalResults.slice(0, limit);

    // Record shown recommendations for anti-repetition
    await this.recordShownRecommendations(userId, result.map(m => m.id));

    return result;
  }

  /**
   * Enhanced movie scoring with all signals
   */
  private scoreMovie(
    movie: TMDBMovie,
    preferences: EnhancedUserPreferences,
    weights: UserWeights,
    recentlyShownIds: Set<number>
  ): ScoredMovie {
    let score = 0;
    const reasons: string[] = [];

    // ===== GENRE MATCHING =====
    const movieGenreIds = movie.genre_ids || [];
    const preferredGenreIds = preferences.preferredGenres.map(g => g.id);
    const dislikedGenreIds = preferences.dislikedGenres.map(g => g.id);

    const matchingGenres = movieGenreIds.filter(id => preferredGenreIds.includes(id));
    const hasDislikedGenre = movieGenreIds.some(id => dislikedGenreIds.includes(id));

    if (matchingGenres.length > 0 && preferredGenreIds.length > 0) {
      // Weight by genre confidence/avgRating
      let genreScore = 0;
      for (const genreId of matchingGenres) {
        const genrePref = preferences.preferredGenres.find(g => g.id === genreId);
        if (genrePref) {
          genreScore += (genrePref.avgRating / 4) * (genrePref.confidence + 0.2);
        }
      }
      score += Math.min(genreScore * weights.genre, weights.genre * 2);

      // Get genre names, using fallback lookup if name is missing
      const genreNames = matchingGenres
        .map(id => {
          const pref = preferences.preferredGenres.find(g => g.id === id);
          return pref?.name || GENRE_NAMES[id] || null;
        })
        .filter((name): name is string => name !== null && name !== undefined);

      if (genreNames.length > 0) {
        reasons.push(`Matches your favorite genres: ${genreNames.slice(0, 2).join(', ')}`);
      }
    }

    // ===== KEYWORD MATCHING =====
    if (movie.keywords && preferences.preferredKeywords.length > 0) {
      const movieKeywordIds = new Set((movie.keywords as TMDBKeyword[]).map(k => k.id));
      const matchingKeywords = preferences.preferredKeywords
        .filter(k => movieKeywordIds.has(k.id));

      if (matchingKeywords.length > 0) {
        let keywordScore = 0;
        for (const kw of matchingKeywords) {
          keywordScore += Math.min(kw.count, 5); // Cap individual keyword contribution
        }
        score += Math.min(keywordScore, weights.keyword);

        if (matchingKeywords.length >= 2) {
          reasons.push(`Themes you enjoy: ${matchingKeywords.slice(0, 2).map(k => k.name).join(', ')}`);
        }
      }
    }

    // ===== DIRECTOR MATCHING =====
    if (movie.director && preferences.likedDirectors.length > 0) {
      const directorMatch = preferences.likedDirectors.find(
        d => d.name.toLowerCase() === movie.director!.toLowerCase()
      );
      if (directorMatch) {
        // Higher score for directors with more liked films and higher avg rating
        const directorScore = Math.min(
          (directorMatch.count * 3) * (directorMatch.avgRating / 4),
          weights.director
        );
        score += directorScore;
        reasons.push(`From ${movie.director}`);
      }
    }

    // ===== ACTOR MATCHING =====
    if (movie.cast && movie.cast.length > 0 && preferences.likedActors.length > 0) {
      const likedActorIds = new Set(preferences.likedActors.map(a => a.id));
      const matchingActors = movie.cast.slice(0, 5).filter(a => likedActorIds.has(a.id));

      if (matchingActors.length > 0) {
        let actorScore = 0;
        for (const actor of matchingActors) {
          const actorPref = preferences.likedActors.find(a => a.id === actor.id);
          if (actorPref) {
            actorScore += (actorPref.avgRating / 4) * Math.min(actorPref.count, 5);
          }
        }
        score += Math.min(actorScore, weights.actor);
        reasons.push(`With ${matchingActors.slice(0, 2).map(a => a.name).join(', ')}`);
      }
    }

    // ===== FRANCHISE/COLLECTION MATCHING =====
    if (movie.belongs_to_collection && preferences.likedCollections.length > 0) {
      const collectionMatch = preferences.likedCollections.find(
        c => c.id === movie.belongs_to_collection!.id
      );
      if (collectionMatch) {
        const collectionScore = Math.min(collectionMatch.count * 5, 15);
        score += collectionScore;
        reasons.push(`Part of ${movie.belongs_to_collection.name}`);
      }
    }

    // ===== PRODUCTION COMPANY MATCHING =====
    if (movie.production_companies && preferences.likedProductionCompanies.length > 0) {
      const movieCompanyIds = new Set(movie.production_companies.map(c => c.id));
      const matchingCompany = preferences.likedProductionCompanies.find(
        c => movieCompanyIds.has(c.id)
      );

      if (matchingCompany) {
        const companyScore = Math.min(
          (matchingCompany.avgRating / 4) * matchingCompany.count * 2,
          10
        );
        score += companyScore;
        reasons.push(`From ${matchingCompany.name}`);
      }
    }

    // ===== ERA/DECADE MATCHING =====
    const movieDecade = getDecade(movie.release_date);
    if (movieDecade && preferences.preferredEras.length > 0) {
      const eraPref = preferences.preferredEras.find(e => e.decade === movieDecade);
      if (eraPref) {
        const eraScore = (eraPref.avgRating / 4) * Math.min(eraPref.count / 5, 1) * weights.era;
        score += eraScore;
      }
    }

    // ===== RUNTIME MATCHING =====
    // Note: Runtime may not be available for all movies without enrichment
    // This would need the movie to be enriched with runtime data
    if (preferences.preferredRuntime && (movie as any).runtime) {
      const movieRuntime = (movie as any).runtime;
      const bucket = getRuntimeBucket(movieRuntime);

      if (bucket === preferences.preferredRuntime.bucket) {
        score += weights.runtime;
      } else if (isAdjacentBucket(bucket, preferences.preferredRuntime.bucket)) {
        score += weights.runtime * 0.5;
      }
    }

    // ===== POPULARITY/RATING =====
    const popularityScore = (movie.vote_average / 10) * weights.popularity;
    score += popularityScore;

    if (movie.vote_average >= 7.5) {
      reasons.push(`Highly rated (${movie.vote_average.toFixed(1)}/10)`);
    }

    // ===== VOTE COUNT (reliability) =====
    const voteCountScore = Math.min(movie.vote_count / 5000, 1) * 5;
    score += voteCountScore;

    // ===== RECENCY =====
    const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - releaseYear;

    if (yearDiff <= 1) {
      score += weights.recency * 1.5;
      reasons.push('New release');
    } else if (yearDiff <= 3) {
      score += weights.recency;
      reasons.push('Recent release');
    } else if (yearDiff <= 10) {
      score += weights.recency * 0.5;
    }

    // ===== PENALTIES =====

    // Disliked genre penalty
    if (hasDislikedGenre) {
      score *= 0.5;
    }

    // Recently shown penalty
    if (recentlyShownIds.has(movie.id)) {
      score *= (1 - RECENTLY_SHOWN_PENALTY);
    }

    // Rating style adjustment
    if (preferences.ratingStyle === 'critical') {
      // For critical raters, boost highly-rated films more
      if (movie.vote_average >= 8.0) {
        score *= 1.1;
      }
    } else if (preferences.ratingStyle === 'generous') {
      // For generous raters, emphasize match quality over raw ratings
      // (already handled by genre/director/actor matching being weighted)
    }

    // Default reason if none
    if (reasons.length === 0) {
      reasons.push('Popular and well-rated');
    }

    return {
      ...movie,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      reasons
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  async generateRecommendationsLegacy(userId: string, limit: number = 20, page: number = 1): Promise<ScoredMovie[]> {
    return this.generateRecommendations(userId, limit, page);
  }
}

export default new RecommendationService();
