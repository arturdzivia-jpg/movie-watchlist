import express, { Request, Response } from 'express';
import tmdbService from '../services/tmdb';
import { authenticate, AuthRequest } from '../middleware/auth';
import { cacheMovieDetails } from '../utils/movieCache';
import { validatePagination, validateTmdbId } from '../utils/validators';
import { TMDB } from '../config/constants';

const router = express.Router();

// Search movies
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, page } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const { page: pageNum } = validatePagination(page, undefined, { maxPage: TMDB.MAX_PAGES });
    const results = await tmdbService.searchMovies(q, pageNum);

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get popular movies
router.get('/popular', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page } = req.query;
    const { page: pageNum } = validatePagination(page, undefined, { maxPage: TMDB.MAX_PAGES });

    const results = await tmdbService.getPopularMovies(pageNum);

    res.json(results);
  } catch (error) {
    console.error('Get popular movies error:', error);
    res.status(500).json({ error: 'Failed to get popular movies' });
  }
});

// Get movie details by TMDB ID
router.get('/:tmdbId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tmdbId } = req.params;

    // Validate TMDB ID
    const tmdbIdValidation = validateTmdbId(tmdbId);
    if (!tmdbIdValidation.isValid) {
      return res.status(400).json({ error: tmdbIdValidation.error });
    }

    // Cache movie details using shared utility
    const movie = await cacheMovieDetails(tmdbIdValidation.value!, {
      includeKeywords: false,
      forceRefresh: false
    });

    // Fetch videos (don't cache - trailers can be added/updated)
    const videos = await tmdbService.getMovieVideos(tmdbIdValidation.value!);

    // Find the best trailer (prefer official YouTube trailers)
    const trailer = videos.find(
      v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
    ) || videos.find(
      v => v.site === 'YouTube' && v.type === 'Trailer'
    ) || videos.find(
      v => v.site === 'YouTube' && v.type === 'Teaser'
    ) || null;

    res.json({
      ...movie,
      trailer: trailer ? {
        key: trailer.key,
        name: trailer.name,
        site: trailer.site
      } : null
    });
  } catch (error) {
    console.error('Get movie details error:', error);
    res.status(500).json({ error: 'Failed to get movie details' });
  }
});

export default router;
