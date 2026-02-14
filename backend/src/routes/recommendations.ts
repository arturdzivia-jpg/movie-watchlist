import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import recommendationService from '../services/recommendation';
import userPreferencesService from '../services/userPreferences';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// Valid mood values
const VALID_MOODS = ['exciting', 'relaxing', 'thoughtful', 'funny', 'scary', 'romantic'] as const;
type Mood = typeof VALID_MOODS[number];

// Get personalized recommendations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit, page, mood } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 20;
    const pageNum = page ? parseInt(page as string) : 1;

    // Validate mood parameter
    let validMood: Mood | undefined;
    if (mood && typeof mood === 'string') {
      if (VALID_MOODS.includes(mood as Mood)) {
        validMood = mood as Mood;
      }
    }

    const recommendations = await recommendationService.generateRecommendations(
      userId,
      limitNum,
      pageNum,
      validMood
    );

    res.json({
      recommendations,
      total: recommendations.length,
      page: pageNum,
      mood: validMood || null
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get user preferences (for debugging/display)
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const preferences = await userPreferencesService.getEnhancedUserPreferences(userId);

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Get available moods
router.get('/moods', authenticate, async (_req: AuthRequest, res: Response) => {
  res.json({
    moods: [
      { id: 'exciting', name: 'Exciting', description: 'Action, Adventure, Thriller, Sci-Fi' },
      { id: 'relaxing', name: 'Relaxing', description: 'Comedy, Family, Fantasy' },
      { id: 'thoughtful', name: 'Thoughtful', description: 'Drama, History, Documentary' },
      { id: 'funny', name: 'Funny', description: 'Comedy, Music' },
      { id: 'scary', name: 'Scary', description: 'Horror, Thriller, Mystery' },
      { id: 'romantic', name: 'Romantic', description: 'Romance, Drama' }
    ]
  });
});

// Valid action types for tracking user interactions with recommendations
const VALID_ACTIONS = ['viewed', 'skipped', 'rated', 'watchlisted', 'not_interested'] as const;
type RecommendationAction = typeof VALID_ACTIONS[number];

// Record user action on a recommendation (skip, watchlist, etc.)
router.post('/action', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tmdbId, action } = req.body;

    // Validate required fields
    if (!tmdbId || typeof tmdbId !== 'number') {
      return res.status(400).json({ error: 'tmdbId is required and must be a number' });
    }

    // Validate action type
    if (!action || !VALID_ACTIONS.includes(action as RecommendationAction)) {
      return res.status(400).json({
        error: `Invalid action type. Must be one of: ${VALID_ACTIONS.join(', ')}`
      });
    }

    await prisma.recommendationHistory.upsert({
      where: { userId_tmdbId: { userId, tmdbId } },
      update: { action, shownAt: new Date() },
      create: { userId, tmdbId, action, shownAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Record action error:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

export default router;
