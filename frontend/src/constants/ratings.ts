import { Rating } from '../services/api';

/**
 * Configuration for rating buttons
 */
export interface RatingConfig {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Complete rating configuration map
 */
export const RATING_CONFIG: Record<Rating, RatingConfig> = {
  NOT_INTERESTED: {
    emoji: '🚫',
    label: 'Not Interested',
    color: 'text-slate-400',
    bgColor: 'bg-slate-600 hover:bg-slate-500'
  },
  DISLIKE: {
    emoji: '👎',
    label: 'Dislike',
    color: 'text-gray-400',
    bgColor: 'bg-gray-600 hover:bg-gray-700'
  },
  OK: {
    emoji: '😐',
    label: 'OK',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  LIKE: {
    emoji: '👍',
    label: 'Like',
    color: 'text-green-400',
    bgColor: 'bg-green-600 hover:bg-green-700'
  },
  SUPER_LIKE: {
    emoji: '❤️',
    label: 'Love',
    color: 'text-red-400',
    bgColor: 'bg-red-600 hover:bg-red-700'
  }
};

/**
 * Rating buttons for standard rating UI (excludes NOT_INTERESTED)
 */
export const RATING_BUTTONS = (
  Object.entries(RATING_CONFIG) as [Rating, RatingConfig][]
)
  .filter(([rating]) => rating !== 'NOT_INTERESTED')
  .map(([rating, config]) => ({
    rating,
    ...config
  }));

/**
 * Get the display config for a rating
 */
export function getRatingConfig(rating: Rating): RatingConfig {
  return RATING_CONFIG[rating];
}

/**
 * Get emoji for a rating
 */
export function getRatingEmoji(rating: Rating): string {
  return RATING_CONFIG[rating].emoji;
}

/**
 * Get label for a rating
 */
export function getRatingLabel(rating: Rating): string {
  return RATING_CONFIG[rating].label;
}

/**
 * Get color class for a rating
 */
export function getRatingColor(rating: Rating): string {
  return RATING_CONFIG[rating].color;
}

/**
 * Get background color class for a rating
 */
export function getRatingBgColor(rating: Rating): string {
  return RATING_CONFIG[rating].bgColor;
}
