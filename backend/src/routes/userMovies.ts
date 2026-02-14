import express, { Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Rating, Prisma } from '@prisma/client';
import weightLearningService from '../services/weightLearning';
import { cacheMovieDetails } from '../utils/movieCache';
import { validateRating, validateTmdbId } from '../utils/validators';

const router = express.Router();

// Get user's movies
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rating, sort } = req.query;

    const where: Prisma.UserMovieWhereInput = { userId };

    if (rating && typeof rating === 'string') {
      const ratingValidation = validateRating(rating);
      if (ratingValidation.isValid && ratingValidation.value) {
        where.rating = ratingValidation.value;
      }
    }

    let orderBy: Prisma.UserMovieOrderByWithRelationInput = { createdAt: 'desc' };

    if (sort === 'title') {
      orderBy = { movie: { title: 'asc' } };
    } else if (sort === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'date') {
      orderBy = { createdAt: 'desc' };
    }

    const userMovies = await prisma.userMovie.findMany({
      where,
      include: {
        movie: true
      },
      orderBy
    });

    res.json(userMovies);
  } catch (error) {
    console.error('Get user movies error:', error);
    res.status(500).json({ error: 'Failed to get user movies' });
  }
});

// Add movie with rating
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tmdbId, rating, watched } = req.body;

    // Validate TMDB ID
    const tmdbIdValidation = validateTmdbId(tmdbId);
    if (!tmdbIdValidation.isValid) {
      return res.status(400).json({ error: tmdbIdValidation.error });
    }

    // Validate rating
    const ratingValidation = validateRating(rating);
    if (!ratingValidation.isValid) {
      return res.status(400).json({ error: ratingValidation.error });
    }

    // Use transaction to ensure atomicity
    const userMovie = await prisma.$transaction(async (tx) => {
      // Cache movie details with keywords for recommendation engine
      const movie = await cacheMovieDetails(tmdbIdValidation.value!, {
        includeKeywords: true,
        forceRefresh: false
      });

      // Create or update user movie
      return tx.userMovie.upsert({
        where: {
          userId_movieId: {
            userId,
            movieId: movie.id
          }
        },
        update: {
          rating: ratingValidation.value!,
          watched: watched !== undefined ? watched : true
        },
        create: {
          userId,
          movieId: movie.id,
          rating: ratingValidation.value!,
          watched: watched !== undefined ? watched : true
        },
        include: {
          movie: true
        }
      });
    });

    // Trigger weight learning update (async, don't wait)
    weightLearningService.onNewRating(userId).catch(err => {
      console.error('Weight learning error:', err);
    });

    res.status(201).json(userMovie);
  } catch (error) {
    console.error('Add user movie error:', error);
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

// Update movie rating
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { rating, watched } = req.body;

    const updateData: Prisma.UserMovieUpdateInput = {};

    if (rating) {
      const ratingValidation = validateRating(rating);
      if (!ratingValidation.isValid) {
        return res.status(400).json({ error: ratingValidation.error });
      }
      updateData.rating = ratingValidation.value!;
    }

    if (watched !== undefined) {
      updateData.watched = watched;
    }

    const userMovie = await prisma.userMovie.updateMany({
      where: {
        id,
        userId
      },
      data: updateData
    });

    if (userMovie.count === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const updated = await prisma.userMovie.findUnique({
      where: { id },
      include: { movie: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update user movie error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// Delete movie from user's list
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await prisma.userMovie.deleteMany({
      where: {
        id,
        userId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({ message: 'Movie removed successfully' });
  } catch (error) {
    console.error('Delete user movie error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

export default router;
