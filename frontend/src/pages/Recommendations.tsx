import React, { useState, useEffect } from 'react';
import { recommendationsAPI, userMoviesAPI, watchlistAPI, Recommendation, Rating, moviesAPI, TMDBMovie } from '../services/api';
import MovieCard from '../components/Movies/MovieCard';
import { SwipeCardStack, SwipeControls } from '../components/Discover';
import { useSwipeDiscover } from '../hooks/useSwipeDiscover';
import { SwipeDirection } from '../types/discover';

type ViewMode = 'grid' | 'swipe';

const Recommendations: React.FC = () => {
  // Grid view state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'search'>('recommended');

  // View mode state (persisted to localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('recommendationsViewMode');
    return (saved as ViewMode) || 'grid';
  });

  // Swipe view hook
  const swipeDiscover = useSwipeDiscover();

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('recommendationsViewMode', viewMode);
  }, [viewMode]);

  // Load grid recommendations
  useEffect(() => {
    if (viewMode === 'grid' && activeTab === 'recommended') {
      loadRecommendations();
    }
  }, [activeTab, viewMode]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      const response = await recommendationsAPI.get(20);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
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

  const handleRate = async (tmdbId: number, rating: Rating) => {
    try {
      await userMoviesAPI.add(tmdbId, rating, true);
      alert('Movie added to your list!');

      // Remove from recommendations/search results
      setRecommendations(recommendations.filter(r => r.id !== tmdbId));
      setSearchResults(searchResults.filter(r => r.id !== tmdbId));
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
      alert('Movie added to watchlist!');

      // Remove from recommendations/search results
      setRecommendations(recommendations.filter(r => r.id !== tmdbId));
      setSearchResults(searchResults.filter(r => r.id !== tmdbId));
    } catch (error: any) {
      console.error('Failed to add to watchlist:', error);
      if (error.response?.status === 400) {
        alert('Movie is already in your watchlist!');
      } else {
        alert('Failed to add to watchlist');
      }
    }
  };

  // Swipe handlers
  const handleSwipe = (direction: SwipeDirection, _movie: Recommendation) => {
    swipeDiscover.swipe(direction);
  };

  const handleCardLeftScreen = (_movie: Recommendation) => {
    // Card animation completed
  };

  const triggerSwipe = (direction: SwipeDirection) => {
    if ((window as any).__triggerSwipe) {
      (window as any).__triggerSwipe(direction);
    }
    swipeDiscover.swipe(direction);
  };

  return (
    <div>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Discover Movies</h1>

        {/* View mode toggle */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </span>
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'swipe'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Swipe
            </span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for movies..."
                className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="flex space-x-4 mb-6 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'recommended'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Recommended for You
            </button>
            {searchResults.length > 0 && (
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Search Results ({searchResults.length})
              </button>
            )}
          </div>

          {activeTab === 'recommended' && (
            <>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-white text-xl">Loading recommendations...</div>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                  <div className="text-6xl mb-4">&#127916;</div>
                  <h2 className="text-xl font-semibold text-white mb-2">No recommendations yet</h2>
                  <p className="text-slate-400 mb-4">
                    Rate some movies first to get personalized recommendations!
                  </p>
                  <p className="text-slate-300 mb-6">Use the search bar above to find and rate movies.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.map((movie) => (
                    <div key={movie.id}>
                      <MovieCard
                        movie={movie}
                        onRate={handleRate}
                        onAddToWatchlist={handleAddToWatchlist}
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
          {/* Session stats */}
          <div className="flex gap-4 mb-6 text-sm">
            <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full">
              <span aria-hidden="true">&#128077; </span>{swipeDiscover.stats.liked}
            </div>
            <div className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full">
              <span aria-hidden="true">&#128078; </span>{swipeDiscover.stats.disliked}
            </div>
            <div className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full">
              <span aria-hidden="true">&#128278; </span>{swipeDiscover.stats.watchlisted}
            </div>
          </div>

          {/* Loading state */}
          {swipeDiscover.isLoading && (
            <div className="flex justify-center items-center h-[500px]">
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
                This session you've rated {swipeDiscover.stats.total} movies.
              </p>
              <div className="text-sm text-slate-300 mb-6 space-y-1">
                <p>Liked: {swipeDiscover.stats.liked + swipeDiscover.stats.superLiked}</p>
                <p>Disliked: {swipeDiscover.stats.disliked}</p>
                <p>OK: {swipeDiscover.stats.ok}</p>
                <p>Added to watchlist: {swipeDiscover.stats.watchlisted}</p>
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
                onSwipeLeft={() => triggerSwipe('left')}
                onSwipeRight={() => triggerSwipe('right')}
                onSwipeUp={() => triggerSwipe('up')}
                onRate={swipeDiscover.rateWithButton}
                onUndo={swipeDiscover.undo}
                canUndo={swipeDiscover.canUndo}
                isProcessing={swipeDiscover.isProcessing}
              />

              {/* Swipe hints */}
              <div className="text-slate-500 text-xs text-center mt-2 space-y-1">
                <p>Swipe left to dislike, right to like, up for watchlist</p>
                <p>or use the buttons below</p>
              </div>

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
    </div>
  );
};

export default Recommendations;
