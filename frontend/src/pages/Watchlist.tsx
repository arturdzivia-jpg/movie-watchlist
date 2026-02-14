import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { watchlistAPI, WatchlistItem, Rating } from '../services/api';
import MovieDetailModal from '../components/Movies/MovieDetailModal';

interface Genre {
  id: number;
  name: string;
}

const Watchlist: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingWatched, setMarkingWatched] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await watchlistAPI.getAll();
      setWatchlist(response.data);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      setError('Failed to load watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this movie from your watchlist?')) {
      return;
    }

    const previousWatchlist = watchlist;
    // Optimistic update
    setWatchlist(watchlist.filter(item => item.id !== id));
    try {
      await watchlistAPI.remove(id);
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
      // Rollback on error
      setWatchlist(previousWatchlist);
      setError('Failed to remove from watchlist. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMarkWatched = async (id: string, rating: Rating) => {
    const previousWatchlist = watchlist;
    try {
      setMarkingWatched(id);
      // Optimistic update
      setWatchlist(watchlist.filter(item => item.id !== id));
      await watchlistAPI.markWatched(id, rating);
    } catch (err) {
      console.error('Failed to mark as watched:', err);
      // Rollback on error
      setWatchlist(previousWatchlist);
      setError('Failed to mark as watched. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setMarkingWatched(null);
    }
  };

  // Modal handlers
  const handleModalRate = async (rating: Rating) => {
    if (!selectedItem) return;
    await handleMarkWatched(selectedItem.id, rating);
    setSelectedItem(null);
  };

  const handleModalRemove = async () => {
    if (!selectedItem) return;
    await handleRemove(selectedItem.id);
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-xl">Loading watchlist...</div>
      </div>
    );
  }

  if (error && watchlist.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadWatchlist}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 mb-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Watchlist</h1>
        <div className="text-slate-400 text-sm sm:text-base">
          {watchlist.length} {watchlist.length === 1 ? 'movie' : 'movies'}
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">Your watchlist is empty</h2>
          <p className="text-slate-400 mb-4">Add movies you want to watch later!</p>
          <Link
            to="/discovery"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Discover Movies
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {watchlist.map((item) => {
            const { movie } = item;
            const posterUrl = movie.posterPath
              ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
              : '/placeholder-movie.png';
            const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

            return (
              <div key={item.id} className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex">
                  <div
                    className="w-24 sm:w-32 flex-shrink-0 bg-slate-700 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <img
                      src={posterUrl}
                      alt={`Movie poster for ${movie.title}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23334155" width="200" height="300"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{movie.title}</h3>
                        <p className="text-slate-400 text-sm">{year}</p>
                      </div>
                      {item.priority && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.priority === 'HIGH' ? 'bg-red-600/20 text-red-400 border border-red-600/50' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50' :
                          'bg-gray-600/20 text-gray-400 border border-gray-600/50'
                        }`}>
                          {item.priority}
                        </span>
                      )}
                    </div>

                    {movie.overview && (
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">{movie.overview}</p>
                    )}

                    {movie.genres && Array.isArray(movie.genres) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(movie.genres as Genre[]).map((genre) => (
                          <span key={genre.id} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                      <p className="text-slate-400 text-sm">Mark as watched:</p>
                      <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
                        <button
                          onClick={() => handleMarkWatched(item.id, 'DISLIKE')}
                          disabled={markingWatched === item.id}
                          aria-label={`Mark ${movie.title} as watched with Dislike rating`}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:py-1 rounded text-sm transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span aria-hidden="true">👎</span>
                        </button>
                        <button
                          onClick={() => handleMarkWatched(item.id, 'OK')}
                          disabled={markingWatched === item.id}
                          aria-label={`Mark ${movie.title} as watched with OK rating`}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 sm:py-1 rounded text-sm transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span aria-hidden="true">😐</span>
                        </button>
                        <button
                          onClick={() => handleMarkWatched(item.id, 'LIKE')}
                          disabled={markingWatched === item.id}
                          aria-label={`Mark ${movie.title} as watched with Like rating`}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:py-1 rounded text-sm transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span aria-hidden="true">👍</span>
                        </button>
                        <button
                          onClick={() => handleMarkWatched(item.id, 'SUPER_LIKE')}
                          disabled={markingWatched === item.id}
                          aria-label={`Mark ${movie.title} as watched with Love rating`}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:py-1 rounded text-sm transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                          <span aria-hidden="true">❤️</span>
                        </button>
                      </div>
                      <div className="hidden sm:block flex-1"></div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={markingWatched === item.id}
                        aria-label={`Remove ${movie.title} from watchlist`}
                        className="w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 sm:py-1 rounded text-sm transition-colors border border-red-600/50 disabled:opacity-50 min-h-[44px] sm:min-h-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movie Detail Modal */}
      {selectedItem && (
        <MovieDetailModal
          movie={selectedItem.movie}
          tmdbId={selectedItem.movie.tmdbId}
          isInWatchlist={true}
          onClose={() => setSelectedItem(null)}
          onRate={handleModalRate}
          onRemoveFromWatchlist={handleModalRemove}
          isProcessing={markingWatched === selectedItem.id}
        />
      )}
    </div>
  );
};

export default Watchlist;
