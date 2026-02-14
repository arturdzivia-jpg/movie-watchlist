import prisma from '../config/database';
import tmdbService, { TMDBMovie } from './tmdb';
import userPreferencesService, { UserPreferences } from './userPreferences';

interface ScoredMovie extends TMDBMovie {
  score: number;
  reasons: string[];
}

// Minimum vote count threshold to filter out obscure movies with unreliable ratings
const MIN_VOTE_COUNT = 100;

// Number of top candidates to enrich with full details (director/cast)
const ENRICHMENT_LIMIT = 50;

// Batch size for parallel detail fetching
const ENRICHMENT_BATCH_SIZE = 10;

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

class RecommendationService {
  /**
   * Enrich candidate movies with director and cast information.
   * Uses database cache when available, fetches from TMDB otherwise.
   */
  private async enrichMoviesWithDetails(movies: TMDBMovie[]): Promise<TMDBMovie[]> {
    const enrichedMovies: TMDBMovie[] = [];
    const moviesToFetch: TMDBMovie[] = [];

    // First, check database cache for existing movie details
    const tmdbIds = movies.map(m => m.id);
    const cachedMovies = await prisma.movie.findMany({
      where: { tmdbId: { in: tmdbIds } },
      select: { tmdbId: true, director: true, cast: true }
    });

    const cacheMap = new Map(cachedMovies.map(m => [m.tmdbId, m]));

    for (const movie of movies) {
      const cached = cacheMap.get(movie.id);
      if (cached?.director || cached?.cast) {
        enrichedMovies.push({
          ...movie,
          director: cached.director || undefined,
          cast: cached.cast as { id: number; name: string }[] || undefined
        });
      } else {
        moviesToFetch.push(movie);
      }
    }

    // Fetch remaining movies from TMDB in batches
    for (let i = 0; i < moviesToFetch.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = moviesToFetch.slice(i, i + ENRICHMENT_BATCH_SIZE);
      const detailsPromises = batch.map(movie =>
        tmdbService.getMovieDetails(movie.id)
          .then(details => {
            const director = details.credits?.crew.find(c => c.job === 'Director')?.name;
            const cast = details.credits?.cast.slice(0, 5).map(a => ({ id: a.id, name: a.name }));
            return { ...movie, director, cast };
          })
          .catch(() => movie) // Keep original if fetch fails
      );

      const batchResults = await Promise.all(detailsPromises);
      enrichedMovies.push(...batchResults);
    }

    return enrichedMovies;
  }

  async generateRecommendations(userId: string, limit: number = 20, page: number = 1): Promise<ScoredMovie[]> {
    // Get user preferences
    const preferences = await userPreferencesService.getUserPreferences(userId);

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

    // Collect candidate movies from multiple sources
    const candidateMovies: TMDBMovie[] = [];
    const seenIds = new Set<number>();

    // 1. Get recommendations based on user's top liked movies (parallel requests)
    const topLikedMovies = ratedMovies
      .filter(um => um.rating === 'SUPER_LIKE' || um.rating === 'LIKE')
      .slice(0, 5);

    // Fetch similar movies in parallel instead of sequentially
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
        if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
          candidateMovies.push(movie);
          seenIds.add(movie.id);
        }
      });
    }

    // 2. Discover movies by preferred genres
    if (preferences.preferredGenres.length > 0) {
      const topGenres = preferences.preferredGenres.slice(0, 3).map(g => g.id).join(',');
      try {
        const discovered = await tmdbService.discoverMovies({
          with_genres: topGenres,
          sort_by: 'popularity.desc',
          'vote_count.gte': MIN_VOTE_COUNT,
          page
        });

        discovered.results.forEach(movie => {
          if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
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
          if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id) && movie.vote_count >= MIN_VOTE_COUNT) {
            candidateMovies.push(movie);
            seenIds.add(movie.id);
          }
        });
      } catch (error) {
        console.error('Error getting popular movies:', error);
      }
    }

    // Enrich top candidates with director/cast details for better scoring
    const candidatesToEnrich = candidateMovies.slice(0, ENRICHMENT_LIMIT);
    const remainingCandidates = candidateMovies.slice(ENRICHMENT_LIMIT);
    const enrichedCandidates = await this.enrichMoviesWithDetails(candidatesToEnrich);

    // Score and rank candidates (enriched first, then remaining)
    const allCandidates = [...enrichedCandidates, ...remainingCandidates];
    const scoredMovies = allCandidates.map(movie => this.scoreMovie(movie, preferences));

    // Group movies into tiers by score, shuffle within each tier for variety
    const tier1 = scoredMovies.filter(m => m.score >= 70); // Top recommendations
    const tier2 = scoredMovies.filter(m => m.score >= 50 && m.score < 70); // Good matches
    const tier3 = scoredMovies.filter(m => m.score < 50); // Fallback options

    // Shuffle within tiers and concatenate
    const shuffledResults = [
      ...shuffleArray(tier1),
      ...shuffleArray(tier2),
      ...shuffleArray(tier3)
    ];

    return shuffledResults.slice(0, limit);
  }

  private scoreMovie(movie: TMDBMovie, preferences: UserPreferences): ScoredMovie {
    let score = 0;
    const reasons: string[] = [];

    // Genre matching (30% weight - reduced from 40%)
    const movieGenreIds = movie.genre_ids || [];
    const preferredGenreIds = preferences.preferredGenres.map(g => g.id);
    const dislikedGenreIds = preferences.dislikedGenres.map(g => g.id);

    const matchingGenres = movieGenreIds.filter((id: number) => preferredGenreIds.includes(id));
    const dislikedGenreMatches = movieGenreIds.filter((id: number) => dislikedGenreIds.includes(id));

    if (matchingGenres.length > 0) {
      const genreScore = (matchingGenres.length / Math.max(preferredGenreIds.length, 1)) * 30;
      score += genreScore;

      const genreNames = preferences.preferredGenres
        .filter(g => matchingGenres.includes(g.id))
        .map(g => g.name);

      if (genreNames.length > 0) {
        reasons.push(`Matches your favorite genres: ${genreNames.slice(0, 2).join(', ')}`);
      }
    }

    // Penalize if has disliked genres
    if (dislikedGenreMatches.length > 0) {
      score *= 0.5;
    }

    // Director matching (15% weight - NEW)
    if (movie.director && preferences.likedDirectors.length > 0) {
      const directorMatch = preferences.likedDirectors.find(
        d => d.name.toLowerCase() === movie.director!.toLowerCase()
      );
      if (directorMatch) {
        // More films liked from this director = higher bonus (capped at 15)
        const directorScore = Math.min(directorMatch.count * 5, 15);
        score += directorScore;
        reasons.push(`From ${movie.director}`);
      }
    }

    // Actor matching (10% weight - NEW)
    if (movie.cast && movie.cast.length > 0 && preferences.likedActors.length > 0) {
      const likedActorIds = new Set(preferences.likedActors.map(a => a.id));
      const matchingActors = movie.cast.slice(0, 5).filter(a => likedActorIds.has(a.id));
      if (matchingActors.length > 0) {
        // 2 points per matching actor, capped at 10
        const actorScore = Math.min(matchingActors.length * 2, 10);
        score += actorScore;
        reasons.push(`With ${matchingActors.slice(0, 2).map(a => a.name).join(', ')}`);
      }
    }

    // Popularity/Rating (25% weight - reduced from 30%)
    const popularityScore = (movie.vote_average / 10) * 25;
    score += popularityScore;

    if (movie.vote_average >= 7.5) {
      reasons.push(`Highly rated (${movie.vote_average.toFixed(1)}/10)`);
    }

    // Vote count consideration (10% weight - reduced from 20%)
    const voteCountScore = Math.min(movie.vote_count / 5000, 1) * 10;
    score += voteCountScore;

    // Recency bonus (10% weight - unchanged)
    const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - releaseYear;

    if (yearDiff <= 3) {
      score += 10;
      reasons.push('Recent release');
    } else if (yearDiff <= 10) {
      score += 5;
    }

    // Add default reason if no specific reasons
    if (reasons.length === 0) {
      reasons.push('Popular and well-rated');
    }

    return {
      ...movie,
      score,
      reasons
    };
  }
}

export default new RecommendationService();
