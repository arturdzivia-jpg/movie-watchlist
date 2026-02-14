import prisma from '../config/database';
import { Rating } from '@prisma/client';

// Runtime buckets
type RuntimeBucket = 'short' | 'medium' | 'long' | 'epic';

// Rating style based on distribution
type RatingStyle = 'generous' | 'balanced' | 'critical';

export interface GenrePreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;      // Average rating weight (SUPER_LIKE=4, LIKE=3, OK=2, DISLIKE=1)
  confidence: number;     // count / total rated movies
}

export interface DirectorPreference {
  id: number | null;      // TMDB person ID for filtering
  name: string;
  count: number;
  avgRating: number;
  consistency: number;    // Standard deviation of ratings (lower = more consistent)
}

export interface ActorPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface KeywordPreference {
  id: number;
  name: string;
  count: number;
}

export interface CollectionPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface ProductionCompanyPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface EraPreference {
  decade: string;         // "2020s", "2010s", "2000s", etc.
  count: number;
  avgRating: number;
}

export interface RuntimePreference {
  bucket: RuntimeBucket;
  count: number;
  avgRating: number;
}

export interface RatingDistribution {
  superLike: number;
  like: number;
  ok: number;
  dislike: number;
  notInterested: number;
  total: number;
}

export interface EnhancedUserPreferences {
  // Core preferences (existing)
  preferredGenres: GenrePreference[];
  likedDirectors: DirectorPreference[];
  likedActors: ActorPreference[];
  dislikedGenres: GenrePreference[];

  // New preferences
  preferredKeywords: KeywordPreference[];
  likedCollections: CollectionPreference[];
  likedProductionCompanies: ProductionCompanyPreference[];
  preferredEras: EraPreference[];
  preferredRuntime: RuntimePreference | null;

  // Meta information
  ratingDistribution: RatingDistribution;
  ratingStyle: RatingStyle;
  totalRatedMovies: number;
}

// Legacy interface for backward compatibility
export interface UserPreferences {
  preferredGenres: { id: number; name: string; count: number }[];
  likedDirectors: { name: string; count: number }[];
  likedActors: { id: number; name: string; count: number }[];
  dislikedGenres: { id: number; name: string; count: number }[];
}

// Helper to get rating weight
function getRatingWeight(rating: Rating): number {
  switch (rating) {
    case Rating.SUPER_LIKE: return 4;
    case Rating.LIKE: return 3;
    case Rating.OK: return 2;
    case Rating.DISLIKE: return 1;
    case Rating.NOT_INTERESTED: return 0;
    default: return 0;
  }
}

// Helper to get runtime bucket
function getRuntimeBucket(runtime: number): RuntimeBucket {
  if (runtime < 90) return 'short';
  if (runtime < 120) return 'medium';
  if (runtime < 150) return 'long';
  return 'epic';
}

// Helper to get decade from release date
function getDecade(releaseDate: string | null): string | null {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.split('-')[0]);
  if (isNaN(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

// Calculate standard deviation for consistency
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Determine rating style based on distribution
function detectRatingStyle(distribution: RatingDistribution): RatingStyle {
  if (distribution.total === 0) return 'balanced';
  const positiveRatio = (distribution.superLike + distribution.like) / distribution.total;
  if (positiveRatio > 0.7) return 'generous';
  if (positiveRatio < 0.4) return 'critical';
  return 'balanced';
}

class UserPreferencesService {
  // Legacy method for backward compatibility
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const enhanced = await this.getEnhancedUserPreferences(userId);
    return {
      preferredGenres: enhanced.preferredGenres.map(g => ({ id: g.id, name: g.name, count: g.count })),
      likedDirectors: enhanced.likedDirectors.map(d => ({ name: d.name, count: d.count })),
      likedActors: enhanced.likedActors.map(a => ({ id: a.id, name: a.name, count: a.count })),
      dislikedGenres: enhanced.dislikedGenres.map(g => ({ id: g.id, name: g.name, count: g.count }))
    };
  }

  async getEnhancedUserPreferences(userId: string): Promise<EnhancedUserPreferences> {
    // Get all rated movies with their ratings
    const allRatedMovies = await prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true }
    });

    const totalRatedMovies = allRatedMovies.length;

    // Calculate rating distribution
    const ratingDistribution: RatingDistribution = {
      superLike: allRatedMovies.filter(m => m.rating === Rating.SUPER_LIKE).length,
      like: allRatedMovies.filter(m => m.rating === Rating.LIKE).length,
      ok: allRatedMovies.filter(m => m.rating === Rating.OK).length,
      dislike: allRatedMovies.filter(m => m.rating === Rating.DISLIKE).length,
      notInterested: allRatedMovies.filter(m => m.rating === Rating.NOT_INTERESTED).length,
      total: totalRatedMovies
    };

    const ratingStyle = detectRatingStyle(ratingDistribution);

    // Filter by rating type
    const likedMovies = allRatedMovies.filter(m =>
      m.rating === Rating.LIKE || m.rating === Rating.SUPER_LIKE
    );
    const dislikedMovies = allRatedMovies.filter(m => m.rating === Rating.DISLIKE);

    // ===== GENRE PREFERENCES =====
    const genreMap = new Map<number, { id: number; name: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const genres = userMovie.movie.genres as any[];
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (Array.isArray(genres) && ratingWeight > 0) {
        genres.forEach(genre => {
          if (!genre || !genre.id) return; // Skip invalid genres
          const existing = genreMap.get(genre.id);
          if (existing) {
            existing.ratings.push(ratingWeight);
          } else {
            genreMap.set(genre.id, { id: genre.id, name: genre.name || 'Unknown', ratings: [ratingWeight] });
          }
        });
      }
    });

    const preferredGenres: GenrePreference[] = Array.from(genreMap.values())
      .map(g => ({
        id: g.id,
        name: g.name,
        count: g.ratings.length,
        avgRating: g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length,
        confidence: totalRatedMovies > 0 ? g.ratings.length / totalRatedMovies : 0
      }))
      .filter(g => g.avgRating >= 2.5) // Only genres with positive average
      .sort((a, b) => b.avgRating * b.confidence - a.avgRating * a.confidence);

    // Disliked genres - count genres from disliked movies
    const dislikedGenreMap = new Map<number, { id: number; name: string; count: number }>();
    dislikedMovies.forEach(userMovie => {
      const genres = userMovie.movie.genres as any[];
      if (Array.isArray(genres)) {
        genres.forEach(genre => {
          const existing = dislikedGenreMap.get(genre.id);
          if (existing) {
            existing.count++;
          } else {
            dislikedGenreMap.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
          }
        });
      }
    });

    // Count liked genres (LIKE + SUPER_LIKE) to compare
    const likedGenreMap = new Map<number, number>();
    likedMovies.forEach(userMovie => {
      const genres = userMovie.movie.genres as any[];
      if (Array.isArray(genres)) {
        genres.forEach(genre => {
          likedGenreMap.set(genre.id, (likedGenreMap.get(genre.id) || 0) + 1);
        });
      }
    });

    // Only include genre as "disliked" if dislikes > likes for that genre
    const dislikedGenres: GenrePreference[] = Array.from(dislikedGenreMap.values())
      .filter(g => {
        const likedCount = likedGenreMap.get(g.id) || 0;
        return g.count > likedCount; // More dislikes than likes
      })
      .map(g => ({
        ...g,
        avgRating: 1,
        confidence: totalRatedMovies > 0 ? g.count / totalRatedMovies : 0
      }))
      .sort((a, b) => b.count - a.count);

    // ===== DIRECTOR PREFERENCES =====
    const directorMap = new Map<string, { id: number | null; name: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const director = userMovie.movie.director;
      const directorId = userMovie.movie.directorId;
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (director && ratingWeight > 0) {
        const existing = directorMap.get(director);
        if (existing) {
          existing.ratings.push(ratingWeight);
          // Update ID if we found one (some older movies might not have it)
          if (directorId && !existing.id) {
            existing.id = directorId;
          }
        } else {
          directorMap.set(director, { id: directorId, name: director, ratings: [ratingWeight] });
        }
      }
    });

    const likedDirectors: DirectorPreference[] = Array.from(directorMap.values())
      .filter(d => d.ratings.length >= 1 && d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length >= 2.5)
      .map(d => ({
        id: d.id,
        name: d.name,
        count: d.ratings.length,
        avgRating: d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length,
        consistency: calculateStdDev(d.ratings)
      }))
      .sort((a, b) => (b.avgRating * b.count) - (a.avgRating * a.count));

    // ===== ACTOR PREFERENCES =====
    const actorMap = new Map<number, { id: number; name: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const cast = userMovie.movie.cast as any[];
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (Array.isArray(cast) && ratingWeight > 0) {
        cast.slice(0, 5).forEach(actor => {
          const existing = actorMap.get(actor.id);
          if (existing) {
            existing.ratings.push(ratingWeight);
          } else {
            actorMap.set(actor.id, { id: actor.id, name: actor.name, ratings: [ratingWeight] });
          }
        });
      }
    });

    const likedActors: ActorPreference[] = Array.from(actorMap.values())
      .filter(a => a.ratings.reduce((a, b) => a + b, 0) / a.ratings.length >= 2.5)
      .map(a => ({
        id: a.id,
        name: a.name,
        count: a.ratings.length,
        avgRating: a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length
      }))
      .sort((a, b) => (b.avgRating * b.count) - (a.avgRating * a.count));

    // ===== KEYWORD PREFERENCES =====
    const keywordMap = new Map<number, { id: number; name: string; count: number }>();
    likedMovies.forEach(userMovie => {
      const keywords = userMovie.movie.keywords as any[];
      if (Array.isArray(keywords)) {
        keywords.forEach(keyword => {
          const existing = keywordMap.get(keyword.id);
          if (existing) {
            existing.count++;
          } else {
            keywordMap.set(keyword.id, { id: keyword.id, name: keyword.name, count: 1 });
          }
        });
      }
    });

    const preferredKeywords: KeywordPreference[] = Array.from(keywordMap.values())
      .filter(k => k.count >= 2) // Only keywords appearing in 2+ liked movies
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 keywords

    // ===== COLLECTION PREFERENCES =====
    const collectionMap = new Map<number, { id: number; name: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const collectionId = userMovie.movie.collectionId;
      const collectionName = userMovie.movie.collectionName;
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (collectionId && collectionName && ratingWeight > 0) {
        const existing = collectionMap.get(collectionId);
        if (existing) {
          existing.ratings.push(ratingWeight);
        } else {
          collectionMap.set(collectionId, { id: collectionId, name: collectionName, ratings: [ratingWeight] });
        }
      }
    });

    const likedCollections: CollectionPreference[] = Array.from(collectionMap.values())
      .filter(c => c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length >= 2.5)
      .map(c => ({
        id: c.id,
        name: c.name,
        count: c.ratings.length,
        avgRating: c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length
      }))
      .sort((a, b) => (b.avgRating * b.count) - (a.avgRating * a.count));

    // ===== PRODUCTION COMPANY PREFERENCES =====
    const companyMap = new Map<number, { id: number; name: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const companies = userMovie.movie.productionCompanies as any[];
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (Array.isArray(companies) && ratingWeight > 0) {
        companies.slice(0, 3).forEach(company => { // Top 3 production companies per movie
          const existing = companyMap.get(company.id);
          if (existing) {
            existing.ratings.push(ratingWeight);
          } else {
            companyMap.set(company.id, { id: company.id, name: company.name, ratings: [ratingWeight] });
          }
        });
      }
    });

    const likedProductionCompanies: ProductionCompanyPreference[] = Array.from(companyMap.values())
      .filter(c => c.ratings.length >= 2 && c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length >= 2.5)
      .map(c => ({
        id: c.id,
        name: c.name,
        count: c.ratings.length,
        avgRating: c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length
      }))
      .sort((a, b) => (b.avgRating * b.count) - (a.avgRating * a.count));

    // ===== ERA PREFERENCES =====
    const eraMap = new Map<string, { decade: string; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const decade = getDecade(userMovie.movie.releaseDate);
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (decade && ratingWeight > 0) {
        const existing = eraMap.get(decade);
        if (existing) {
          existing.ratings.push(ratingWeight);
        } else {
          eraMap.set(decade, { decade, ratings: [ratingWeight] });
        }
      }
    });

    const preferredEras: EraPreference[] = Array.from(eraMap.values())
      .map(e => ({
        decade: e.decade,
        count: e.ratings.length,
        avgRating: e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    // ===== RUNTIME PREFERENCES =====
    const runtimeMap = new Map<RuntimeBucket, { bucket: RuntimeBucket; ratings: number[] }>();
    allRatedMovies.forEach(userMovie => {
      const runtime = userMovie.movie.runtime;
      const ratingWeight = getRatingWeight(userMovie.rating);
      if (runtime && ratingWeight > 0) {
        const bucket = getRuntimeBucket(runtime);
        const existing = runtimeMap.get(bucket);
        if (existing) {
          existing.ratings.push(ratingWeight);
        } else {
          runtimeMap.set(bucket, { bucket, ratings: [ratingWeight] });
        }
      }
    });

    const runtimePreferences: RuntimePreference[] = Array.from(runtimeMap.values())
      .map(r => ({
        bucket: r.bucket,
        count: r.ratings.length,
        avgRating: r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    const preferredRuntime = runtimePreferences.length > 0 ? runtimePreferences[0] : null;

    return {
      preferredGenres,
      likedDirectors,
      likedActors,
      dislikedGenres,
      preferredKeywords,
      likedCollections,
      likedProductionCompanies,
      preferredEras,
      preferredRuntime,
      ratingDistribution,
      ratingStyle,
      totalRatedMovies
    };
  }
}

export default new UserPreferencesService();
