import prisma from '../config/database';
import tmdbService, { TMDBMovie } from './tmdb';
import userPreferencesService from './userPreferences';

interface ScoredMovie extends TMDBMovie {
  score: number;
  reasons: string[];
}

class RecommendationService {
  async generateRecommendations(userId: string, limit: number = 20): Promise<ScoredMovie[]> {
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

    // 1. Get recommendations based on user's top liked movies
    const topLikedMovies = ratedMovies
      .filter(um => um.rating === 'SUPER_LIKE' || um.rating === 'LIKE')
      .slice(0, 5);

    for (const userMovie of topLikedMovies) {
      try {
        const similar = await tmdbService.getSimilarMovies(userMovie.movie.tmdbId, 1);
        similar.results.forEach(movie => {
          if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id)) {
            candidateMovies.push(movie);
            seenIds.add(movie.id);
          }
        });
      } catch (error) {
        console.error(`Error getting similar movies for ${userMovie.movie.tmdbId}:`, error);
      }
    }

    // 2. Discover movies by preferred genres
    if (preferences.preferredGenres.length > 0) {
      const topGenres = preferences.preferredGenres.slice(0, 3).map(g => g.id).join(',');
      try {
        const discovered = await tmdbService.discoverMovies({
          with_genres: topGenres,
          sort_by: 'vote_average.desc',
          page: 1
        });

        discovered.results.forEach(movie => {
          if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id)) {
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
        const popular = await tmdbService.getPopularMovies(1);
        popular.results.forEach(movie => {
          if (!seenIds.has(movie.id) && !ratedTmdbIds.has(movie.id) && !watchlistTmdbIds.has(movie.id)) {
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

    // Sort by score and return top N
    return scoredMovies
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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

    // Vote count consideration (20% weight)
    const voteCountScore = Math.min(movie.vote_count / 1000, 1) * 20;
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
