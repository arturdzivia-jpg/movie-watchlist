import express, { Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Priority, Rating } from '@prisma/client';
import { cacheMovieDetails } from '../utils/movieCache';
import { validateRating, validatePriority, validateTmdbId } from '../utils/validators';

const router = express.Router();

// Get user's watchlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sort = 'date', order = 'desc', genre } = req.query;

    // Build orderBy based on sort parameter
    type OrderByType = { addedAt?: 'asc' | 'desc'; priority?: 'asc' | 'desc'; movie?: { title?: 'asc' | 'desc'; releaseDate?: 'asc' | 'desc' } };
    let orderBy: OrderByType;

    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    switch (sort) {
      case 'priority':
        orderBy = { priority: sortOrder };
        break;
      case 'title':
        orderBy = { movie: { title: sortOrder } };
        break;
      case 'release':
        orderBy = { movie: { releaseDate: sortOrder } };
        break;
      case 'date':
      default:
        orderBy = { addedAt: sortOrder };
        break;
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        movie: true
      },
      orderBy
    });

    // Filter by genre if specified (done in JS since genres are stored as JSON)
    let filteredWatchlist = watchlist;
    if (genre) {
      const genreId = parseInt(genre as string, 10);
      if (!isNaN(genreId)) {
        filteredWatchlist = watchlist.filter(item => {
          const genres = item.movie.genres as Array<{ id: number; name: string }> | null;
          return genres?.some(g => g.id === genreId);
        });
      }
    }

    res.json(filteredWatchlist);
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

    // Validate TMDB ID
    const tmdbIdValidation = validateTmdbId(tmdbId);
    if (!tmdbIdValidation.isValid) {
      return res.status(400).json({ error: tmdbIdValidation.error });
    }

    // Validate priority
    const priorityValidation = validatePriority(priority, 'MEDIUM');
    if (!priorityValidation.isValid) {
      return res.status(400).json({ error: priorityValidation.error });
    }

    // Cache movie details (using shared utility with all fields)
    const movie = await cacheMovieDetails(tmdbIdValidation.value!, {
      includeKeywords: false,
      forceRefresh: false
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

    // Add to watchlist
    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        movieId: movie.id,
        priority: priorityValidation.value!
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

// Update watchlist item (notes, priority)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { priority, notes } = req.body;

    // Validate priority if provided
    if (priority !== undefined) {
      const priorityValidation = validatePriority(priority, 'MEDIUM');
      if (!priorityValidation.isValid) {
        return res.status(400).json({ error: priorityValidation.error });
      }
    }

    // Check if watchlist item exists and belongs to user
    const existing = await prisma.watchlist.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    // Build update data
    const updateData: { priority?: Priority; notes?: string | null } = {};
    if (priority !== undefined) {
      updateData.priority = priority as Priority;
    }
    if (notes !== undefined) {
      // Allow null or empty string to clear notes
      updateData.notes = notes || null;
    }

    const updated = await prisma.watchlist.update({
      where: { id },
      data: updateData,
      include: { movie: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update watchlist error:', error);
    res.status(500).json({ error: 'Failed to update watchlist item' });
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
    const ratingValidation = validateRating(rating);
    if (!ratingValidation.isValid) {
      return res.status(400).json({ error: ratingValidation.error });
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
          rating: ratingValidation.value!,
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
