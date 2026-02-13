import React, { useState, useEffect } from 'react';
import { recommendationsAPI, userMoviesAPI, watchlistAPI, Recommendation, Rating, moviesAPI, TMDBMovie } from '../services/api';
import MovieCard from '../components/Movies/MovieCard';

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'search'>('recommended');

  useEffect(() => {
    if (activeTab === 'recommended') {
      loadRecommendations();
    }
  }, [activeTab]);

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Discover Movies</h1>

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
          Recommended for You ✨
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
              <div className="text-6xl mb-4">🎬</div>
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
                        💡 {movie.reasons[0]}
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
              <div className="text-6xl mb-4">🔍</div>
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
    </div>
  );
};

export default Recommendations;
