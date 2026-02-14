import prisma from '../config/database';
import tmdbService, { TMDBMovieDetails, TMDBKeyword } from '../services/tmdb';
import { Movie, Prisma } from '@prisma/client';

/**
 * Options for caching movie details
 */
export interface CacheMovieOptions {
  /** Include keywords for recommendation engine (requires extra API call) */
  includeKeywords?: boolean;
  /** Force refresh even if cached data is fresh */
  forceRefresh?: boolean;
}

/**
 * Cast member structure stored in the database
 */
export interface CachedCastMember {
  id: number;
  name: string;
  character: string;
  profilePath?: string | null;
}

/**
 * Production company structure stored in the database
 */
export interface CachedProductionCompany {
  id: number;
  name: string;
}

/** Cache duration in milliseconds (30 days) */
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check if cached movie data needs to be refreshed
 * - Data older than 30 days
 * - Missing new fields (backdropPath, cast profilePath)
 */
function needsRefresh(movie: Movie | null): boolean {
  if (!movie) return true;

  const thirtyDaysAgo = new Date(Date.now() - CACHE_DURATION_MS);
  if (movie.lastUpdated < thirtyDaysAgo) return true;

  // Check if missing new fields
  if (movie.backdropPath === null) return true;

  // Check if cast is missing profilePath
  const cast = movie.cast as CachedCastMember[] | null;
  if (Array.isArray(cast) && cast.length > 0 && !('profilePath' in cast[0])) {
    return true;
  }

  return false;
}

/**
 * Extract director info from TMDB movie credits
 */
function extractDirectorInfo(tmdbMovie: TMDBMovieDetails): { name: string | null; id: number | null } {
  const directorInfo = tmdbMovie.credits?.crew.find(
    person => person.job === 'Director'
  );
  return {
    name: directorInfo?.name || null,
    id: directorInfo?.id || null
  };
}

/**
 * Extract top cast members from TMDB movie credits
 */
function extractCast(tmdbMovie: TMDBMovieDetails, limit: number = 10): CachedCastMember[] {
  return tmdbMovie.credits?.cast.slice(0, limit).map(actor => ({
    id: actor.id,
    name: actor.name,
    character: actor.character,
    profilePath: actor.profile_path
  })) || [];
}

/**
 * Extract production companies from TMDB movie details
 */
function extractProductionCompanies(tmdbMovie: TMDBMovieDetails, limit: number = 5): CachedProductionCompany[] {
  return tmdbMovie.production_companies?.slice(0, limit).map(c => ({
    id: c.id,
    name: c.name
  })) || [];
}

/**
 * Build the data object for Prisma upsert operations
 */
function buildMovieData(
  tmdbMovie: TMDBMovieDetails,
  keywords: TMDBKeyword[] = []
): {
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genres: { id: number; name: string }[];
  director: string | null;
  directorId: number | null;
  cast: CachedCastMember[];
  runtime: number | null;
  tagline: string | null;
  keywords: TMDBKeyword[];
  collectionId: number | null;
  collectionName: string | null;
  productionCompanies: CachedProductionCompany[];
} {
  const directorInfo = extractDirectorInfo(tmdbMovie);
  const cast = extractCast(tmdbMovie);
  const productionCompanies = extractProductionCompanies(tmdbMovie);

  return {
    title: tmdbMovie.title,
    overview: tmdbMovie.overview || null,
    posterPath: tmdbMovie.poster_path,
    backdropPath: tmdbMovie.backdrop_path,
    releaseDate: tmdbMovie.release_date || null,
    genres: tmdbMovie.genres || [],
    director: directorInfo.name,
    directorId: directorInfo.id,
    cast,
    runtime: tmdbMovie.runtime || null,
    tagline: tmdbMovie.tagline || null,
    keywords,
    collectionId: tmdbMovie.belongs_to_collection?.id || null,
    collectionName: tmdbMovie.belongs_to_collection?.name || null,
    productionCompanies
  };
}

/**
 * Cache movie details in the database
 *
 * Fetches movie data from TMDB and upserts it into the local database cache.
 * Handles all fields consistently including keywords, collection, and production companies.
 *
 * @param tmdbId - The TMDB movie ID
 * @param options - Caching options
 * @returns The cached movie record
 */
export async function cacheMovieDetails(
  tmdbId: number,
  options: CacheMovieOptions = {}
): Promise<Movie> {
  const { includeKeywords = false, forceRefresh = false } = options;

  // Check existing cache
  const existingMovie = await prisma.movie.findUnique({
    where: { tmdbId }
  });

  // Return cached data if fresh and not forced refresh
  if (!forceRefresh && !needsRefresh(existingMovie)) {
    return existingMovie!;
  }

  // Fetch from TMDB
  let tmdbMovie: TMDBMovieDetails;
  let keywords: TMDBKeyword[] = [];

  if (includeKeywords) {
    const enhanced = await tmdbService.getEnhancedMovieDetails(tmdbId);
    tmdbMovie = enhanced;
    keywords = enhanced.keywords || [];
  } else {
    tmdbMovie = await tmdbService.getMovieDetails(tmdbId);
  }

  // Build movie data
  const movieData = buildMovieData(tmdbMovie, keywords);

  // Upsert into database
  // Cast arrays to JSON for Prisma compatibility
  const movie = await prisma.movie.upsert({
    where: { tmdbId },
    update: {
      title: movieData.title,
      overview: movieData.overview,
      posterPath: movieData.posterPath,
      backdropPath: movieData.backdropPath,
      releaseDate: movieData.releaseDate,
      genres: movieData.genres as unknown as Prisma.InputJsonValue,
      director: movieData.director,
      directorId: movieData.directorId,
      cast: movieData.cast as unknown as Prisma.InputJsonValue,
      runtime: movieData.runtime,
      tagline: movieData.tagline,
      keywords: movieData.keywords as unknown as Prisma.InputJsonValue,
      collectionId: movieData.collectionId,
      collectionName: movieData.collectionName,
      productionCompanies: movieData.productionCompanies as unknown as Prisma.InputJsonValue,
      lastUpdated: new Date()
    },
    create: {
      tmdbId,
      title: movieData.title,
      overview: movieData.overview,
      posterPath: movieData.posterPath,
      backdropPath: movieData.backdropPath,
      releaseDate: movieData.releaseDate,
      genres: movieData.genres as unknown as Prisma.InputJsonValue,
      director: movieData.director,
      directorId: movieData.directorId,
      cast: movieData.cast as unknown as Prisma.InputJsonValue,
      runtime: movieData.runtime,
      tagline: movieData.tagline,
      keywords: movieData.keywords as unknown as Prisma.InputJsonValue,
      collectionId: movieData.collectionId,
      collectionName: movieData.collectionName,
      productionCompanies: movieData.productionCompanies as unknown as Prisma.InputJsonValue
    }
  });

  return movie;
}

/**
 * Get cached movie or fetch and cache if not present
 *
 * Convenience wrapper that first checks the cache before fetching.
 *
 * @param tmdbId - The TMDB movie ID
 * @param options - Caching options
 * @returns The movie record
 */
export async function getOrCacheMovie(
  tmdbId: number,
  options: CacheMovieOptions = {}
): Promise<Movie> {
  return cacheMovieDetails(tmdbId, options);
}

/**
 * Batch cache multiple movies
 *
 * @param tmdbIds - Array of TMDB movie IDs
 * @param options - Caching options (applied to all)
 * @returns Array of cached movie records
 */
export async function batchCacheMovies(
  tmdbIds: number[],
  options: CacheMovieOptions = {}
): Promise<Movie[]> {
  const results: Movie[] = [];

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  for (let i = 0; i < tmdbIds.length; i += BATCH_SIZE) {
    const batch = tmdbIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(id => cacheMovieDetails(id, options).catch(() => null))
    );
    results.push(...batchResults.filter((m): m is Movie => m !== null));
  }

  return results;
}
