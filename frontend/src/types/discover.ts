import { Recommendation, Rating } from '../services/api';

export type SwipeDirection = 'left' | 'right' | 'up';

export type SwipeActionType = Rating | 'WATCHLIST';

export interface SwipeAction {
  movie: Recommendation;
  action: SwipeActionType;
  apiRecordId?: string;
  timestamp: number;
}

export interface SwipeSessionStats {
  liked: number;
  disliked: number;
  ok: number;
  superLiked: number;
  watchlisted: number;
  total: number;
}

export interface SwipeDiscoverState {
  cardStack: Recommendation[];
  currentIndex: number;
  swipeHistory: SwipeAction[];
  isLoading: boolean;
  isPrefetching: boolean;
  isProcessing: boolean;
  stats: SwipeSessionStats;
  error: string | null;
}

export interface UseSwipeDiscoverReturn {
  cards: Recommendation[];
  currentCard: Recommendation | null;
  isLoading: boolean;
  isPrefetching: boolean;
  isProcessing: boolean;
  stats: SwipeSessionStats;
  error: string | null;
  canUndo: boolean;
  swipe: (direction: SwipeDirection) => Promise<void>;
  rateWithButton: (rating: Rating) => Promise<void>;
  undo: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}
