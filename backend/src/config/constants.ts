/**
 * Centralized configuration constants for the application
 *
 * This file consolidates constants that were previously scattered across
 * multiple files (discover.ts, recommendation.ts, weightLearning.ts)
 */

// =============================================================================
// TMDB Configuration
// =============================================================================

export const TMDB = {
  /** Minimum vote count for standard discovery */
  MIN_VOTE_COUNT: 100,

  /** Minimum vote count for top-rated filter (higher quality threshold) */
  MIN_VOTE_COUNT_TOP_RATED: 500,

  /** Minimum vote count for new releases (more lenient) */
  MIN_VOTE_COUNT_NEW: 50,

  /** Minimum vote count for anime/cartoons (typically fewer votes) */
  MIN_VOTE_COUNT_ANIME: 10,

  /** Animation genre ID in TMDB */
  ANIMATION_GENRE_ID: 16,

  /** Cache duration in days */
  CACHE_DAYS: 30,

  /** Maximum pages for pagination (TMDB limit) */
  MAX_PAGES: 500
} as const;

// =============================================================================
// Recommendation Engine Configuration
// =============================================================================

export const RECOMMENDATION = {
  /** Minimum votes for hidden gem detection */
  HIDDEN_GEM_MIN_VOTES: 100,

  /** Maximum votes for hidden gem (too popular = not hidden) */
  HIDDEN_GEM_MAX_VOTES: 2000,

  /** Minimum rating for hidden gem */
  HIDDEN_GEM_MIN_RATING: 7.5,

  /** Percentage of recommendations that should be exploration (new genres) */
  EXPLORATION_RATIO: 0.2,

  /** Maximum movies to enrich with full details per request */
  ENRICHMENT_LIMIT: 50,

  /** Batch size for parallel TMDB API calls */
  ENRICHMENT_BATCH_SIZE: 10,

  /** Days to consider for "recently shown" penalty */
  RECENTLY_SHOWN_DAYS: 7,

  /** Score penalty for recently shown movies (0.3 = 30% penalty) */
  RECENTLY_SHOWN_PENALTY: 0.3
} as const;

// =============================================================================
// Weight Learning Configuration
// =============================================================================

export const WEIGHT_LEARNING = {
  /** Minimum ratings before personalized weights are calculated */
  MIN_RATINGS_FOR_LEARNING: 10,

  /** Recalculate weights after this many new ratings */
  RECALC_THRESHOLD: 5,

  /** Minimum weight multiplier */
  MIN_WEIGHT: 0.5,

  /** Maximum weight multiplier */
  MAX_WEIGHT: 2.0,

  /** Debounce time in ms for weight recalculation */
  DEBOUNCE_MS: 5000
} as const;

// =============================================================================
// Default Scoring Weights
// =============================================================================

/**
 * Default weight distribution for recommendation scoring
 * Weights sum to approximately 100 for percentage-based scoring
 */
export const DEFAULT_WEIGHTS = {
  genre: 25,
  director: 12,
  actor: 8,
  keyword: 12,
  popularity: 18,
  recency: 8,
  runtime: 5,
  era: 5
} as const;

// =============================================================================
// Genre Mappings
// =============================================================================

/**
 * Mood to genre ID mapping for mood-based recommendations
 */
export const MOOD_GENRE_MAPPING = {
  exciting: [28, 12, 53, 878],      // Action, Adventure, Thriller, Sci-Fi
  relaxing: [35, 10751, 14],        // Comedy, Family, Fantasy
  thoughtful: [18, 36, 99],         // Drama, History, Documentary
  funny: [35, 10402],               // Comedy, Music
  scary: [27, 53, 9648],            // Horror, Thriller, Mystery
  romantic: [10749, 18]             // Romance, Drama
} as const;

export type Mood = keyof typeof MOOD_GENRE_MAPPING;

/**
 * TMDB genre ID to name mapping (fallback when API unavailable)
 */
export const GENRE_NAMES: Record<number, string> = {
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
} as const;

// =============================================================================
// Valid Enum Values (for validation)
// =============================================================================

export const VALID_CATEGORIES = ['for_you', 'popular', 'new_releases', 'top_rated'] as const;
export type DiscoverCategory = typeof VALID_CATEGORIES[number];

export const VALID_STYLES = ['all', 'movies', 'anime', 'cartoons'] as const;
export type MovieStyle = typeof VALID_STYLES[number];

// =============================================================================
// API Rate Limiting
// =============================================================================

export const RATE_LIMITS = {
  /** General API rate limit (requests per window) */
  GENERAL_LIMIT: 100,

  /** Authentication endpoint rate limit */
  AUTH_LIMIT: 10,

  /** Rate limit window in minutes */
  WINDOW_MINUTES: 15
} as const;
