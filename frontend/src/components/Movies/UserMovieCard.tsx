import React from 'react';
import { UserMovie, Rating } from '../../services/api';

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
    DISLIKE: { emoji: '👎', label: 'Dislike', color: 'bg-gray-600' },
    OK: { emoji: '😐', label: 'OK', color: 'bg-yellow-600' },
    LIKE: { emoji: '👍', label: 'Like', color: 'bg-green-600' },
    SUPER_LIKE: { emoji: '❤️', label: 'Love', color: 'bg-red-600' }
  };

  const currentRating = ratingConfig[rating];

  const allRatings: Rating[] = ['DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700">
      <div className="flex">
        <div className="w-32 flex-shrink-0 bg-slate-700">
          <img
            src={posterUrl}
            alt={movie.title}
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
            <div className={`${currentRating.color} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1`}>
              <span>{currentRating.emoji}</span>
              <span>{currentRating.label}</span>
            </div>
          </div>

          {movie.overview && (
            <p className="text-slate-300 text-sm mb-3 line-clamp-2">{movie.overview}</p>
          )}

          {movie.genres && Array.isArray(movie.genres) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {movie.genres.map((genre: any) => (
                <span key={genre.id} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <select
              value={rating}
              onChange={(e) => onUpdateRating?.(userMovie.id, e.target.value as Rating)}
              className="bg-slate-700 text-white px-3 py-1 rounded text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded text-sm transition-colors border border-red-600/50"
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
