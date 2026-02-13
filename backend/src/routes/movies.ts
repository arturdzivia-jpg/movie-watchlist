import express, { Request, Response } from 'express';
import tmdbService from '../services/tmdb';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Search movies
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, page } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const pageNum = page ? parseInt(page as string) : 1;
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
    const pageNum = page ? parseInt(page as string) : 1;

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
    const tmdbIdNum = parseInt(tmdbId);

    if (isNaN(tmdbIdNum)) {
      return res.status(400).json({ error: 'Invalid TMDB ID' });
    }

    // Check if movie is cached in database
    let movie = await prisma.movie.findUnique({
      where: { tmdbId: tmdbIdNum }
    });

    // If not cached or outdated (30 days), fetch from TMDB
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (!movie || movie.lastUpdated < thirtyDaysAgo) {
      const tmdbMovie = await tmdbService.getMovieDetails(tmdbIdNum);

      // Extract director from crew
      const director = tmdbMovie.credits?.crew.find(
        person => person.job === 'Director'
      )?.name || null;

      // Extract top cast members
      const cast = tmdbMovie.credits?.cast.slice(0, 10).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character
      })) || [];

      // Upsert movie in database
      movie = await prisma.movie.upsert({
        where: { tmdbId: tmdbIdNum },
        update: {
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          releaseDate: tmdbMovie.release_date,
          genres: tmdbMovie.genres,
          director,
          cast,
          runtime: tmdbMovie.runtime,
          lastUpdated: new Date()
        },
        create: {
          tmdbId: tmdbIdNum,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          releaseDate: tmdbMovie.release_date,
          genres: tmdbMovie.genres,
          director,
          cast,
          runtime: tmdbMovie.runtime
        }
      });
    }

    res.json(movie);
  } catch (error) {
    console.error('Get movie details error:', error);
    res.status(500).json({ error: 'Failed to get movie details' });
  }
});

export default router;
