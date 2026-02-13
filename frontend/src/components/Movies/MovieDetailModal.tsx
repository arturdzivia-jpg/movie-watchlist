import React, { useState, useEffect, useCallback } from 'react';
import { TMDBMovie, Movie, Rating, moviesAPI } from '../../services/api';

interface MovieDetailModalProps {
  movie: TMDBMovie | Movie;
  tmdbId?: number;
  userRating?: Rating | null;
  isInWatchlist?: boolean;
  onClose: () => void;
  onRate?: (rating: Rating) => void;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  onUpdateRating?: (rating: Rating) => void;
  onDelete?: () => void;
  isProcessing?: boolean;
}

// Helper functions to normalize TMDBMovie vs Movie data
const isTMDBMovie = (movie: TMDBMovie | Movie): movie is TMDBMovie => {
  return 'poster_path' in movie;
};

const getYear = (movie: TMDBMovie | Movie): string => {
  const date = isTMDBMovie(movie) ? movie.release_date : movie.releaseDate;
  return date ? new Date(date).getFullYear().toString() : 'N/A';
};

const getPosterUrl = (movie: TMDBMovie | Movie): string => {
  const path = isTMDBMovie(movie) ? movie.poster_path : movie.posterPath;
  return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
};

const getOverview = (movie: TMDBMovie | Movie): string => {
  return movie.overview || 'No overview available.';
};

const getVoteAverage = (movie: TMDBMovie | Movie): number => {
  return isTMDBMovie(movie) ? movie.vote_average : 0;
};

const getTmdbId = (movie: TMDBMovie | Movie): number => {
  return isTMDBMovie(movie) ? movie.id : movie.tmdbId;
};

const ratingButtons: { rating: Rating; emoji: string; label: string; color: string }[] = [
  { rating: 'DISLIKE', emoji: '', label: 'Dislike', color: 'bg-gray-600 hover:bg-gray-700' },
  { rating: 'OK', emoji: '', label: 'OK', color: 'bg-yellow-600 hover:bg-yellow-700' },
  { rating: 'LIKE', emoji: '', label: 'Like', color: 'bg-green-600 hover:bg-green-700' },
  { rating: 'SUPER_LIKE', emoji: '', label: 'Love', color: 'bg-red-600 hover:bg-red-700' }
];

const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  tmdbId,
  userRating,
  isInWatchlist,
  onClose,
  onRate,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onUpdateRating,
  onDelete,
  isProcessing = false
}) => {
  const [fullDetails, setFullDetails] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if we already have full details
  const hasFullDetails = !isTMDBMovie(movie) && movie.director !== undefined;

  // Fetch full details if needed
  useEffect(() => {
    const fetchDetails = async () => {
      const id = tmdbId || getTmdbId(movie);
      if (id && !hasFullDetails) {
        setIsLoading(true);
        try {
          const response = await moviesAPI.getDetails(id);
          setFullDetails(response.data);
        } catch (error) {
          console.error('Failed to fetch movie details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDetails();
  }, [movie, tmdbId, hasFullDetails]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  // Use full details if available, otherwise fall back to passed movie
  const displayMovie = fullDetails || movie;
  const title = displayMovie.title;
  const year = getYear(displayMovie);
  const posterUrl = getPosterUrl(displayMovie);
  const overview = getOverview(displayMovie);
  const voteAverage = fullDetails ? 0 : getVoteAverage(displayMovie);

  // Full details fields
  const runtime = fullDetails?.runtime || (!isTMDBMovie(movie) ? movie.runtime : null);
  const director = fullDetails?.director || (!isTMDBMovie(movie) ? movie.director : null);
  const cast = fullDetails?.cast || (!isTMDBMovie(movie) ? movie.cast : null);
  const genres = fullDetails?.genres || (!isTMDBMovie(movie) ? movie.genres : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Poster and basic info */}
          <div className="flex flex-col md:flex-row">
            {/* Poster */}
            <div className="w-full md:w-1/3 flex-shrink-0 bg-slate-700">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={`${title} poster`}
                  className="w-full aspect-[2/3] object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center text-slate-400">
                  No Image
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6 flex-1">
              <h2 id="modal-title" className="text-2xl font-bold text-white mb-2">{title}</h2>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-slate-400 mb-4">
                <span>{year}</span>
                {runtime && <span>{runtime} min</span>}
                {voteAverage > 0 && (
                  <span className="text-yellow-400 flex items-center gap-1">
                    <span>*</span> {voteAverage.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Genres */}
              {genres && genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map(g => (
                    <span
                      key={g.id}
                      className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Director */}
              {director && (
                <p className="text-slate-400 mb-2">
                  <span className="text-slate-300 font-medium">Director:</span> {director}
                </p>
              )}

              {/* Cast */}
              {cast && cast.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-300 font-medium mb-1">Cast:</p>
                  <p className="text-slate-400 text-sm">
                    {cast.slice(0, 5).map(c => c.name).join(', ')}
                  </p>
                </div>
              )}

              {/* Loading indicator for details */}
              {isLoading && (
                <p className="text-slate-500 text-sm">Loading details...</p>
              )}
            </div>
          </div>

          {/* Overview */}
          <div className="px-6 pb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
            <p className="text-slate-300 leading-relaxed">{overview}</p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 border-t border-slate-700 pt-4">
            {/* User has already rated this movie */}
            {userRating && userRating !== 'NOT_INTERESTED' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Your rating:</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={userRating}
                      onChange={(e) => onUpdateRating?.(e.target.value as Rating)}
                      disabled={isProcessing}
                      className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ratingButtons.map(btn => (
                        <option key={btn.rating} value={btn.rating}>
                          {btn.emoji} {btn.label}
                        </option>
                      ))}
                    </select>
                    {onDelete && (
                      <button
                        onClick={onDelete}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : isInWatchlist ? (
              /* In watchlist - show rating buttons to mark as watched */
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">In your watchlist - rate to mark as watched:</p>
                <div className="grid grid-cols-4 gap-2">
                  {ratingButtons.map(btn => (
                    <button
                      key={btn.rating}
                      onClick={() => onRate?.(btn.rating)}
                      disabled={isProcessing}
                      className={`${btn.color} text-white px-3 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-1`}
                    >
                      <span className="text-lg">{btn.emoji}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
                {onRemoveFromWatchlist && (
                  <button
                    onClick={onRemoveFromWatchlist}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Remove from Watchlist
                  </button>
                )}
              </div>
            ) : (
              /* Not rated, not in watchlist - show all options */
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">Rate this movie:</p>
                <div className="grid grid-cols-4 gap-2">
                  {ratingButtons.map(btn => (
                    <button
                      key={btn.rating}
                      onClick={() => onRate?.(btn.rating)}
                      disabled={isProcessing}
                      className={`${btn.color} text-white px-3 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-1`}
                    >
                      <span className="text-lg">{btn.emoji}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
                {onAddToWatchlist && (
                  <button
                    onClick={onAddToWatchlist}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    + Add to Watchlist
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white">Processing...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetailModal;
