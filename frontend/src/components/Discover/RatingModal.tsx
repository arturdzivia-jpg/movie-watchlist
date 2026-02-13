import React from 'react';
import { DiscoverMovie, Rating } from '../../services/api';

interface RatingModalProps {
  isOpen: boolean;
  movie: DiscoverMovie | null;
  onClose: () => void;
  onRate: (rating: Rating) => void;
  isProcessing: boolean;
}

const ratingOptions: { rating: Rating; emoji: string; label: string; color: string; hoverColor: string }[] = [
  { rating: 'DISLIKE', emoji: '👎', label: 'Dislike', color: 'bg-red-600', hoverColor: 'hover:bg-red-500' },
  { rating: 'OK', emoji: '😐', label: 'Okay', color: 'bg-yellow-600', hoverColor: 'hover:bg-yellow-500' },
  { rating: 'LIKE', emoji: '👍', label: 'Like', color: 'bg-green-600', hoverColor: 'hover:bg-green-500' },
  { rating: 'SUPER_LIKE', emoji: '❤️', label: 'Love', color: 'bg-pink-600', hoverColor: 'hover:bg-pink-500' },
];

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  movie,
  onClose,
  onRate,
  isProcessing,
}) => {
  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-slate-700 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-white text-xl font-bold mb-2 pr-8">
          Rate this movie
        </h2>
        <p className="text-slate-400 text-sm mb-6 line-clamp-1">
          {movie.title}
        </p>

        {/* Rating buttons */}
        <div className="grid grid-cols-2 gap-3">
          {ratingOptions.map(({ rating, emoji, label, color, hoverColor }) => (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={isProcessing}
              className={`${color} ${hoverColor} text-white py-4 px-4 rounded-xl font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2`}
            >
              <span className="text-2xl" aria-hidden="true">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default RatingModal;
