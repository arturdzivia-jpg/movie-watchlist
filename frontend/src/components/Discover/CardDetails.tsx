import React from 'react';
import { Recommendation } from '../../services/api';

interface CardDetailsProps {
  movie: Recommendation;
  onClose: () => void;
}

const CardDetails: React.FC<CardDetailsProps> = ({ movie, onClose }) => {
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-4">
          <h2 className="text-white font-bold text-xl mb-1">{movie.title}</h2>
          <p className="text-slate-400 text-sm">{year}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Close details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-yellow-400 text-lg">&#9733;</span>
        <span className="text-white font-semibold">
          {movie.vote_average.toFixed(1)}/10
        </span>
        <span className="text-slate-400 text-sm">
          ({movie.vote_count.toLocaleString()} votes)
        </span>
      </div>

      {/* Overview */}
      <div className="mb-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-2">Overview</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          {movie.overview || 'No overview available.'}
        </p>
      </div>

      {/* Recommendation reasons */}
      {movie.reasons && movie.reasons.length > 0 && (
        <div className="mt-auto">
          <h3 className="text-slate-300 font-semibold text-sm mb-2">
            Why we recommend this
          </h3>
          <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-3 space-y-1">
            {movie.reasons.map((reason, index) => (
              <p key={index} className="text-blue-300 text-xs flex items-start gap-2">
                <span aria-hidden="true" className="shrink-0">&#128161;</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tap hint */}
      <p className="text-slate-500 text-xs text-center mt-4">
        Tap to flip back
      </p>
    </div>
  );
};

export default CardDetails;
