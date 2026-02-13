import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import recommendationService from '../services/recommendation';
import tmdbService, { TMDBMovie } from '../services/tmdb';
import prisma from '../config/database';

const router = express.Router();

type DiscoverCategory = 'for_you' | 'popular' | 'new_releases' | 'top_rated';

const MIN_VOTE_COUNT = 100;
const MIN_VOTE_COUNT_TOP_RATED = 500;
const MIN_VOTE_COUNT_NEW = 50;

// Get movies by category
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const category = (req.query.category as DiscoverCategory) || 'for_you';
    const page = parseInt(req.query.page as string) || 1;

    // Validate category
    const validCategories: DiscoverCategory[] = ['for_you', 'popular', 'new_releases', 'top_rated'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
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

    if (category === 'for_you') {
      // Use existing recommendation service
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

      let discoverParams: Parameters<typeof tmdbService.discoverMovies>[0] = { page };

      switch (category) {
        case 'popular':
          discoverParams = {
            ...discoverParams,
            sort_by: 'popularity.desc',
            'vote_count.gte': MIN_VOTE_COUNT
          };
          break;
        case 'new_releases':
          discoverParams = {
            ...discoverParams,
            sort_by: 'primary_release_date.desc',
            'primary_release_date.lte': todayStr,
            'primary_release_date.gte': sixMonthsAgoStr,
            'vote_count.gte': MIN_VOTE_COUNT_NEW
          };
          break;
        case 'top_rated':
          discoverParams = {
            ...discoverParams,
            sort_by: 'vote_average.desc',
            'vote_count.gte': MIN_VOTE_COUNT_TOP_RATED
          };
          break;
      }

      const response = await tmdbService.discoverMovies(discoverParams);
      movies = response.results.filter(m => !excludedIds.has(m.id));
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
