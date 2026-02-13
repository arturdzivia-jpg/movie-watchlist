import React, { useState } from 'react';
import { DiscoverMovie } from '../../services/api';
import CardDetails from './CardDetails';

interface SwipeCardProps {
  movie: DiscoverMovie;
  onTap?: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ movie, onTap }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  const handleTap = () => {
    setIsFlipped(!isFlipped);
    onTap?.();
  };

  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none"
      style={{ perspective: '1000px' }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
        onClick={handleTap}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 backface-hidden bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Full-height Poster */}
          <img
            src={imageError ? fallbackImage : (posterUrl || fallbackImage)}
            alt={`Poster for ${movie.title}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
            draggable={false}
          />

          {/* Rating badge */}
          <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 z-10">
            <span className="text-yellow-400">&#9733;</span>
            {movie.vote_average.toFixed(1)}
          </div>

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/95 via-black/70 to-transparent" />

          {/* Content over gradient */}
          <div className="absolute inset-x-0 bottom-0 p-4 z-10">
            <h2 className="text-white font-bold text-xl mb-1 line-clamp-2 drop-shadow-lg">
              {movie.title}
            </h2>
            <p className="text-slate-300 text-sm mb-2 drop-shadow">{year}</p>

            {/* Recommendation reason */}
            {movie.reasons && movie.reasons.length > 0 && (
              <div className="bg-blue-900/50 border border-blue-700/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                <p className="text-blue-300 text-xs line-clamp-2">
                  <span aria-hidden="true">&#128161; </span>
                  {movie.reasons[0]}
                </p>
              </div>
            )}

            {/* Tap hint */}
            <p className="text-slate-400 text-xs text-center mt-2 drop-shadow">
              Tap for more details
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 backface-hidden bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <CardDetails movie={movie} onClose={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
};

export default SwipeCard;
