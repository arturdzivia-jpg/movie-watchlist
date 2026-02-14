import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { watchlistAPI, WatchlistItem, Rating, WatchlistSortOption, SortOrder } from '../services/api';
import MovieDetailModal from '../components/Movies/MovieDetailModal';
import { WatchlistItemSkeleton } from '../components/Common';
import { GENRES } from '../constants/genres';

interface Genre {
  id: number;
  name: string;
}

const Watchlist: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [allGenreIds, setAllGenreIds] = useState<Set<number>>(new Set()); // Store all genres from unfiltered list
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingWatched, setMarkingWatched] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<WatchlistSortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterGenre, setFilterGenre] = useState<number | null>(null);

  // Notes editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Get unique genres from stored genre IDs (not from filtered watchlist)
  const availableGenres = useMemo(() => {
    return GENRES.filter((g: Genre) => allGenreIds.has(g.id));
  }, [allGenreIds]);

  const loadWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await watchlistAPI.getAll({
        sort: sortBy,
        order: sortOrder,
        genre: filterGenre
      });
      setWatchlist(response.data);

      // When loading without a genre filter, update the available genres
      if (!filterGenre) {
        const genreSet = new Set<number>();
        response.data.forEach((item: WatchlistItem) => {
          if (item.movie.genres && Array.isArray(item.movie.genres)) {
            (item.movie.genres as Genre[]).forEach((g: Genre) => genreSet.add(g.id));
          }
        });
        setAllGenreIds(genreSet);
      }
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      setError('Failed to load watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, sortOrder, filterGenre]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  // Helper to recalculate available genres from a watchlist
  const recalculateGenres = useCallback((items: WatchlistItem[]) => {
    const genreSet = new Set<number>();
    items.forEach((item: WatchlistItem) => {
      if (item.movie.genres && Array.isArray(item.movie.genres)) {
        (item.movie.genres as Genre[]).forEach((g: Genre) => genreSet.add(g.id));
      }
    });
    setAllGenreIds(genreSet);
  }, []);

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this movie from your watchlist?')) {
      return;
    }

    const previousWatchlist = watchlist;
    const newWatchlist = watchlist.filter(item => item.id !== id);
    // Optimistic update
    setWatchlist(newWatchlist);
    // Update available genres if not filtered
    if (!filterGenre) {
      recalculateGenres(newWatchlist);
    }
    try {
      await watchlistAPI.remove(id);
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
      // Rollback on error
      setWatchlist(previousWatchlist);
      if (!filterGenre) {
        recalculateGenres(previousWatchlist);
      }
      setError('Failed to remove from watchlist. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMarkWatched = async (id: string, rating: Rating) => {
    const previousWatchlist = watchlist;
    const newWatchlist = watchlist.filter(item => item.id !== id);
    try {
      setMarkingWatched(id);
      // Optimistic update
      setWatchlist(newWatchlist);
      // Update available genres if not filtered
      if (!filterGenre) {
        recalculateGenres(newWatchlist);
      }
      await watchlistAPI.markWatched(id, rating);
    } catch (err) {
      console.error('Failed to mark as watched:', err);
      // Rollback on error
      setWatchlist(previousWatchlist);
      if (!filterGenre) {
        recalculateGenres(previousWatchlist);
      }
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

  // Notes handlers
  const handleStartEditNotes = (item: WatchlistItem) => {
    setEditingNotesId(item.id);
    setNotesInput(item.notes || '');
  };

  const handleCancelEditNotes = () => {
    setEditingNotesId(null);
    setNotesInput('');
  };

  const handleSaveNotes = async (id: string) => {
    try {
      setSavingNotes(true);
      const response = await watchlistAPI.update(id, { notes: notesInput || null });
      // Update local state
      setWatchlist(prev => prev.map(item =>
        item.id === id ? { ...item, notes: response.data.notes } : item
      ));
      setEditingNotesId(null);
      setNotesInput('');
    } catch (err) {
      console.error('Failed to save notes:', err);
      setError('Failed to save notes. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Watchlist</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <WatchlistItemSkeleton key={i} />
          ))}
        </div>
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

      {watchlist.length === 0 && !filterGenre ? (
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
        <>
          {/* Sorting and Filtering Controls */}
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <label className="text-slate-300 text-sm font-medium whitespace-nowrap">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as WatchlistSortOption)}
                  className="flex-1 sm:flex-none sm:w-36 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  <option value="date">Date Added</option>
                  <option value="priority">Priority</option>
                  <option value="title">Title</option>
                  <option value="release">Release Date</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>

              {availableGenres.length > 0 && (
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <label className="text-slate-300 text-sm font-medium whitespace-nowrap">Genre:</label>
                  <select
                    value={filterGenre ?? ''}
                    onChange={(e) => setFilterGenre(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="flex-1 sm:flex-none sm:w-40 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="">All Genres</option>
                    {availableGenres.map((genre: Genre) => (
                      <option key={genre.id} value={genre.id}>{genre.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterGenre && (
                <button
                  onClick={() => setFilterGenre(null)}
                  className="text-slate-400 hover:text-white text-sm underline self-center"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
              <p className="text-slate-400">No movies match the current filter</p>
              <button
                onClick={() => setFilterGenre(null)}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Clear genre filter
              </button>
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

                    {/* Notes Section */}
                    <div className="mb-3">
                      {editingNotesId === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                            placeholder="Why do you want to watch this movie?"
                            className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            maxLength={500}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveNotes(item.id)}
                              disabled={savingNotes}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                            >
                              {savingNotes ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEditNotes}
                              disabled={savingNotes}
                              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          {item.notes ? (
                            <p className="text-slate-400 text-sm italic flex-1">
                              <span className="text-slate-500">Note:</span> {item.notes}
                            </p>
                          ) : null}
                          <button
                            onClick={() => handleStartEditNotes(item)}
                            className="text-slate-500 hover:text-slate-300 text-xs underline flex-shrink-0"
                          >
                            {item.notes ? 'Edit note' : 'Add note'}
                          </button>
                        </div>
                      )}
                    </div>

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
        </>
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
