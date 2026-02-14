import prisma from '../config/database';
import tmdbService, { TMDBMovie } from './tmdb';
import userPreferencesService from './userPreferences';

interface ScoredMovie extends TMDBMovie {
  score: number;
  reasons: string[];
}

// Minimum vote count threshold to filter out obscure movies with unreliable ratings
const MIN_VOTE_COUNT = 100;

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

    // Score and rank candidates
    const scoredMovies = candidateMovies.map(movie => this.scoreMovie(movie, preferences));

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

  private scoreMovie(movie: TMDBMovie, preferences: any): ScoredMovie {
    let score = 0;
    const reasons: string[] = [];

    // Genre matching (40% weight)
    const movieGenreIds = movie.genre_ids || [];
    const preferredGenreIds = preferences.preferredGenres.map((g: any) => g.id);
    const dislikedGenreIds = preferences.dislikedGenres.map((g: any) => g.id);

    const matchingGenres = movieGenreIds.filter((id: number) => preferredGenreIds.includes(id));
    const dislikedGenreMatches = movieGenreIds.filter((id: number) => dislikedGenreIds.includes(id));

    if (matchingGenres.length > 0) {
      const genreScore = (matchingGenres.length / Math.max(preferredGenreIds.length, 1)) * 40;
      score += genreScore;

      const genreNames = preferences.preferredGenres
        .filter((g: any) => matchingGenres.includes(g.id))
        .map((g: any) => g.name);

      if (genreNames.length > 0) {
        reasons.push(`Matches your favorite genres: ${genreNames.slice(0, 2).join(', ')}`);
      }
    }

    // Penalize if has disliked genres
    if (dislikedGenreMatches.length > 0) {
      score *= 0.5;
    }

    // Popularity/Rating (30% weight)
    const popularityScore = (movie.vote_average / 10) * 30;
    score += popularityScore;

    if (movie.vote_average >= 7.5) {
      reasons.push(`Highly rated (${movie.vote_average.toFixed(1)}/10)`);
    }

    // Vote count consideration (20% weight) - higher cap for better differentiation
    const voteCountScore = Math.min(movie.vote_count / 5000, 1) * 20;
    score += voteCountScore;

    // Recency bonus (10% weight)
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
