import React, { memo } from 'react';
import { UserMovie } from '../../services/api';
import { RATING_CONFIG } from '../../constants/ratings';

interface UserMovieGridCardProps {
  userMovie: UserMovie;
  onClick?: () => void;
}

const UserMovieGridCard: React.FC<UserMovieGridCardProps> = memo(({ userMovie, onClick }) => {
  const { movie, rating } = userMovie;

  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : '';

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : 'N/A';

  const config = RATING_CONFIG[rating];

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

        {/* Rating emoji */}
        <div
          className="absolute top-2 right-2 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          title={config.label}
          aria-label={config.label}
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
});

UserMovieGridCard.displayName = 'UserMovieGridCard';

export default UserMovieGridCard;
