import { DiscoverMovie, Rating } from '../services/api';

// Simplified to only horizontal swipes
export type SwipeDirection = 'left' | 'right';

export type SwipeActionType = Rating | 'WATCHLIST';

export interface SwipeAction {
  movie: DiscoverMovie;
  action: SwipeActionType;
  apiRecordId?: string;
  timestamp: number;
}

// Simplified stats for new interaction model
export interface SwipeSessionStats {
  wantToWatch: number;      // Swiped right -> watchlist
  notInterested: number;    // Swiped left -> NOT_INTERESTED
  alreadyWatched: number;   // Used rating modal
  total: number;
}

export interface RatingModalState {
  isOpen: boolean;
  movie: DiscoverMovie | null;
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
  ratingModal: RatingModalState;
  swipe: (direction: SwipeDirection) => Promise<void>;
  openRatingModal: () => void;
  closeRatingModal: () => void;
  submitRating: (rating: Rating) => Promise<void>;
  undo: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}
