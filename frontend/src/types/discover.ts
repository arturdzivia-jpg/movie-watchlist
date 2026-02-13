import { DiscoverMovie, Rating } from '../services/api';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type SwipeActionType = Rating | 'WATCHLIST' | 'SKIP';

export interface SwipeAction {
  movie: DiscoverMovie;
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
  skipped: number;
  total: number;
}

export interface SwipeDiscoverState {
  cardStack: DiscoverMovie[];
  currentIndex: number;
  swipeHistory: SwipeAction[];
  isLoading: boolean;
  isPrefetching: boolean;
  isProcessing: boolean;
  stats: SwipeSessionStats;
  error: string | null;
}

export interface UseSwipeDiscoverReturn {
  cards: DiscoverMovie[];
  currentCard: DiscoverMovie | null;
  isLoading: boolean;
  isPrefetching: boolean;
  isProcessing: boolean;
  stats: SwipeSessionStats;
  error: string | null;
  canUndo: boolean;
  swipe: (direction: SwipeDirection) => Promise<void>;
  rateWithButton: (rating: Rating) => Promise<void>;
  skip: () => Promise<void>;
  undo: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}
