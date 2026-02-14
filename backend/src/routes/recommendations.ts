import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import recommendationService from '../services/recommendation';
import userPreferencesService from '../services/userPreferences';

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

export default router;
