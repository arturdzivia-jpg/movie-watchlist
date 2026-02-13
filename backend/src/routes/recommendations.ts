import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import recommendationService from '../services/recommendation';
import userPreferencesService from '../services/userPreferences';

const router = express.Router();

// Get personalized recommendations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 20;

    const recommendations = await recommendationService.generateRecommendations(userId, limitNum);

    res.json({
      recommendations,
      total: recommendations.length
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

    const preferences = await userPreferencesService.getUserPreferences(userId);

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

export default router;
