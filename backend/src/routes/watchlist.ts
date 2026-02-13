import express, { Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Priority, Rating } from '@prisma/client';
import tmdbService from '../services/tmdb';

const router = express.Router();

// Get user's watchlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        movie: true
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    res.json(watchlist);
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Failed to get watchlist' });
  }
});

// Add movie to watchlist
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tmdbId, priority } = req.body;

    if (!tmdbId) {
      return res.status(400).json({ error: 'tmdbId is required' });
    }

    // Fetch and cache movie details
    const tmdbMovie = await tmdbService.getMovieDetails(tmdbId);

    const director = tmdbMovie.credits?.crew.find(
      person => person.job === 'Director'
    )?.name || null;

    const cast = tmdbMovie.credits?.cast.slice(0, 10).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character
    })) || [];

    // Upsert movie in database
    const movie = await prisma.movie.upsert({
      where: { tmdbId },
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
        tmdbId,
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

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId: movie.id
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Movie already in watchlist' });
    }

    // Validate priority if provided
    let validatedPriority = Priority.MEDIUM;
    if (priority) {
      if (typeof priority !== 'string') {
        return res.status(400).json({ error: 'Priority must be a string' });
      }
      const normalizedPriority = priority.toUpperCase();
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      if (!validPriorities.includes(normalizedPriority)) {
        return res.status(400).json({ error: 'Invalid priority value. Must be one of: LOW, MEDIUM, HIGH' });
      }
      validatedPriority = normalizedPriority as Priority;
    }

    // Add to watchlist
    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        movieId: movie.id,
        priority: validatedPriority
      },
      include: {
        movie: true
      }
    });

    res.status(201).json(watchlistItem);
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// Remove from watchlist
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await prisma.watchlist.deleteMany({
      where: {
        id,
        userId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    res.json({ message: 'Removed from watchlist successfully' });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

// Mark watchlist item as watched with rating
router.post('/:id/watched', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { rating } = req.body;

    // Validate rating input
    if (!rating || typeof rating !== 'string') {
      return res.status(400).json({ error: 'Rating is required and must be a string' });
    }

    const validRatings = ['DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];
    const normalizedRating = rating.toUpperCase();
    if (!validRatings.includes(normalizedRating)) {
      return res.status(400).json({ error: 'Invalid rating value. Must be one of: DISLIKE, OK, LIKE, SUPER_LIKE' });
    }

    // Get watchlist item
    const watchlistItem = await prisma.watchlist.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!watchlistItem) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    // Use transaction to ensure atomicity - either both operations succeed or neither
    const userMovie = await prisma.$transaction(async (tx) => {
      // Create user movie entry
      const created = await tx.userMovie.create({
        data: {
          userId,
          movieId: watchlistItem.movieId,
          rating: normalizedRating as Rating,
          watched: true
        },
        include: {
          movie: true
        }
      });

      // Remove from watchlist
      await tx.watchlist.delete({
        where: { id }
      });

      return created;
    });

    res.json({
      message: 'Movie marked as watched and moved to your list',
      userMovie
    });
  } catch (error) {
    console.error('Mark as watched error:', error);
    res.status(500).json({ error: 'Failed to mark as watched' });
  }
});

export default router;
