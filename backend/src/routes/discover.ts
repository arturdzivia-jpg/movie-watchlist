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

    // New filter params for clickable metadata
    const actor = req.query.actor ? parseInt(req.query.actor as string) : null;
    const director = req.query.director ? parseInt(req.query.director as string) : null;
    const company = req.query.company ? parseInt(req.query.company as string) : null;

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

    // Check if we have person/company filters - these always use TMDB discover
    const hasPersonOrCompanyFilter = actor || director || company;

    if (hasPersonOrCompanyFilter || category !== 'for_you') {
      // Use TMDB discover endpoint for person/company filters or non-personalized categories
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

      // Add person/company filters
      if (actor) {
        discoverParams.with_cast = String(actor);
      }
      if (director) {
        discoverParams.with_crew = String(director);
      }
      if (company) {
        discoverParams.with_companies = String(company);
      }

      // Category-specific params (default to popular sort for person/company filters)
      const effectiveCategory = hasPersonOrCompanyFilter && category === 'for_you' ? 'popular' : category;

      switch (effectiveCategory) {
        case 'for_you':
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

      // For cartoons, filter out Japanese animation
      if (style === 'cartoons') {
        filteredMovies = filteredMovies.filter(m => m.original_language !== 'ja');
      }

      movies = filteredMovies;
      totalPages = response.total_pages;
    } else if (category === 'for_you') {
      // Use existing recommendation service for personalized "For You" without person/company filters
      // Request more recommendations to allow for filtering
      const requestLimit = (genre || style !== 'all') ? 100 : 20;
      let recommendations = await recommendationService.generateRecommendations(userId, requestLimit, page);

      // Apply genre filter if specified
      if (genre) {
        recommendations = recommendations.filter(movie =>
          movie.genre_ids?.includes(genre)
        );
      }

      // Apply style filter if specified
      if (style === 'anime') {
        // Animation genre + Japanese language
        recommendations = recommendations.filter(movie =>
          movie.genre_ids?.includes(ANIMATION_GENRE_ID) && movie.original_language === 'ja'
        );
      } else if (style === 'cartoons') {
        // Animation genre but NOT Japanese
        recommendations = recommendations.filter(movie =>
          movie.genre_ids?.includes(ANIMATION_GENRE_ID) && movie.original_language !== 'ja'
        );
      } else if (style === 'movies') {
        // Exclude animation
        recommendations = recommendations.filter(movie =>
          !movie.genre_ids?.includes(ANIMATION_GENRE_ID)
        );
      }

      movies = recommendations.slice(0, 20);
      totalPages = 50; // TMDB typically has many pages of similar/popular movies

      // Fallback: If genre filter returns no results, fetch from TMDB discover
      // This handles cases like Documentary where user may not have rated any
      if (movies.length === 0 && genre) {
        const genreFilter = buildGenreFilter();
        const languageFilters = buildLanguageFilters();

        const fallbackResponse = await tmdbService.discoverMovies({
          page,
          with_genres: genreFilter,
          sort_by: 'popularity.desc',
          'vote_count.gte': getVoteCountThreshold(MIN_VOTE_COUNT),
          ...languageFilters
        });

        let fallbackMovies = fallbackResponse.results.filter(m => !excludedIds.has(m.id));

        // Apply style filter for cartoons
        if (style === 'cartoons') {
          fallbackMovies = fallbackMovies.filter(m => m.original_language !== 'ja');
        }

        movies = fallbackMovies;
        totalPages = fallbackResponse.total_pages;
      }
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
