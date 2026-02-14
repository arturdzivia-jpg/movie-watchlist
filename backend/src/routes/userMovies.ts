import express, { Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Rating } from '@prisma/client';
import tmdbService from '../services/tmdb';
import weightLearningService from '../services/weightLearning';

const router = express.Router();

// Get user's movies
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rating, sort } = req.query;

    const where: any = { userId };

    if (rating && typeof rating === 'string') {
      where.rating = rating.toUpperCase() as Rating;
    }

    let orderBy: any = { createdAt: 'desc' };

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

    if (!tmdbId || !rating) {
      return res.status(400).json({ error: 'tmdbId and rating are required' });
    }

    // Validate rating type and value
    if (typeof rating !== 'string') {
      return res.status(400).json({ error: 'Rating must be a string' });
    }

    const validRatings = ['NOT_INTERESTED', 'DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];
    const normalizedRating = rating.toUpperCase();
    if (!validRatings.includes(normalizedRating)) {
      return res.status(400).json({ error: 'Invalid rating value. Must be one of: NOT_INTERESTED, DISLIKE, OK, LIKE, SUPER_LIKE' });
    }

    // Fetch and cache movie details with keywords
    const tmdbMovie = await tmdbService.getEnhancedMovieDetails(tmdbId);

    const director = tmdbMovie.credits?.crew.find(
      person => person.job === 'Director'
    )?.name || null;

    const cast = tmdbMovie.credits?.cast.slice(0, 10).map(actor => ({
      id: actor.id,
      name: actor.name,
      character: actor.character
    })) || [];

    // Extract collection info
    const collectionId = tmdbMovie.belongs_to_collection?.id || null;
    const collectionName = tmdbMovie.belongs_to_collection?.name || null;

    // Extract production companies (top 5)
    const productionCompanies = tmdbMovie.production_companies?.slice(0, 5).map(c => ({
      id: c.id,
      name: c.name
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
        keywords: (tmdbMovie.keywords || []) as any,
        collectionId,
        collectionName,
        productionCompanies,
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
        runtime: tmdbMovie.runtime,
        keywords: (tmdbMovie.keywords || []) as any,
        collectionId,
        collectionName,
        productionCompanies
      }
    });

    // Create or update user movie
    const userMovie = await prisma.userMovie.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId: movie.id
        }
      },
      update: {
        rating: normalizedRating as Rating,
        watched: watched !== undefined ? watched : true
      },
      create: {
        userId,
        movieId: movie.id,
        rating: normalizedRating as Rating,
        watched: watched !== undefined ? watched : true
      },
      include: {
        movie: true
      }
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

    const updateData: any = {};

    if (rating) {
      if (typeof rating !== 'string') {
        return res.status(400).json({ error: 'Rating must be a string' });
      }
      const validRatings = ['NOT_INTERESTED', 'DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];
      const normalizedRating = rating.toUpperCase();
      if (!validRatings.includes(normalizedRating)) {
        return res.status(400).json({ error: 'Invalid rating value. Must be one of: NOT_INTERESTED, DISLIKE, OK, LIKE, SUPER_LIKE' });
      }
      updateData.rating = normalizedRating as Rating;
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
