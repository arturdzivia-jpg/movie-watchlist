import React from 'react';
import { UserMovie, Rating } from '../../services/api';
import { MetadataLink } from '../Common';

interface Genre {
  id: number;
  name: string;
}

interface UserMovieCardProps {
  userMovie: UserMovie;
  onUpdateRating?: (id: string, rating: Rating) => void;
  onDelete?: (id: string) => void;
}

const UserMovieCard: React.FC<UserMovieCardProps> = ({ userMovie, onUpdateRating, onDelete }) => {
  const { movie, rating } = userMovie;

  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : '/placeholder-movie.png';

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

  const ratingConfig: Record<Rating, { emoji: string; label: string; color: string }> = {
    NOT_INTERESTED: { emoji: '🚫', label: 'Not Interested', color: 'bg-slate-600' },
    DISLIKE: { emoji: '👎', label: 'Dislike', color: 'bg-gray-600' },
    OK: { emoji: '😐', label: 'OK', color: 'bg-yellow-600' },
    LIKE: { emoji: '👍', label: 'Like', color: 'bg-green-600' },
    SUPER_LIKE: { emoji: '❤️', label: 'Love', color: 'bg-red-600' }
  };

  const currentRating = ratingConfig[rating];

  // Only show watched ratings in the dropdown (NOT_INTERESTED is for swipe-left only)
  const allRatings: Rating[] = ['DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700">
      <div className="flex">
        <div className="w-24 sm:w-32 flex-shrink-0 bg-slate-700">
          <img
            src={posterUrl}
            alt={`Movie poster for ${movie.title}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23334155" width="200" height="300"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>

        <div className="flex-1 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-base sm:text-lg truncate">{movie.title}</h3>
              <p className="text-slate-400 text-sm">{year}</p>
            </div>
            <div className={`${currentRating.color} text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center space-x-1 self-start flex-shrink-0`}>
              <span aria-hidden="true">{currentRating.emoji}</span>
              <span>{currentRating.label}</span>
            </div>
          </div>

          {movie.overview && (
            <p className="text-slate-300 text-sm mb-3 line-clamp-2">{movie.overview}</p>
          )}

          {movie.genres && Array.isArray(movie.genres) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(movie.genres as Genre[]).map((genre) => (
                <MetadataLink
                  key={genre.id}
                  type="genre"
                  id={genre.id}
                  name={genre.name}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded text-xs"
                />
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor={`rating-${userMovie.id}`} className="sr-only">
              Change rating for {movie.title}
            </label>
            <select
              id={`rating-${userMovie.id}`}
              value={rating}
              onChange={(e) => onUpdateRating?.(userMovie.id, e.target.value as Rating)}
              aria-label={`Change rating for ${movie.title}`}
              className="w-full sm:w-auto bg-slate-700 text-white px-3 py-2 sm:py-1 rounded text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
            >
              {allRatings.map((r) => (
                <option key={r} value={r}>
                  {ratingConfig[r].emoji} {ratingConfig[r].label}
                </option>
              ))}
            </select>

            {onDelete && (
              <button
                onClick={() => onDelete(userMovie.id)}
                aria-label={`Remove ${movie.title} from your list`}
                className="w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 sm:py-1 rounded text-sm transition-colors border border-red-600/50 min-h-[44px] sm:min-h-0"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMovieCard;
