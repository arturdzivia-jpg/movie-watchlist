import { useState, useCallback, useEffect, useRef } from 'react';
import { DiscoverMovie, DiscoverCategory, Rating, discoverAPI, userMoviesAPI, watchlistAPI } from '../services/api';
import { SwipeDirection, SwipeAction, SwipeSessionStats, UseSwipeDiscoverReturn } from '../types/discover';

const PREFETCH_THRESHOLD = 10;
const MAX_UNDO_HISTORY = 3;

const initialStats: SwipeSessionStats = {
  liked: 0,
  disliked: 0,
  ok: 0,
  superLiked: 0,
  watchlisted: 0,
  skipped: 0,
  total: 0,
};

export const useSwipeDiscover = (category: DiscoverCategory = 'for_you'): UseSwipeDiscoverReturn => {
  const [cardStack, setCardStack] = useState<DiscoverMovie[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<SwipeSessionStats>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const prevCategoryRef = useRef(category);

  // Load movies for the current category
  const loadMovies = useCallback(async (page: number = 1) => {
    try {
      const response = await discoverAPI.get(category, page);
      const newMovies = response.data.movies.filter(
        (movie) => !seenIds.has(movie.id)
      );
      return { movies: newMovies, totalPages: response.data.total_pages };
    } catch (err) {
      console.error('Failed to load movies:', err);
      throw err;
    }
  }, [category, seenIds]);

  // Reset when category changes
  useEffect(() => {
    if (prevCategoryRef.current !== category) {
      prevCategoryRef.current = category;
      setCardStack([]);
      setSwipeHistory([]);
      setStats(initialStats);
      setSeenIds(new Set());
      setCurrentPage(1);
      setError(null);
    }
  }, [category]);

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
  }, [category]);

  // Pre-fetch when running low on cards
  useEffect(() => {
    const prefetch = async () => {
      if (cardStack.length <= PREFETCH_THRESHOLD && !isPrefetching && !isLoading) {
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
        } finally {
          setIsPrefetching(false);
        }
      }
    };
    prefetch();
  }, [cardStack.length, isPrefetching, isLoading, loadMovies, currentPage]);

  // Map swipe direction to rating
  const directionToRating = (direction: SwipeDirection): Rating | null => {
    switch (direction) {
      case 'left':
        return 'DISLIKE';
      case 'right':
        return 'LIKE';
      case 'up':
        return null; // Watchlist, not a rating
      case 'down':
        return null; // Skip, not a rating
      default:
        return null;
    }
  };

  // Update stats based on action
  const updateStats = useCallback((action: Rating | 'WATCHLIST' | 'SKIP', increment: number) => {
    setStats((prev) => {
      const updated = { ...prev };
      updated.total += increment;
      switch (action) {
        case 'LIKE':
          updated.liked += increment;
          break;
        case 'DISLIKE':
          updated.disliked += increment;
          break;
        case 'OK':
          updated.ok += increment;
          break;
        case 'SUPER_LIKE':
          updated.superLiked += increment;
          break;
        case 'WATCHLIST':
          updated.watchlisted += increment;
          break;
        case 'SKIP':
          updated.skipped += increment;
          break;
      }
      return updated;
    });
  }, []);

  // Handle swipe gesture
  const swipe = useCallback(
    async (direction: SwipeDirection) => {
      if (cardStack.length === 0 || isProcessing) return;

      const movie = cardStack[0];
      const rating = directionToRating(direction);

      setIsProcessing(true);

      // Optimistic update - remove card immediately
      setCardStack((prev) => prev.slice(1));

      try {
        let apiRecordId: string | undefined;

        if (direction === 'down') {
          // Skip - no API call, just remove from stack
          updateStats('SKIP', 1);
          // Add to undo history (skip actions can be undone locally)
          const swipeAction: SwipeAction = {
            movie,
            action: 'SKIP',
            apiRecordId: undefined,
            timestamp: Date.now(),
          };
          setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));
          setIsProcessing(false);
          return;
        } else if (direction === 'up') {
          // Add to watchlist
          const response = await watchlistAPI.add(movie.id);
          apiRecordId = response.data.id;
          updateStats('WATCHLIST', 1);
        } else if (rating) {
          // Rate movie
          const response = await userMoviesAPI.add(movie.id, rating, true);
          apiRecordId = response.data.id;
          updateStats(rating, 1);
        }

        // Add to undo history
        const swipeAction: SwipeAction = {
          movie,
          action: direction === 'up' ? 'WATCHLIST' : rating!,
          apiRecordId,
          timestamp: Date.now(),
        };

        setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));
      } catch (err: any) {
        console.error('Failed to process swipe:', err);

        if (err.response?.status === 400) {
          // Movie already rated or in watchlist - card already removed, that's fine
          // Just don't add to undo history since there's nothing to undo
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

  // Handle button rating (OK, SUPER_LIKE)
  const rateWithButton = useCallback(
    async (rating: Rating) => {
      if (cardStack.length === 0 || isProcessing) return;

      const movie = cardStack[0];

      setIsProcessing(true);

      // Optimistic update
      setCardStack((prev) => prev.slice(1));

      try {
        const response = await userMoviesAPI.add(movie.id, rating, true);

        updateStats(rating, 1);

        // Add to undo history
        const swipeAction: SwipeAction = {
          movie,
          action: rating,
          apiRecordId: response.data.id,
          timestamp: Date.now(),
        };

        setSwipeHistory((prev) => [swipeAction, ...prev].slice(0, MAX_UNDO_HISTORY));

        // Trigger visual card removal
        if ((window as any).__triggerSwipe) {
          // Card already removed, skip visual swipe
        }
      } catch (err: any) {
        console.error('Failed to rate movie:', err);

        // Rollback
        setCardStack((prev) => [movie, ...prev]);

        if (err.response?.status === 400) {
          setCardStack((prev) => prev.filter((m) => m.id !== movie.id));
        } else {
          setError('Failed to save. Please try again.');
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [cardStack, isProcessing, updateStats]
  );

  // Undo last swipe
  const undo = useCallback(async () => {
    if (swipeHistory.length === 0 || isProcessing) return;

    const lastAction = swipeHistory[0];
    setIsProcessing(true);

    try {
      // Delete the API record (skip actions have no API record)
      if (lastAction.apiRecordId) {
        if (lastAction.action === 'WATCHLIST') {
          await watchlistAPI.remove(lastAction.apiRecordId);
        } else if (lastAction.action !== 'SKIP') {
          await userMoviesAPI.delete(lastAction.apiRecordId);
        }
      }

      // Restore card to stack
      setCardStack((prev) => [lastAction.movie, ...prev]);

      // Update stats (decrement)
      updateStats(lastAction.action, -1);

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

  // Skip current movie (no rating, no watchlist)
  const skip = useCallback(async () => {
    if (cardStack.length === 0 || isProcessing) return;
    await swipe('down');
  }, [cardStack.length, isProcessing, swipe]);

  // Reset session
  const reset = useCallback(() => {
    setCardStack([]);
    setSwipeHistory([]);
    setStats(initialStats);
    setSeenIds(new Set());
    setError(null);
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
    swipe,
    rateWithButton,
    skip,
    undo,
    loadMore,
    reset,
  };
};
