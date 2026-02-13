import React, { useState, useEffect, useRef, useCallback } from 'react';
import { discoverAPI, userMoviesAPI, watchlistAPI, DiscoverMovie, DiscoverCategory, Rating, moviesAPI, TMDBMovie, DiscoverFilters, MovieStyle } from '../services/api';
import MovieCard from '../components/Movies/MovieCard';
import MovieDetailModal from '../components/Movies/MovieDetailModal';
import { SwipeCardStack, SwipeControls, RatingModal, FilterBar } from '../components/Discover';
import { useSwipeDiscover } from '../hooks/useSwipeDiscover';
import type { SwipeDirection } from '../types/discover';

type ViewMode = 'grid' | 'swipe';

interface CategoryCache {
  movies: DiscoverMovie[];
  page: number;
  hasMore: boolean;
  seenIds: Set<number>;
}

const CATEGORY_TABS: { id: DiscoverCategory; label: string }[] = [
  { id: 'for_you', label: 'For You' },
  { id: 'popular', label: 'Popular' },
  { id: 'new_releases', label: 'New Releases' },
  { id: 'top_rated', label: 'Top Rated' }
];

const createEmptyCache = (): CategoryCache => ({
  movies: [],
  page: 0,
  hasMore: true,
  seenIds: new Set()
});

const Recommendations: React.FC = () => {
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2000);
  };

  // Category state
  const [category, setCategory] = useState<DiscoverCategory>('for_you');
  const [categoryCache, setCategoryCache] = useState<Record<DiscoverCategory, CategoryCache>>({
    for_you: createEmptyCache(),
    popular: createEmptyCache(),
    new_releases: createEmptyCache(),
    top_rated: createEmptyCache()
  });

  // Search state
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'category' | 'search'>('category');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false); // Prevent infinite retry on error
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Movie detail modal state
  const [detailModal, setDetailModal] = useState<{ movie: DiscoverMovie | TMDBMovie; isOpen: boolean } | null>(null);

  // Filter state
  const [filters, setFilters] = useState<DiscoverFilters>({
    genre: null,
    style: 'all' as MovieStyle
  });

  // Track filter version to force reload when filters change
  const [filterVersion, setFilterVersion] = useState(0);
  const prevFiltersRef = useRef(filters);

  // Clear cache and bump version when filters change
  useEffect(() => {
    const filtersChanged = prevFiltersRef.current.genre !== filters.genre ||
                           prevFiltersRef.current.style !== filters.style;

    if (filtersChanged) {
      prevFiltersRef.current = filters;
      // Clear all caches when filters change
      setCategoryCache({
        for_you: createEmptyCache(),
        popular: createEmptyCache(),
        new_releases: createEmptyCache(),
        top_rated: createEmptyCache()
      });
      // Reset load failed state
      setLoadFailed(false);
      // Bump version to trigger reload in the other effect
      setFilterVersion(v => v + 1);
    }
  }, [filters.genre, filters.style]);

  // View mode state (persisted to localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('recommendationsViewMode');
    return (saved as ViewMode) || 'grid';
  });

  // Swipe view hook - pass current category and filters
  const swipeDiscover = useSwipeDiscover(category, filters);

  // Persist view mode preference and clear grid cache when switching from swipe to grid
  // (to ensure movies added to watchlist/rated in swipe mode are filtered out)
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    localStorage.setItem('recommendationsViewMode', viewMode);

    // Clear grid cache when switching from swipe to grid
    if (prevViewModeRef.current === 'swipe' && viewMode === 'grid') {
      setCategoryCache({
        for_you: createEmptyCache(),
        popular: createEmptyCache(),
        new_releases: createEmptyCache(),
        top_rated: createEmptyCache()
      });
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

  // Keyboard shortcuts for swipe view
  useEffect(() => {
    if (viewMode !== 'swipe' || swipeDiscover.isLoading || swipeDiscover.cards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Don't trigger if modal is open
      if (swipeDiscover.ratingModal.isOpen) return;

      // Use triggerSwipe from SwipeCardStack for animation
      const triggerSwipe = (window as any).__triggerSwipe;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (triggerSwipe) triggerSwipe('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (triggerSwipe) triggerSwipe('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (triggerSwipe) triggerSwipe('down');
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            swipeDiscover.undo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, swipeDiscover]);

  // Load category movies on mount, category change, or filter change
  useEffect(() => {
    if (viewMode === 'grid' && activeTab === 'category' && categoryCache[category].movies.length === 0) {
      loadCategoryMovies(category, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, activeTab, viewMode, filterVersion]);

  const loadCategoryMovies = useCallback(async (cat: DiscoverCategory, isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const page = isInitial ? 1 : categoryCache[cat].page + 1;
      const response = await discoverAPI.get(cat, page, filters);
      const newMovies = response.data.movies;

      setCategoryCache(prev => {
        const currentCache = prev[cat];
        const existingSeenIds = isInitial ? new Set<number>() : currentCache.seenIds;
        const uniqueNewMovies = newMovies.filter(m => !existingSeenIds.has(m.id));

        const updatedSeenIds = new Set(existingSeenIds);
        uniqueNewMovies.forEach(m => updatedSeenIds.add(m.id));

        return {
          ...prev,
          [cat]: {
            movies: isInitial ? uniqueNewMovies : [...currentCache.movies, ...uniqueNewMovies],
            page: response.data.page,
            hasMore: response.data.page < response.data.total_pages,
            seenIds: updatedSeenIds
          }
        };
      });
    } catch (error) {
      console.error(`Failed to load ${cat} movies:`, error);
      // Set loadFailed to prevent infinite retry from IntersectionObserver
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [categoryCache, filters]);

  // Infinite scroll observer for grid view
  useEffect(() => {
    if (viewMode !== 'grid' || activeTab !== 'category') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't retry if previous load failed (prevents infinite loop on 429 errors)
        if (entries[0].isIntersecting && !isLoading && !isLoadingMore && !loadFailed && categoryCache[category].hasMore) {
          loadCategoryMovies(category, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [viewMode, activeTab, category, isLoading, isLoadingMore, loadFailed, categoryCache, loadCategoryMovies]);

  // Handle category change
  const handleCategoryChange = (newCategory: DiscoverCategory) => {
    setCategory(newCategory);
    setActiveTab('category');
    setLoadFailed(false); // Reset error state on category change
    // Load if not already cached
    if (categoryCache[newCategory].movies.length === 0) {
      loadCategoryMovies(newCategory, true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await moviesAPI.search(searchQuery);
      setSearchResults(response.data.results);
      setActiveTab('search');
    } catch (error) {
      console.error('Failed to search movies:', error);
      alert('Failed to search movies');
    } finally {
      setIsSearching(false);
    }
  };

  // Remove movie from all caches
  const removeMovieFromCaches = (tmdbId: number) => {
    setCategoryCache(prev => {
      const updated = { ...prev };
      for (const cat of Object.keys(updated) as DiscoverCategory[]) {
        updated[cat] = {
          ...updated[cat],
          movies: updated[cat].movies.filter(m => m.id !== tmdbId)
        };
      }
      return updated;
    });
    setSearchResults(prev => prev.filter(r => r.id !== tmdbId));
  };

  const handleRate = async (tmdbId: number, rating: Rating) => {
    try {
      await userMoviesAPI.add(tmdbId, rating, true);
      removeMovieFromCaches(tmdbId);
    } catch (error: any) {
      console.error('Failed to rate movie:', error);
      if (error.response?.status === 400) {
        alert('You have already rated this movie!');
      } else {
        alert('Failed to add movie');
      }
    }
  };

  const handleAddToWatchlist = async (tmdbId: number) => {
    try {
      await watchlistAPI.add(tmdbId);
      showToast('Added to watchlist');
      removeMovieFromCaches(tmdbId);
    } catch (error: any) {
      console.error('Failed to add to watchlist:', error);
      if (error.response?.status === 400) {
        alert('Movie is already in your watchlist!');
      } else {
        alert('Failed to add to watchlist');
      }
    }
  };

  const handleNotInterested = async (tmdbId: number) => {
    try {
      await userMoviesAPI.add(tmdbId, 'NOT_INTERESTED', false);
      removeMovieFromCaches(tmdbId);
    } catch (error: any) {
      console.error('Failed to mark as not interested:', error);
      if (error.response?.status === 400) {
        alert('You have already rated this movie!');
      } else {
        alert('Failed to mark as not interested');
      }
    }
  };

  // Modal handlers
  const handleOpenModal = (movie: DiscoverMovie | TMDBMovie) => {
    setDetailModal({ movie, isOpen: true });
  };

  const handleCloseModal = () => {
    setDetailModal(null);
  };

  const handleModalRate = async (rating: Rating) => {
    if (!detailModal) return;
    await handleRate(detailModal.movie.id, rating);
    setDetailModal(null);
  };

  const handleModalAddToWatchlist = async () => {
    if (!detailModal) return;
    await handleAddToWatchlist(detailModal.movie.id);
    setDetailModal(null);
  };

  // Swipe handlers
  const handleSwipe = (direction: SwipeDirection, _movie: DiscoverMovie) => {
    swipeDiscover.swipe(direction);
  };

  const handleCardLeftScreen = (_movie: DiscoverMovie) => {
    // Card animation completed
  };

  return (
    <div className="relative">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Discover Movies</h1>

        {/* View mode toggle */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Grid</span>
            </span>
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center ${
              viewMode === 'swipe'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Swipe</span>
            </span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          {/* Filter Bar */}
          <FilterBar
            selectedGenre={filters.genre ?? null}
            selectedStyle={filters.style ?? 'all'}
            onGenreChange={(genre) => setFilters(f => ({ ...f, genre }))}
            onStyleChange={(style) => setFilters(f => ({ ...f, style }))}
          />

          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 mb-6 border border-slate-700">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for movies..."
                className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed min-h-[48px]"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="flex space-x-1 mb-6 border-b border-slate-700 overflow-x-auto scrollbar-hide">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] ${
                  activeTab === 'category' && category === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {searchResults.length > 0 && (
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] ${
                  activeTab === 'search'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Search Results ({searchResults.length})
              </button>
            )}
          </div>

          {activeTab === 'category' && (
            <>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-white text-xl">Loading movies...</div>
                </div>
              ) : categoryCache[category].movies.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <div className="text-6xl mb-4">&#127916;</div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {category === 'for_you' ? 'No recommendations yet' : 'No movies found'}
                  </h2>
                  <p className="text-slate-400 mb-4">
                    {category === 'for_you'
                      ? 'Rate some movies first to get personalized recommendations!'
                      : 'Try another category or search for movies.'}
                  </p>
                  {category === 'for_you' && (
                    <p className="text-slate-300 mb-6">Use the search bar above to find and rate movies.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryCache[category].movies.map((movie) => (
                      <div key={movie.id}>
                        <MovieCard
                          movie={movie}
                          onRate={handleRate}
                          onAddToWatchlist={handleAddToWatchlist}
                          onNotInterested={handleNotInterested}
                          onClick={handleOpenModal}
                        />
                        {movie.reasons && movie.reasons.length > 0 && (
                          <div className="mt-2 bg-blue-900/20 border border-blue-700/30 rounded p-2">
                            <p className="text-blue-300 text-xs">
                              <span aria-hidden="true">&#128161; </span>{movie.reasons[0]}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Infinite scroll trigger */}
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    {isLoadingMore && (
                      <div className="text-slate-400">Loading more movies...</div>
                    )}
                    {!isLoadingMore && categoryCache[category].hasMore && (
                      <div className="text-slate-500 text-sm">Scroll for more</div>
                    )}
                    {!categoryCache[category].hasMore && categoryCache[category].movies.length > 0 && (
                      <div className="text-slate-500 text-sm">
                        {category === 'for_you'
                          ? "You've seen all recommendations. Rate some movies to get more!"
                          : "You've reached the end."}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'search' && (
            <>
              {searchResults.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <div className="text-6xl mb-4">&#128269;</div>
                  <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
                  <p className="text-slate-400">Try searching for a different movie</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {searchResults.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onRate={handleRate}
                      onAddToWatchlist={handleAddToWatchlist}
                      onNotInterested={handleNotInterested}
                      onClick={handleOpenModal}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Swipe View */}
      {viewMode === 'swipe' && (
        <div className="flex flex-col items-center">
          {/* Filter Bar for swipe view (genre only) */}
          <div className="w-full max-w-md mb-4">
            <FilterBar
              selectedGenre={filters.genre ?? null}
              selectedStyle={filters.style ?? 'all'}
              onGenreChange={(genre) => setFilters(f => ({ ...f, genre }))}
              onStyleChange={(style) => setFilters(f => ({ ...f, style }))}
              hideStyleFilter
            />
          </div>

          {/* Session stats */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-6 text-xs sm:text-sm justify-center w-full max-w-md">
            <div className="bg-blue-900/30 text-blue-400 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-center">
              <span aria-hidden="true">&#128278; </span>{swipeDiscover.stats.wantToWatch} <span className="hidden sm:inline">Want to </span>Watch
            </div>
            <div className="bg-slate-700/50 text-slate-400 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-center">
              <span aria-hidden="true">&#10060; </span>{swipeDiscover.stats.notInterested} <span className="hidden sm:inline">Not </span>Skip<span className="hidden sm:inline">ped</span>
            </div>
            <div className="bg-purple-900/30 text-purple-400 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-center">
              <span aria-hidden="true">&#127916; </span>{swipeDiscover.stats.alreadyWatched} Rated
            </div>
            <div className="bg-slate-700/50 text-slate-400 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-center">
              <span aria-hidden="true">&#8594; </span>{swipeDiscover.stats.skipped} Skipped
            </div>
          </div>

          {/* Loading state */}
          {swipeDiscover.isLoading && (
            <div className="flex justify-center items-center h-[65vh] sm:h-[70vh] max-h-[500px]">
              <div className="text-white text-xl">Loading movies...</div>
            </div>
          )}

          {/* Error state */}
          {swipeDiscover.error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
              {swipeDiscover.error}
            </div>
          )}

          {/* Empty state */}
          {!swipeDiscover.isLoading && swipeDiscover.cards.length === 0 && (
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700 max-w-md">
              <div className="text-6xl mb-4">&#127916;</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                You've seen all recommendations!
              </h2>
              <p className="text-slate-400 mb-4">
                This session you've processed {swipeDiscover.stats.total} movies.
              </p>
              <div className="text-sm text-slate-300 mb-6 space-y-1">
                <p>Added to watchlist: {swipeDiscover.stats.wantToWatch}</p>
                <p>Not interested: {swipeDiscover.stats.notInterested}</p>
                <p>Already watched & rated: {swipeDiscover.stats.alreadyWatched}</p>
                <p>Skipped: {swipeDiscover.stats.skipped}</p>
              </div>
              <button
                onClick={swipeDiscover.loadMore}
                disabled={swipeDiscover.isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-800"
              >
                Load More Movies
              </button>
            </div>
          )}

          {/* Card stack */}
          {!swipeDiscover.isLoading && swipeDiscover.cards.length > 0 && (
            <>
              <SwipeCardStack
                cards={swipeDiscover.cards}
                onSwipe={handleSwipe}
                onCardLeftScreen={handleCardLeftScreen}
                isProcessing={swipeDiscover.isProcessing}
              />

              {/* Controls */}
              <SwipeControls
                onUndo={swipeDiscover.undo}
                onAlreadyWatched={swipeDiscover.openRatingModal}
                onSkip={() => {
                  // Use triggerSwipe to animate the card before removing
                  const triggerSwipe = (window as any).__triggerSwipe;
                  if (triggerSwipe) {
                    triggerSwipe('down');
                  }
                }}
                canUndo={swipeDiscover.canUndo}
                isProcessing={swipeDiscover.isProcessing}
              />

              {/* Swipe hints */}
              <div className="text-slate-500 text-xs text-center mt-2 space-y-1 px-4">
                <p>Swipe right to add to watchlist, left if not interested, down to skip</p>
                <p className="hidden sm:block">Keyboard: Arrow keys (Left/Right/Down), Ctrl+Z to undo</p>
              </div>

              {/* Rating Modal */}
              <RatingModal
                isOpen={swipeDiscover.ratingModal.isOpen}
                movie={swipeDiscover.ratingModal.movie}
                onClose={swipeDiscover.closeRatingModal}
                onRate={swipeDiscover.submitRating}
                isProcessing={swipeDiscover.isProcessing}
              />

              {/* Pre-fetching indicator */}
              {swipeDiscover.isPrefetching && (
                <div className="text-slate-400 text-xs mt-2">
                  Loading more movies...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Toast notification */}
      <div
        className={`fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 z-50 ${
          toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {toast.message}
      </div>

      {/* Movie Detail Modal */}
      {detailModal?.isOpen && (
        <MovieDetailModal
          movie={detailModal.movie}
          tmdbId={detailModal.movie.id}
          onClose={handleCloseModal}
          onRate={handleModalRate}
          onAddToWatchlist={handleModalAddToWatchlist}
        />
      )}
    </div>
  );
};

export default Recommendations;
