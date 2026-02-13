import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import recommendationService from '../services/recommendation';
import tmdbService, { TMDBMovie } from '../services/tmdb';
import prisma from '../config/database';

const router = express.Router();

type DiscoverCategory = 'for_you' | 'popular' | 'new_releases' | 'top_rated';
type MovieStyle = 'all' | 'movies' | 'anime' | 'cartoons';

const MIN_VOTE_COUNT = 100;
const MIN_VOTE_COUNT_TOP_RATED = 500;
const MIN_VOTE_COUNT_NEW = 50;
const MIN_VOTE_COUNT_ANIME = 10; // Lower threshold for anime/cartoons
const ANIMATION_GENRE_ID = 16;

// Get movies by category
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const category = (req.query.category as DiscoverCategory) || 'for_you';
    const page = parseInt(req.query.page as string) || 1;
    const genre = req.query.genre ? parseInt(req.query.genre as string) : null;
    const style = (req.query.style as MovieStyle) || 'all';

    // Validate category
    const validCategories: DiscoverCategory[] = ['for_you', 'popular', 'new_releases', 'top_rated'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Validate style
    const validStyles: MovieStyle[] = ['all', 'movies', 'anime', 'cartoons'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: 'Invalid style' });
    }

    // Get user's rated and watchlisted movies to filter them out
    const [ratedMovies, watchlistMovies] = await Promise.all([
      prisma.userMovie.findMany({
        where: { userId },
        select: { movie: { select: { tmdbId: true } } }
      }),
      prisma.watchlist.findMany({
        where: { userId },
        select: { movie: { select: { tmdbId: true } } }
      })
    ]);

    const excludedIds = new Set([
      ...ratedMovies.map(r => r.movie.tmdbId),
      ...watchlistMovies.map(w => w.movie.tmdbId)
    ]);

    let movies: TMDBMovie[] = [];
    let totalPages = 1;

    // Build genre filter based on genre and style
    const buildGenreFilter = (): string | undefined => {
      const genres: number[] = [];

      // Add user-selected genre
      if (genre) {
        genres.push(genre);
      }

      // Add animation genre for anime/cartoons
      if (style === 'anime' || style === 'cartoons') {
        if (!genres.includes(ANIMATION_GENRE_ID)) {
          genres.push(ANIMATION_GENRE_ID);
        }
      }

      return genres.length > 0 ? genres.join(',') : undefined;
    };

    // Build language filter based on style
    // Note: TMDB doesn't support 'without_original_language', so for cartoons we filter client-side
    const buildLanguageFilters = (): { with_original_language?: string; without_genres?: string } => {
      switch (style) {
        case 'anime':
          // Animation + Japanese language
          return { with_original_language: 'ja' };
        case 'cartoons':
          // Animation only - we'll filter out Japanese later
          return {};
        case 'movies':
          // Exclude animation genre
          return { without_genres: String(ANIMATION_GENRE_ID) };
        default:
          return {};
      }
    };

    // Get the appropriate vote count threshold based on style
    const getVoteCountThreshold = (baseThreshold: number): number => {
      if (style === 'anime' || style === 'cartoons') {
        return MIN_VOTE_COUNT_ANIME;
      }
      return baseThreshold;
    };

    if (category === 'for_you') {
      // Use existing recommendation service
      // Note: For 'for_you', filters are not applied as recommendations are personalized
      const recommendations = await recommendationService.generateRecommendations(userId, 20);
      movies = recommendations;
      totalPages = 10; // Approximate - recommendations are generated dynamically
    } else {
      // Get date range for new releases (last 6 months)
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const todayStr = today.toISOString().split('T')[0];
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

      const genreFilter = buildGenreFilter();
      const languageFilters = buildLanguageFilters();

      let discoverParams: Parameters<typeof tmdbService.discoverMovies>[0] = {
        page,
        with_genres: genreFilter,
        ...languageFilters
      };

      switch (category) {
        case 'popular':
          discoverParams = {
            ...discoverParams,
            sort_by: 'popularity.desc',
            'vote_count.gte': getVoteCountThreshold(MIN_VOTE_COUNT)
          };
          break;
        case 'new_releases':
          discoverParams = {
            ...discoverParams,
            sort_by: 'primary_release_date.desc',
            'primary_release_date.lte': todayStr,
            'primary_release_date.gte': sixMonthsAgoStr,
            'vote_count.gte': getVoteCountThreshold(MIN_VOTE_COUNT_NEW)
          };
          break;
        case 'top_rated':
          discoverParams = {
            ...discoverParams,
            sort_by: 'vote_average.desc',
            'vote_count.gte': getVoteCountThreshold(MIN_VOTE_COUNT_TOP_RATED)
          };
          break;
      }

      const response = await tmdbService.discoverMovies(discoverParams);
      let filteredMovies = response.results.filter(m => !excludedIds.has(m.id));

      // For cartoons, filter out Japanese animation (since TMDB doesn't support without_original_language)
      // TMDB discover endpoint does return original_language in the response
      if (style === 'cartoons') {
        filteredMovies = filteredMovies.filter(m => m.original_language !== 'ja');
      }

      movies = filteredMovies;
      totalPages = response.total_pages;
    }

    res.json({
      movies,
      page,
      total_pages: totalPages,
      category
    });
  } catch (error) {
    console.error('Discover movies error:', error);
    res.status(500).json({ error: 'Failed to discover movies' });
  }
});

export default router;
