import { useState, useCallback, useEffect, useRef } from 'react';
import { DiscoverMovie, DiscoverCategory, Rating, discoverAPI, userMoviesAPI, watchlistAPI, DiscoverFilters } from '../services/api';
import { SwipeDirection, SwipeAction, SwipeSessionStats, RatingModalState, UseSwipeDiscoverReturn } from '../types/discover';

const PREFETCH_THRESHOLD = 10;
const MAX_UNDO_HISTORY = 3;

const initialStats: SwipeSessionStats = {
  wantToWatch: 0,
  notInterested: 0,
  alreadyWatched: 0,
  skipped: 0,
  total: 0,
};

export const useSwipeDiscover = (category: DiscoverCategory = 'for_you', filters?: DiscoverFilters): UseSwipeDiscoverReturn => {
  const [cardStack, setCardStack] = useState<DiscoverMovie[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<SwipeSessionStats>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const [prefetchFailed, setPrefetchFailed] = useState(false); // Prevent retry spam
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingModal, setRatingModal] = useState<RatingModalState>({
    isOpen: false,
    movie: null,
  });
  const prevCategoryRef = useRef(category);
  const prevFiltersRef = useRef(filters);

  // Load movies for the current category
  const loadMovies = useCallback(async (page: number = 1) => {
    try {
      const response = await discoverAPI.get(category, page, filters);
      const newMovies = response.data.movies.filter(
        (movie) => !seenIds.has(movie.id)
      );
      return { movies: newMovies, totalPages: response.data.total_pages };
    } catch (err) {
      console.error('Failed to load movies:', err);
      throw err;
    }
  }, [category, seenIds, filters]);

  // Reset when category or filters change
  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== category;
    const filtersChanged = prevFiltersRef.current?.genre !== filters?.genre ||
                           prevFiltersRef.current?.style !== filters?.style;

    if (categoryChanged || filtersChanged) {
      prevCategoryRef.current = category;
      prevFiltersRef.current = filters;
      setCardStack([]);
      setSwipeHistory([]);
      setStats(initialStats);
      setSeenIds(new Set());
      setCurrentPage(1);
      setError(null);
      setPrefetchFailed(false); // Reset prefetch error state
      setRatingModal({ isOpen: false, movie: null });
    }
  }, [category, filters]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { movies } = await loadMovies(1);
        setCardStack(movies);
        setSeenIds(new Set(movies.map((m) => m.id)));
        setCurrentPage(1);
      } catch (err) {
        setError('Failed to load movies. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, filters?.genre, filters?.style]);

  // Pre-fetch when running low on cards
  useEffect(() => {
    const prefetch = async () => {
      // Don't retry if prefetch already failed for this session
      if (cardStack.length <= PREFETCH_THRESHOLD && !isPrefetching && !isLoading && !prefetchFailed) {
        setIsPrefetching(true);
        try {
          const nextPage = currentPage + 1;
          const { movies: newMovies } = await loadMovies(nextPage);
          if (newMovies.length > 0) {
            setCardStack((prev) => [...prev, ...newMovies]);
            setSeenIds((prev) => {
              const updated = new Set(prev);
              newMovies.forEach((m) => updated.add(m.id));
              return updated;
            });
            setCurrentPage(nextPage);
          }
        } catch (err) {
          console.error('Pre-fetch failed:', err);
          // Mark prefetch as failed to prevent infinite retry loop
          setPrefetchFailed(true);
        } finally {
          setIsPrefetching(false);
        }
      }
    };
    prefetch();
  }, [cardStack.length, isPrefetching, isLoading, loadMovies, currentPage, prefetchFailed]);

  // Update stats helper
  const updateStats = useCallback((type: 'wantToWatch' | 'notInterested' | 'alreadyWatched' | 'skipped', increment: number) => {
    setStats((prev) => ({
      ...prev,
      [type]: prev[type] + increment,
      total: prev.total + increment,
    }));
  }, []);

  // Handle swipe gesture
  const swipe = useCallback(
    async (direction: SwipeDirection) => {
      if (cardStack.length === 0 || isProcessing) return;

      const movie = cardStack[0];

      // Skip is handled separately (no API call)
      if (direction === 'down') {
        setCardStack((prev) => prev.slice(1));
        updateStats('skipped', 1);

        // Add to undo history (skip actions can be undone locally)
        const swipeAction: SwipeAction = {
          movie,
          action: 'SKIP',
          apiRecordId: undefined,
          timestamp: Date.now(),
        };
        setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));
        return;
      }

      setIsProcessing(true);
      // Optimistic update - remove card immediately
      setCardStack((prev) => prev.slice(1));

      try {
        let apiRecordId: string | undefined;
        let action: 'WATCHLIST' | 'NOT_INTERESTED';

        if (direction === 'right') {
          // Add to watchlist
          const response = await watchlistAPI.add(movie.id);
          apiRecordId = response.data.id;
          action = 'WATCHLIST';
          updateStats('wantToWatch', 1);
        } else {
          // Mark as not interested (left swipe)
          const response = await userMoviesAPI.add(movie.id, 'NOT_INTERESTED', false);
          apiRecordId = response.data.id;
          action = 'NOT_INTERESTED';
          updateStats('notInterested', 1);
        }

        // Add to undo history
        const swipeAction: SwipeAction = {
          movie,
          action,
          apiRecordId,
          timestamp: Date.now(),
        };

        setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));
      } catch (err: any) {
        console.error('Failed to process swipe:', err);

        if (err.response?.status === 400) {
          // Movie already rated or in watchlist - card already removed, that's fine
        } else if (err.response?.status === 500) {
          // Server error - rollback and restore card
          setCardStack((prev) => [movie, ...prev]);
          setError('Server error. Please try again later.');
        } else {
          // Network or other error - rollback and restore card
          setCardStack((prev) => [movie, ...prev]);
          setError('Connection error. Please check your internet.');
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [cardStack, isProcessing, updateStats]
  );

  // Skip current movie (no API call, just remove from stack)
  const skip = useCallback(() => {
    swipe('down');
  }, [swipe]);

  // Rating modal handlers
  const openRatingModal = useCallback(() => {
    if (cardStack.length === 0 || isProcessing) return;
    setRatingModal({
      isOpen: true,
      movie: cardStack[0],
    });
  }, [cardStack, isProcessing]);

  const closeRatingModal = useCallback(() => {
    setRatingModal({
      isOpen: false,
      movie: null,
    });
  }, []);

  // Submit rating from modal (for already watched movies)
  const submitRating = useCallback(
    async (rating: Rating) => {
      const movie = ratingModal.movie;
      if (!movie || isProcessing) return;

      setIsProcessing(true);
      // Optimistic update - remove card immediately
      setCardStack((prev) => prev.slice(1));
      closeRatingModal();

      try {
        const response = await userMoviesAPI.add(movie.id, rating, true);

        updateStats('alreadyWatched', 1);

        // Add to undo history
        const swipeAction: SwipeAction = {
          movie,
          action: rating,
          apiRecordId: response.data.id,
          timestamp: Date.now(),
        };

        setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));
      } catch (err: any) {
        console.error('Failed to rate movie:', err);

        // Rollback
        setCardStack((prev) => [movie, ...prev]);

        if (err.response?.status === 400) {
          // Already rated - remove from stack anyway
          setCardStack((prev) => prev.filter((m) => m.id !== movie.id));
        } else {
          setError('Failed to save rating. Please try again.');
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [ratingModal.movie, isProcessing, closeRatingModal, updateStats]
  );

  // Undo last action
  const undo = useCallback(async () => {
    if (swipeHistory.length === 0 || isProcessing) return;

    const lastAction = swipeHistory[0];
    setIsProcessing(true);

    try {
      // Delete the API record
      if (lastAction.apiRecordId) {
        if (lastAction.action === 'WATCHLIST') {
          await watchlistAPI.remove(lastAction.apiRecordId);
        } else {
          await userMoviesAPI.delete(lastAction.apiRecordId);
        }
      }

      // Restore card to stack
      setCardStack((prev) => [lastAction.movie, ...prev]);

      // Update stats (decrement)
      if (lastAction.action === 'WATCHLIST') {
        updateStats('wantToWatch', -1);
      } else if (lastAction.action === 'NOT_INTERESTED') {
        updateStats('notInterested', -1);
      } else if (lastAction.action === 'SKIP') {
        updateStats('skipped', -1);
      } else {
        // It was a rating from modal
        updateStats('alreadyWatched', -1);
      }

      // Remove from history
      setSwipeHistory((prev) => prev.slice(1));
    } catch (err) {
      console.error('Failed to undo:', err);
      setError('Failed to undo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [swipeHistory, isProcessing, updateStats]);

  // Load more movies manually
  const loadMore = useCallback(async () => {
    if (isLoading || isPrefetching) return;

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const { movies: newMovies } = await loadMovies(nextPage);
      setCardStack((prev) => [...prev, ...newMovies]);
      setSeenIds((prev) => {
        const updated = new Set(prev);
        newMovies.forEach((m) => updated.add(m.id));
        return updated;
      });
      setCurrentPage(nextPage);
    } catch (err) {
      setError('Failed to load more movies.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isPrefetching, loadMovies, currentPage]);

  // Reset session
  const reset = useCallback(() => {
    setCardStack([]);
    setSwipeHistory([]);
    setStats(initialStats);
    setSeenIds(new Set());
    setError(null);
    setPrefetchFailed(false);
    setRatingModal({ isOpen: false, movie: null });
  }, []);

  return {
    cards: cardStack,
    currentCard: cardStack[0] || null,
    isLoading,
    isPrefetching,
    isProcessing,
    stats,
    error,
    canUndo: swipeHistory.length > 0,
    ratingModal,
    swipe,
    skip,
    openRatingModal,
    closeRatingModal,
    submitRating,
    undo,
    loadMore,
    reset,
  };
};
