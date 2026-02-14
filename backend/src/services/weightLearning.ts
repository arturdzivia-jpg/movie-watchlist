import prisma from '../config/database';
import { Rating } from '@prisma/client';
import { WEIGHT_LEARNING } from '../config/constants';

interface WeightMultipliers {
  genreWeight: number;
  directorWeight: number;
  actorWeight: number;
  keywordWeight: number;
  popularityWeight: number;
  recencyWeight: number;
  runtimeWeight: number;
  eraWeight: number;
}

// Use centralized constants
const {
  MIN_RATINGS_FOR_LEARNING,
  RECALC_THRESHOLD,
  MIN_WEIGHT,
  MAX_WEIGHT,
  DEBOUNCE_MS
} = WEIGHT_LEARNING;

// Convert rating to numeric value
function ratingToValue(rating: Rating): number {
  switch (rating) {
    case Rating.SUPER_LIKE: return 4;
    case Rating.LIKE: return 3;
    case Rating.OK: return 2;
    case Rating.DISLIKE: return 1;
    case Rating.NOT_INTERESTED: return 0;
    default: return 2;
  }
}

// Calculate correlation between a signal and positive ratings
function calculateSignalCorrelation(
  likedMovies: any[],
  dislikedMovies: any[],
  extractSignal: (movie: any) => Set<string | number>
): number {
  if (likedMovies.length < 3) return 1.0; // Not enough data

  // Extract signals from liked movies
  const likedSignals = new Map<string | number, number>();
  likedMovies.forEach(m => {
    const signals = extractSignal(m.movie);
    signals.forEach(s => {
      likedSignals.set(s, (likedSignals.get(s) || 0) + 1);
    });
  });

  // Get top signals from liked movies
  const topSignals = new Set(
    [...likedSignals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k)
  );

  if (topSignals.size === 0) return 1.0;

  // Calculate hit rate in liked vs disliked
  const hitInLiked = likedMovies.filter(m => {
    const signals = extractSignal(m.movie);
    return [...signals].some(s => topSignals.has(s));
  }).length / likedMovies.length;

  const hitInDisliked = dislikedMovies.length > 0
    ? dislikedMovies.filter(m => {
        const signals = extractSignal(m.movie);
        return [...signals].some(s => topSignals.has(s));
      }).length / dislikedMovies.length
    : 0;

  // Correlation: high hit in liked, low hit in disliked = good predictor
  const correlation = hitInLiked - hitInDisliked;

  // Convert to weight multiplier (0.5 to 2.0)
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, 1.0 + correlation));
}

// Calculate popularity correlation
function calculatePopularityCorrelation(allMovies: any[]): number {
  if (allMovies.length < 5) return 1.0;

  // Check if user prefers highly-rated movies
  const moviesWithRatings = allMovies.filter(m => m.movie.genres); // Has data

  if (moviesWithRatings.length < 5) return 1.0;

  // Calculate average TMDB rating for liked vs disliked
  const liked = moviesWithRatings.filter(m =>
    m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
  );
  const disliked = moviesWithRatings.filter(m => m.rating === Rating.DISLIKE);

  if (liked.length < 2) return 1.0;

  // This is a placeholder - we'd need vote_average stored in DB
  // For now, return neutral weight
  return 1.0;
}

// Calculate recency correlation
function calculateRecencyCorrelation(allMovies: any[]): number {
  if (allMovies.length < 5) return 1.0;

  const currentYear = new Date().getFullYear();

  const liked = allMovies.filter(m =>
    m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
  );

  if (liked.length < 3) return 1.0;

  // Calculate average age of liked movies
  let totalAge = 0;
  let count = 0;
  liked.forEach(m => {
    if (m.movie.releaseDate) {
      const year = parseInt(m.movie.releaseDate.split('-')[0]);
      if (!isNaN(year)) {
        totalAge += currentYear - year;
        count++;
      }
    }
  });

  if (count === 0) return 1.0;

  const avgAge = totalAge / count;

  // If user likes newer movies (avg age < 10), boost recency weight
  // If user likes classics (avg age > 20), reduce recency weight
  if (avgAge < 5) return 1.5;
  if (avgAge < 10) return 1.2;
  if (avgAge > 30) return 0.6;
  if (avgAge > 20) return 0.8;
  return 1.0;
}

class WeightLearningService {
  /**
   * Pending weight update timers (debounce map)
   * Prevents multiple rapid ratings from triggering overlapping calculations
   */
  private pendingUpdates = new Map<string, NodeJS.Timeout>();

  /**
   * Calculate and store personalized weights for a user
   */
  async calculateUserWeights(userId: string): Promise<WeightMultipliers> {
    const allMovies = await prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true }
    });

    if (allMovies.length < MIN_RATINGS_FOR_LEARNING) {
      // Return default weights if not enough data
      return this.getDefaultWeights();
    }

    const likedMovies = allMovies.filter(m =>
      m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
    );
    const dislikedMovies = allMovies.filter(m => m.rating === Rating.DISLIKE);

    // Calculate correlation for each signal

    // Genre correlation
    const genreWeight = calculateSignalCorrelation(
      likedMovies,
      dislikedMovies,
      (movie) => {
        const genres = movie.genres as any[];
        return new Set(Array.isArray(genres) ? genres.map((g: any) => g.id) : []);
      }
    );

    // Director correlation
    const directorWeight = calculateSignalCorrelation(
      likedMovies,
      dislikedMovies,
      (movie) => new Set(movie.director ? [movie.director.toLowerCase()] : [])
    );

    // Actor correlation
    const actorWeight = calculateSignalCorrelation(
      likedMovies,
      dislikedMovies,
      (movie) => {
        const cast = movie.cast as any[];
        return new Set(Array.isArray(cast) ? cast.slice(0, 5).map((a: any) => a.id) : []);
      }
    );

    // Keyword correlation
    const keywordWeight = calculateSignalCorrelation(
      likedMovies,
      dislikedMovies,
      (movie) => {
        const keywords = movie.keywords as any[];
        return new Set(Array.isArray(keywords) ? keywords.map((k: any) => k.id) : []);
      }
    );

    // Popularity correlation
    const popularityWeight = calculatePopularityCorrelation(allMovies);

    // Recency correlation
    const recencyWeight = calculateRecencyCorrelation(allMovies);

    // Runtime correlation (based on preferred runtime bucket)
    const runtimeWeight = this.calculateRuntimeCorrelation(allMovies);

    // Era correlation
    const eraWeight = this.calculateEraCorrelation(allMovies);

    const weights: WeightMultipliers = {
      genreWeight,
      directorWeight,
      actorWeight,
      keywordWeight,
      popularityWeight,
      recencyWeight,
      runtimeWeight,
      eraWeight
    };

    // Store weights in database
    await prisma.userPreferenceWeights.upsert({
      where: { userId },
      update: {
        ...weights,
        lastCalculated: new Date(),
        ratingCount: 0 // Reset counter
      },
      create: {
        userId,
        ...weights,
        ratingCount: 0
      }
    });

    return weights;
  }

  /**
   * Calculate runtime correlation
   */
  private calculateRuntimeCorrelation(allMovies: any[]): number {
    const liked = allMovies.filter(m =>
      m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
    );

    if (liked.length < 3) return 1.0;

    // Check if user has consistent runtime preferences
    const runtimes = liked
      .map(m => m.movie.runtime)
      .filter((r): r is number => r !== null && r !== undefined);

    if (runtimes.length < 3) return 1.0;

    // Calculate standard deviation
    const mean = runtimes.reduce((a, b) => a + b, 0) / runtimes.length;
    const variance = runtimes.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / runtimes.length;
    const stdDev = Math.sqrt(variance);

    // Low stdDev = consistent preference = higher weight
    if (stdDev < 15) return 1.5; // Very consistent
    if (stdDev < 25) return 1.2; // Somewhat consistent
    if (stdDev > 40) return 0.7; // Very varied
    return 1.0;
  }

  /**
   * Calculate era correlation
   */
  private calculateEraCorrelation(allMovies: any[]): number {
    const liked = allMovies.filter(m =>
      m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
    );

    if (liked.length < 5) return 1.0;

    // Check if user has consistent era preferences
    const decades = liked
      .map(m => {
        const releaseDate = m.movie.releaseDate;
        if (!releaseDate) return null;
        const year = parseInt(releaseDate.split('-')[0]);
        if (isNaN(year)) return null;
        return Math.floor(year / 10) * 10;
      })
      .filter((d): d is number => d !== null);

    if (decades.length < 5) return 1.0;

    // Count unique decades
    const uniqueDecades = new Set(decades);

    // Fewer unique decades = more focused preference = higher weight
    if (uniqueDecades.size <= 2) return 1.5;
    if (uniqueDecades.size <= 3) return 1.2;
    if (uniqueDecades.size >= 6) return 0.8;
    return 1.0;
  }

  /**
   * Get default weights
   */
  getDefaultWeights(): WeightMultipliers {
    return {
      genreWeight: 1.0,
      directorWeight: 1.0,
      actorWeight: 1.0,
      keywordWeight: 1.0,
      popularityWeight: 1.0,
      recencyWeight: 1.0,
      runtimeWeight: 1.0,
      eraWeight: 1.0
    };
  }

  /**
   * Handle new rating with debounce
   * Prevents multiple rapid ratings from triggering overlapping calculations
   */
  async onNewRating(userId: string): Promise<void> {
    // Cancel any pending calculation for this user
    if (this.pendingUpdates.has(userId)) {
      clearTimeout(this.pendingUpdates.get(userId)!);
    }

    // Schedule new calculation with debounce
    const timeout = setTimeout(async () => {
      this.pendingUpdates.delete(userId);
      try {
        await this.processRatingUpdate(userId);
      } catch (error) {
        console.error(`Weight learning error for user ${userId}:`, error);
      }
    }, DEBOUNCE_MS);

    this.pendingUpdates.set(userId, timeout);
  }

  /**
   * Process the actual rating update (called after debounce)
   */
  private async processRatingUpdate(userId: string): Promise<void> {
    const weights = await prisma.userPreferenceWeights.findUnique({
      where: { userId }
    });

    if (!weights) {
      // First time - check if we have enough ratings
      const ratingCount = await prisma.userMovie.count({ where: { userId } });
      if (ratingCount >= MIN_RATINGS_FOR_LEARNING) {
        await this.calculateUserWeights(userId);
      }
      return;
    }

    const newCount = weights.ratingCount + 1;

    if (newCount >= RECALC_THRESHOLD) {
      // Recalculate weights
      await this.calculateUserWeights(userId);
    } else {
      // Just increment counter
      await prisma.userPreferenceWeights.update({
        where: { userId },
        data: { ratingCount: newCount }
      });
    }
  }

  /**
   * Clear pending updates (useful for testing or shutdown)
   */
  clearPendingUpdates(): void {
    for (const timeout of this.pendingUpdates.values()) {
      clearTimeout(timeout);
    }
    this.pendingUpdates.clear();
  }
}

export default new WeightLearningService();
