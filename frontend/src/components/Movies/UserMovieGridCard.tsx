import React from 'react';
import { UserMovie, Rating } from '../../services/api';

interface UserMovieGridCardProps {
  userMovie: UserMovie;
  onClick?: () => void;
}

const ratingConfig: Record<Rating, { emoji: string; label: string; bgColor: string }> = {
  NOT_INTERESTED: { emoji: '', label: 'Not Interested', bgColor: 'bg-slate-600' },
  DISLIKE: { emoji: '', label: 'Dislike', bgColor: 'bg-gray-600' },
  OK: { emoji: '', label: 'OK', bgColor: 'bg-yellow-600' },
  LIKE: { emoji: '', label: 'Like', bgColor: 'bg-green-600' },
  SUPER_LIKE: { emoji: '', label: 'Love', bgColor: 'bg-red-600' }
};

const UserMovieGridCard: React.FC<UserMovieGridCardProps> = ({ userMovie, onClick }) => {
  const { movie, rating } = userMovie;

  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : '';

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : 'N/A';

  const config = ratingConfig[rating];

  return (
    <div
      className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`View details for ${movie.title}`}
    >
      {/* Poster with rating badge */}
      <div className="relative aspect-[2/3] bg-slate-700">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${movie.title} poster`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No Image
          </div>
        )}

        {/* Rating badge */}
        <div
          className={`absolute top-2 right-2 ${config.bgColor} text-white px-2 py-1 rounded-full text-sm font-medium shadow-lg`}
          title={config.label}
        >
          {config.emoji}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Title and year */}
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        <p className="text-slate-400 text-xs mt-1">{year}</p>
      </div>
    </div>
  );
};

export default UserMovieGridCard;
