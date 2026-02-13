import React from 'react';
import { Rating } from '../../services/api';

interface SwipeControlsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onRate: (rating: Rating) => void;
  onUndo: () => void;
  canUndo: boolean;
  isProcessing: boolean;
}

const SwipeControls: React.FC<SwipeControlsProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onRate,
  onUndo,
  canUndo,
  isProcessing,
}) => {
  const buttonBase = 'flex items-center justify-center rounded-full transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-700 hover:bg-slate-600 text-yellow-400 border border-slate-600`}
        aria-label="Undo last swipe"
        title="Undo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </button>

      {/* Dislike */}
      <button
        onClick={onSwipeLeft}
        disabled={isProcessing}
        className={`${buttonBase} w-14 h-14 bg-slate-800 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500`}
        aria-label="Dislike movie"
        title="Dislike"
      >
        <span className="text-2xl" aria-hidden="true">&#128078;</span>
      </button>

      {/* OK */}
      <button
        onClick={() => onRate('OK')}
        disabled={isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-800 hover:bg-yellow-600 text-yellow-500 hover:text-white border-2 border-yellow-500`}
        aria-label="Rate movie as OK"
        title="OK"
      >
        <span className="text-xl" aria-hidden="true">&#128528;</span>
      </button>

      {/* Like */}
      <button
        onClick={onSwipeRight}
        disabled={isProcessing}
        className={`${buttonBase} w-14 h-14 bg-slate-800 hover:bg-green-600 text-green-500 hover:text-white border-2 border-green-500`}
        aria-label="Like movie"
        title="Like"
      >
        <span className="text-2xl" aria-hidden="true">&#128077;</span>
      </button>

      {/* Super Like */}
      <button
        onClick={() => onRate('SUPER_LIKE')}
        disabled={isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-800 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500`}
        aria-label="Super like movie"
        title="Super Like"
      >
        <span className="text-xl" aria-hidden="true">&#10084;&#65039;</span>
      </button>

      {/* Watchlist */}
      <button
        onClick={onSwipeUp}
        disabled={isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-700 hover:bg-blue-600 text-blue-400 hover:text-white border border-slate-600`}
        aria-label="Add to watchlist"
        title="Add to Watchlist"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>
    </div>
  );
};

export default SwipeControls;
