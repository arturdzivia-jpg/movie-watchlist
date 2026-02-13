import React from 'react';
import { TMDBMovie, Rating } from '../../services/api';

interface MovieCardProps {
  movie: TMDBMovie;
  onRate?: (tmdbId: number, rating: Rating) => void;
  onAddToWatchlist?: (tmdbId: number) => void;
  showActions?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onRate, onAddToWatchlist, showActions = true }) => {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-movie.png';

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

  const ratingButtons: { rating: Rating; emoji: string; label: string; color: string }[] = [
    { rating: 'DISLIKE', emoji: '👎', label: 'Dislike', color: 'bg-gray-600 hover:bg-gray-700' },
    { rating: 'OK', emoji: '😐', label: 'OK', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { rating: 'LIKE', emoji: '👍', label: 'Like', color: 'bg-green-600 hover:bg-green-700' },
    { rating: 'SUPER_LIKE', emoji: '❤️', label: 'Love', color: 'bg-red-600 hover:bg-red-700' }
  ];

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700 hover:border-slate-600 transition-all">
      <div className="relative aspect-[2/3] bg-slate-700">
        <img
          src={posterUrl}
          alt={`Movie poster for ${movie.title}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-semibold">
          ⭐ {movie.vote_average.toFixed(1)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">{movie.title}</h3>
        <p className="text-slate-400 text-sm mb-3">{year}</p>

        {movie.overview && (
          <p className="text-slate-300 text-sm mb-4 line-clamp-3">{movie.overview}</p>
        )}

        {showActions && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {ratingButtons.map((btn) => (
                <button
                  key={btn.rating}
                  onClick={() => onRate?.(movie.id, btn.rating)}
                  aria-label={`Rate ${movie.title} as ${btn.label}`}
                  className={`${btn.color} text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-1`}
                >
                  <span aria-hidden="true">{btn.emoji}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {onAddToWatchlist && (
              <button
                onClick={() => onAddToWatchlist(movie.id)}
                aria-label={`Add ${movie.title} to watchlist`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                + Add to Watchlist
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
